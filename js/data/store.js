// Armazenamento no aparelho (IndexedDB). É a fonte da verdade local: tudo é gravado aqui primeiro,
// funciona sem internet, e depois o motor de sincronização envia para a conta.
//
// Um banco por "escopo": 'local' (uso sem conta) ou o uid da conta. Assim, trocar de conta nunca mostra
// dados de outra pessoa, e sair da conta pode apagar só o banco daquela conta.
import { clone, deepEqual, rid } from '../core/util.js';
import { makeRecord, publicRecord, SCHEMA } from './schema.js';
import { mergeRecord, versionId } from './merge.js';

const DB_PREFIX = 'meu-estudo:';
const VERSION = 1;

function req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
function txDone(tx) { return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('abort')); }); }

export function dbName(scope) { return DB_PREFIX + scope; }

export async function deleteScope(scope) {
  await new Promise((res) => { const r = indexedDB.deleteDatabase(dbName(scope)); r.onsuccess = r.onerror = r.onblocked = () => res(); });
}

export async function listScopes() {
  if (!indexedDB.databases) return [];
  const all = await indexedDB.databases();
  return all.map(d => d.name).filter(n => n && n.startsWith(DB_PREFIX)).map(n => n.slice(DB_PREFIX.length));
}

export async function openStore(scope) {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open(dbName(scope), VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('records')) d.createObjectStore('records', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
      if (!d.objectStoreNames.contains('snapshots')) d.createObjectStore('snapshots', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('Outra aba está atualizando o banco. Feche as outras abas do sistema.'));
  });
  const s = new Store(scope, db);
  await s._load();
  return s;
}

export class Store {
  constructor(scope, db) {
    this.scope = scope; this.db = db; this.recs = new Map(); this.meta = new Map(); this.subs = new Set(); this.closed = false;
    this.channel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(db.name) : null;
    if (this.channel) this.channel.onmessage = ({ data }) => this._refresh(data).catch(e => { if (!this.closed) console.error(e); });
    db.onversionchange = () => this.close();
  }
  async _load() {
    const tx = this.db.transaction(['records', 'meta'], 'readonly');
    const recs = await req(tx.objectStore('records').getAll());
    for (const r of recs) this.recs.set(r.id, r);
    const ms = tx.objectStore('meta');
    const keys = await req(ms.getAllKeys()); const vals = await req(ms.getAll());
    keys.forEach((k, i) => this.meta.set(k, vals[i]));
    if (!this.meta.get('deviceId')) await this.setMeta('deviceId', rid('d'));
  }
  get deviceId() { return this.meta.get('deviceId'); }

  /* ---------- leitura (síncrona, da memória) ---------- */
  get(id) { const r = this.recs.get(id); return r && !r.deleted ? r : null; }
  getRaw(id) { return this.recs.get(id) || null; }
  list(kind, { planId, includeDeleted = false } = {}) {
    const out = [];
    for (const r of this.recs.values()) {
      if (r.kind !== kind) continue;
      if (!includeDeleted && r.deleted) continue;
      if (planId !== undefined && r.planId !== planId) continue;
      out.push(r);
    }
    return out;
  }
  count() { let n = 0; for (const r of this.recs.values()) if (!r.deleted) n++; return n; }
  dirty(limit = Infinity) { const out = []; for (const r of this.recs.values()) { if (r._l && r._l.dirty) { out.push(r); if (out.length >= limit) break; } } return out; }
  dirtyCount() { let n = 0; for (const r of this.recs.values()) if (r._l && r._l.dirty) n++; return n; }

  /* ---------- eventos ---------- */
  on(fn) { this.subs.add(fn); return () => this.subs.delete(fn); }
  _emit(ev) { for (const f of this.subs) { try { f(ev); } catch (e) { console.error(e); } } }

  /* ---------- escrita local ---------- */
  async _refresh(ids) {
    if (this.closed || !Array.isArray(ids) || !ids.length) return;
    const records = this.db.transaction('records').objectStore('records');
    const rows = await Promise.all(ids.map(id => req(records.get(id))));
    const changed = [];
    for (const r of rows) if (r && !deepEqual(r, this.recs.get(r.id))) {
      this.recs.set(r.id, r);
      changed.push(r.id);
    }
    if (changed.length) this._emit({ type: 'change', ids: changed, origin: 'other-tab' });
  }

