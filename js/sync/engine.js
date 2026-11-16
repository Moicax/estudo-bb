// Motor de sincronização: aparelho (Store/IndexedDB) <-> conta (Cloud Firestore).
//
// Caminho: users/{uid}/records/{id}  — um documento por registro.
// Envio: lotes de registros pendentes numa transação. Para cada um, lê a revisão no servidor:
//   - igual à base local  -> grava com rev+1 (caso comum);
//   - diferente           -> houve alteração em outro aparelho: junta campo a campo (merge.js) e grava rev+1;
//   - excluído no servidor -> continua excluído (exclusão vence); texto novo vira "versão" recuperável.
// As regras do Firestore exigem rev = anterior + 1, então duas gravações concorrentes nunca se sobrescrevem
// às cegas: a segunda falha e é refeita com a junção.
// Recebimento: escuta documentos com serverAt maior que o último recebido.
//
// O SDK do Firestore é injetado (fs = módulo firebase/firestore) para o mesmo código rodar no navegador
// e nos testes do Node.
import { mergeRecord } from '../data/merge.js';
import { publicRecord } from '../data/schema.js';
import { clone } from '../core/util.js';

const BATCH = 100;

export function createSyncEngine({ fs, db, uid, store, onStatus = () => {}, isOnline = () => true, log = () => {} }) {
  const col = fs.collection(db, 'users', uid, 'records');
  let unsub = null, pushing = false, again = false, timer = null, backoff = 0, stopped = false;
  let state = { phase: 'idle', error: null, lastSyncAt: store.getMeta('lastSyncAt') || null, initialPullDone: false };
  let firstPull = null; let resolveFirst = null;

  function emit(patch) {
    state = { ...state, ...patch };
    // sem internet, o estado é sempre "offline" (com ou sem alterações aguardando envio)
    if (!isOnline() && state.phase !== 'error') state.phase = 'offline';
    onStatus({ ...state, pending: store.dirtyCount(), online: isOnline() });
  }

  function lastPullTs() { const m = store.getMeta('lastPull'); return m ? new fs.Timestamp(m.s, m.ns) : null; }

  function listen() {
    if (unsub) unsub();
    const lp = lastPullTs();
    const q = lp ? fs.query(col, fs.where('serverAt', '>', lp), fs.orderBy('serverAt')) : fs.query(col, fs.orderBy('serverAt'));
    unsub = fs.onSnapshot(q, { includeMetadataChanges: false }, async (snap) => {
      const docs = []; let max = null;
      for (const ch of snap.docChanges()) {
        if (ch.type === 'removed') continue;
        if (ch.doc.metadata.hasPendingWrites) continue;
        const d = ch.doc.data();
        if (!d.serverAt) continue;
        docs.push(publicRecord(d));
        if (!max || d.serverAt.toMillis() > max.toMillis() || (d.serverAt.toMillis() === max.toMillis() && d.serverAt.nanoseconds > max.nanoseconds)) max = d.serverAt;
      }
      try {
        if (docs.length) await store.applyRemote(docs);
        if (max) await store.setMeta('lastPull', { s: max.seconds, ns: max.nanoseconds });
        if (!state.initialPullDone) { emit({ initialPullDone: true }); if (resolveFirst) resolveFirst(); }
        if (docs.length) log('recebidos', docs.length);
        if (store.dirtyCount()) schedule(0); else emit({ phase: 'synced', error: null, lastSyncAt: Date.now() });
      } catch (e) { emit({ phase: 'error', error: msg(e) }); }
    }, (err) => { emit({ phase: 'error', error: msg(err) }); log('erro ao escutar', err.code); retryListen(); });
  }
  let listenRetry = null;
  function retryListen() { clearTimeout(listenRetry); if (!stopped) listenRetry = setTimeout(listen, 15000); }

  function msg(e) {
    const c = e && e.code;
    if (c === 'permission-denied') return 'Sem permissão para acessar estes dados. Saia e entre de novo.';
    if (c === 'resource-exhausted') return 'O limite gratuito diário do Firebase foi atingido. A sincronização volta amanhã; seus dados continuam salvos neste aparelho.';
    if (c === 'unavailable' || c === 'deadline-exceeded') return 'Sem conexão com o servidor. Vou tentar de novo.';
    if (c === 'unauthenticated') return 'Sua sessão expirou. Entre de novo para sincronizar.';
    return (e && e.message) || 'Erro ao sincronizar.';
  }

  async function pushOnce() {
    const batch = store.dirty(BATCH);
    if (!batch.length) return 0;
    const snapshot = batch.map(r => ({ id: r.id, seq: r._l.seq, kind: r.kind, planId: r.planId, data: clone(r.data), deleted: !!r.deleted, base: r._l.base || 0, baseData: r._l.baseData ? clone(r._l.baseData) : null, updatedAt: r.updatedAt, updatedBy: r.updatedBy, schema: r.schema }));
    const results = await fs.runTransaction(db, async (tx) => {
      const refs = snapshot.map(r => fs.doc(col, r.id));
      const remotes = [];
      for (const ref of refs) remotes.push(await tx.get(ref));
      const out = [];
      snapshot.forEach((loc, i) => {
        const rs = remotes[i];
        let data = loc.data, deleted = loc.deleted, versions = [], rev;
        if (!rs.exists()) {
          rev = 1;
        } else {
          const rem = rs.data();
          if ((rem.rev || 0) === loc.base) {
            rev = loc.base + 1;
            if (rem.deleted && !loc.deleted) { deleted = true; data = rem.data; }
          } else {
            const m = mergeRecord(loc.kind, loc.base ? loc.baseData : null, { data: loc.data, deleted: loc.deleted, updatedAt: loc.updatedAt }, { data: rem.data || {}, deleted: !!rem.deleted, updatedAt: rem.updatedAt || 0 });
            data = m.data; deleted = m.deleted; versions = m.versions; rev = (rem.rev || 0) + 1;
          }
        }
        const docData = { id: loc.id, kind: loc.kind, planId: loc.planId || null, data, deleted, rev, updatedAt: loc.updatedAt, updatedBy: loc.updatedBy || '', schema: loc.schema || 1, serverAt: fs.serverTimestamp() };
        tx.set(refs[i], docData);
        out.push({ id: loc.id, seq: loc.seq, rev, data, deleted, updatedAt: loc.updatedAt, updatedBy: loc.updatedBy, versions });
      });
      return out;
    });
    const created = await store.markSynced(results);
    const conflicts = results.reduce((n, r) => n + r.versions.length, 0);
    if (conflicts) log('conflitos resolvidos com versão guardada', conflicts);
    return results.length + created.length;
  }

  async function pushAll() {
    if (pushing) { again = true; return; }
    if (stopped) return;
    if (!isOnline()) { emit({ phase: 'offline' }); return; }
    pushing = true; again = false;
    emit({ phase: 'syncing', error: null });
    try {
      let guard = 0;
      while (store.dirtyCount() && guard++ < 50 && !stopped) await pushOnce();
      backoff = 0;
      await store.setMeta('lastSyncAt', Date.now());
      emit({ phase: store.dirtyCount() ? 'syncing' : 'synced', error: null, lastSyncAt: Date.now() });
    } catch (e) {
      log('falha no envio', e && e.code, e && e.message);
      backoff = Math.min(backoff ? backoff * 2 : 4000, 120000);
      emit({ phase: !isOnline() || (e && (e.code === 'unavailable' || e.code === 'deadline-exceeded')) ? 'offline' : 'error', error: msg(e) });
      clearTimeout(timer); timer = setTimeout(pushAll, backoff);
    } finally {
      pushing = false;
      if (again && !stopped) schedule(0);
    }
  }

  function schedule(ms = 800) { if (stopped) return; clearTimeout(timer); timer = setTimeout(pushAll, ms); }

  const offStore = store.on((ev) => { if (ev.origin !== 'remote' && ev.origin !== 'sync') { emit({}); schedule(); } });

  return {
    start() {
      stopped = false;
      firstPull = new Promise(r => { resolveFirst = r; });
      emit({ phase: isOnline() ? 'syncing' : 'offline' });
      listen();
      schedule(300);
      return firstPull;
    },
    /** Espera o primeiro recebimento completo (para conciliar antes de migrar). */
    waitInitialPull(ms = 20000) { return Promise.race([firstPull, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]); },
    syncNow() { backoff = 0; return pushAll(); },
    online() { listen(); schedule(0); },
    offline() { emit({ phase: 'offline' }); },
    status() { const ph = !isOnline() && state.phase !== 'error' ? 'offline' : state.phase; return { ...state, phase: ph, pending: store.dirtyCount(), online: isOnline() }; },
    async flush(ms = 15000) {
      const t0 = Date.now();
      while (store.dirtyCount() && Date.now() - t0 < ms) { await pushAll(); if (store.dirtyCount()) await new Promise(r => setTimeout(r, 500)); }
      return store.dirtyCount() === 0;
    },
    stop() { stopped = true; clearTimeout(timer); clearTimeout(listenRetry); if (unsub) unsub(); unsub = null; offStore(); },
  };
}