  // A leitura e a gravação compartilham a transação, inclusive entre abas.
  // A memória e os observadores só recebem a mudança depois da confirmação.
  async _editRecords(origin, edit) {
    if (this.closed) throw new Error('Banco fechado');
    const tx = this.db.transaction('records', 'readwrite');
    const st = tx.objectStore('records'), writes = new Map(), reads = new Map();
    const get = async id => {
      if (writes.has(id)) return writes.get(id);
      if (!reads.has(id)) reads.set(id, await req(st.get(id)));
      return reads.get(id);
    };
    const save = r => { writes.set(r.id, r); return r; };
    const done = txDone(tx);
    const update = async () => {
      const result = await edit(get, save);
      for (const r of writes.values()) st.put(r);
      return result;
    };
    let result;
    try { [result] = await Promise.all([update(), done]); }
    catch (e) { try { tx.abort(); } catch { /* transação já encerrada */ } throw e; }
    for (const r of reads.values()) if (r) this.recs.set(r.id, r);
    for (const r of writes.values()) this.recs.set(r.id, r);
    if (writes.size) {
      const ids = [...writes.keys()];
      if (!this.closed) this.channel?.postMessage(ids);
      this._emit({ type: 'change', ids, origin });
    }
    return result;
  }
  _touch(r, prev) {
    const l = prev && prev._l ? prev._l : { dirty: false, base: prev ? prev.rev || 0 : 0, baseData: prev && prev.rev ? clone(prev.data) : null, seq: 0 };
    r._l = { ...l, dirty: true, seq: (l.seq || 0) + 1 };
    if (!l.dirty) { r._l.base = prev ? prev.rev || 0 : 0; r._l.baseData = prev && prev.rev ? clone(prev.data) : null; }
    r.updatedAt = Date.now(); r.updatedBy = this.deviceId; r.schema = SCHEMA;
    return r;
  }
  /** Cria ou substitui os dados de um registro. */
  async put(kind, id, planId, data, { origin = 'local' } = {}) {
    return this._editRecords(origin, async (get, save) => {
      const prev = await get(id);
      if (prev?.deleted) throw new Error('Este item foi excluído e não pode ser recriado com o mesmo id.');
      const r = prev ? publicRecord(prev) : makeRecord(kind, id, planId, {});
      return save(this._touch({ ...r, kind, planId: planId || null, data: clone(data), deleted: false }, prev));
    });
  }
  async patch(id, partial, { origin = 'local' } = {}) {
    return this._editRecords(origin, async (get, save) => {
      const prev = await get(id);
      if (!prev || prev.deleted) return null;
      const changes = typeof partial === 'function' ? partial(prev.data) : partial;
      const data = { ...prev.data, ...clone(changes) };
      if (deepEqual(data, prev.data)) return prev;
      return save(this._touch({ ...publicRecord(prev), data }, prev));
    });
  }
  async remove(id, { origin = 'local' } = {}) {
    await this._editRecords(origin, async (get, save) => {
      const prev = await get(id);
      if (prev && !prev.deleted) save(this._touch({ ...publicRecord(prev), deleted: true, data: { removedKind: prev.kind } }, prev));
    });
  }

  /**
   * Importa registros (migração, backup): insere os que não existem e concilia os que já existem,
   * sem perder edições mais novas. Idempotente: importar o mesmo conteúdo de novo não muda nada.
   */
  async importRecords(list, { origin = 'import' } = {}) {
    return this._editRecords(origin, async (get, save) => {
      let added = 0, merged = 0, unchanged = 0, versions = 0;
      for (const inc of list) {
        const prev = await get(inc.id);
        if (!prev) {
          const r = this._touch({ ...publicRecord(inc), rev: 0 }, null);
          r.updatedAt = inc.updatedAt || r.updatedAt;
          if (!inc.deleted) r.updatedBy = inc.updatedBy || r.updatedBy;
          save(r); added++; continue;
        }
        if (prev.deleted) { unchanged++; continue; }
        if (inc.deleted) {
          save(this._touch({ ...publicRecord(prev), deleted: true, data: { removedKind: prev.kind } }, prev));
          merged++; continue;
        }
        const m = mergeRecord(prev.kind, null, prev, inc);
        for (const v of m.versions.filter(v => v.side === 'remote')) {
          const vid = versionId(prev.id, v.field, v.text);
          if (await get(vid)) continue;
          save(this._touch(makeRecord('version', vid, prev.planId, { targetId: prev.id, targetKind: prev.kind, field: v.field, text: v.text, at: Date.now(), reason: 'importacao' }), null));
          versions++;
        }
        if (deepEqual(m.data, prev.data)) { unchanged++; continue; }
        save(this._touch({ ...publicRecord(prev), data: m.data }, prev));
        merged++;
      }
      return { added, merged, unchanged, versions };
    });
  }

  /* ---------- sincronização ---------- */
  /** Uma edição local pendente será conciliada durante o envio. */
  async applyRemote(docs) {
    await this._editRecords('remote', async (get, save) => {
      for (const d of docs) {
        const prev = await get(d.id);
        if (prev?._l?.dirty) {
          if ((d.rev || 0) > (prev._l.remoteRev || 0)) save({ ...prev, _l: { ...prev._l, remoteRev: d.rev } });
          continue;
        }
        if (prev && (prev.rev || 0) >= (d.rev || 0)) continue;
        save({ ...publicRecord(d), _l: { dirty: false, base: d.rev || 0, baseData: null, seq: prev?._l?.seq || 0 } });
      }
    });
  }
  /** Só limpa a edição pendente se ela ainda for a mesma que foi enviada. */
  async markSynced(results) {
    return this._editRecords('sync', async (get, save) => {
      const created = [];
      for (const x of results) {
        const cur = await get(x.id);
        if (!cur) continue;
        if ((cur.rev || 0) < x.rev) {
          if (cur._l && cur._l.seq !== x.seq) {
            cur.rev = x.rev;
            cur._l = { ...cur._l, base: x.rev, baseData: clone(x.data), dirty: true };
            if (x.deleted && !cur.deleted) { cur.deleted = true; cur.data = x.data; cur._l.dirty = false; }
          } else {
            cur.rev = x.rev; cur.data = clone(x.data); cur.deleted = !!x.deleted;
            cur.updatedAt = x.updatedAt; cur.updatedBy = x.updatedBy;
            cur._l = { dirty: false, base: x.rev, baseData: null, seq: cur._l?.seq || 0 };
          }
          save(cur);
        }
        for (const v of x.versions || []) {
          const vid = versionId(cur.id, v.field, v.text);
          if (await get(vid)) continue;
          save(this._touch(makeRecord('version', vid, cur.planId, { targetId: cur.id, targetKind: cur.kind, field: v.field, text: v.text, at: Date.now(), reason: 'conflito' }), null));
          created.push(vid);
        }
      }
      return created;
    });
  }

  /* ---------- metadados e cópias de segurança ---------- */
  getMeta(k) { return clone(this.meta.get(k)); }
  async setMeta(k, v) {
    this.meta.set(k, clone(v));
    const tx = this.db.transaction('meta', 'readwrite'); tx.objectStore('meta').put(clone(v), k); await txDone(tx);
  }
  async delMeta(k) { this.meta.delete(k); const tx = this.db.transaction('meta', 'readwrite'); tx.objectStore('meta').delete(k); await txDone(tx); }
  async addSnapshot(reason, payload) {
    const snap = { id: rid('snap_'), at: Date.now(), reason, payload };
    const tx = this.db.transaction('snapshots', 'readwrite'); tx.objectStore('snapshots').put(snap); await txDone(tx);
    return snap.id;
  }
  async listSnapshots() {
    const tx = this.db.transaction('snapshots', 'readonly');
    const all = await req(tx.objectStore('snapshots').getAll());
    return all.map(s => ({ id: s.id, at: s.at, reason: s.reason, size: JSON.stringify(s.payload).length })).sort((a, b) => b.at - a.at);
  }
  async getSnapshot(id) { const tx = this.db.transaction('snapshots', 'readonly'); return req(tx.objectStore('snapshots').get(id)); }
  async deleteSnapshot(id) { const tx = this.db.transaction('snapshots', 'readwrite'); tx.objectStore('snapshots').delete(id); await txDone(tx); }
  allPublic({ includeDeleted = true } = {}) {
    const out = [];
    for (const r of this.recs.values()) if (includeDeleted || !r.deleted) out.push(publicRecord(r));
    return out;
  }
  close() { this.channel?.close(); this.db.close(); this.closed = true; this.subs.clear(); }
}
