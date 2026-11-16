// Junção de alterações concorrentes no MESMO registro (alterações em registros diferentes nunca se misturam,
// porque cada registro é um documento separado).
//
// Regra geral (merge de três vias, campo a campo):
//   - campo igual nos dois lados: mantém;
//   - só um lado mudou em relação à base (última versão sincronizada): vale a mudança;
//   - os dois mudaram: depende do tipo do campo (POLICY abaixo);
//   - sem base (registro criado nos dois aparelhos com o mesmo id): trata como "os dois mudaram".
// Exclusão sempre vence (um aparelho com dados antigos não ressuscita um item apagado). Se o outro lado tinha
// texto novo, esse texto é guardado como "versão" recuperável.

import { deepEqual, hash, clone } from '../core/util.js';

export const POLICY = {
  profile: { map: ['prefs', 'ai'] },
  plan: { text: ['notes'], map: ['availability'] },
  subject: {},
  activity: { text: ['note', 'summary'], set: ['videoIds', 'reviews'], rank: { status: ['todo', 'doing', 'done'] }, map: ['custom'] },
  video: {},
  playlist: {},
  videoProgress: { flag: ['watched'] },
  note: { text: ['text'] },
  question: {},
  quizSet: {},
  attempt: {},
  errorEntry: { text: ['rule', 'note'], set: ['reviews'] },
  simulation: { text: ['notes'] },
  doubt: {},
  session: {},
  version: {},
};

function policyFor(kind) { return POLICY[kind] || {}; }

function mergeSet(b, l, r) {
  l = Array.isArray(l) ? l : []; r = Array.isArray(r) ? r : [];
  if (!Array.isArray(b)) { const out = l.slice(); for (const x of r) if (!out.some(y => deepEqual(x, y))) out.push(x); return out; }
  const has = (arr, x) => arr.some(y => deepEqual(x, y));
  const removed = b.filter(x => !has(l, x) || !has(r, x));
  const out = [];
  for (const x of l.concat(r)) if (!has(out, x) && !has(removed, x)) out.push(x);
  return out;
}

/**
 * @param {string} kind
 * @param {object|null} base   dados da última versão sincronizada (null se desconhecida)
 * @param {{data:object, deleted:boolean, updatedAt:number}} local
 * @param {{data:object, deleted:boolean, updatedAt:number}} remote
 * @returns {{data:object, deleted:boolean, versions:Array<{field:string,text:string,side:string}>}}
 */
export function mergeRecord(kind, base, local, remote) {
  const P = policyFor(kind);
  const text = new Set(P.text || []), set = new Set(P.set || []), flag = new Set(P.flag || []), map = new Set(P.map || []);
  const rank = P.rank || {};
  const versions = [];
  const lNewer = (local.updatedAt || 0) >= (remote.updatedAt || 0);

  if (local.deleted || remote.deleted) {
    const keep = local.deleted ? local : remote, other = local.deleted ? remote : local;
    if (!other.deleted) {
      for (const f of text) {
        const t = other.data && other.data[f];
        const bt = base ? base[f] : undefined;
        if (typeof t === 'string' && t.trim() && t !== bt) versions.push({ field: f, text: t, side: other === local ? 'local' : 'remote' });
      }
    }
    return { data: clone(keep.data || {}), deleted: true, versions };
  }

  const b = base || null, L = local.data || {}, R = remote.data || {};
  const out = {};
  const keys = new Set([...Object.keys(L), ...Object.keys(R)]);
  for (const f of keys) {
    const lv = L[f], rv = R[f], bv = b ? b[f] : undefined;
    if (deepEqual(lv, rv)) { out[f] = clone(lv); continue; }
    if (b) {
      if (deepEqual(lv, bv)) { out[f] = clone(rv); continue; }
      if (deepEqual(rv, bv)) { out[f] = clone(lv); continue; }
    }
    // os dois lados mudaram (ou não há base)
    if (lv === undefined) { out[f] = clone(rv); continue; }
    if (rv === undefined) { out[f] = clone(lv); continue; }
    if (set.has(f)) { out[f] = mergeSet(b ? bv : undefined, lv, rv); continue; }
    if (map.has(f) && lv && rv && typeof lv === 'object' && typeof rv === 'object') {
      const sub = mergeRecord('__map', b && bv && typeof bv === 'object' ? bv : null, { data: lv, updatedAt: local.updatedAt }, { data: rv, updatedAt: remote.updatedAt });
      out[f] = sub.data; continue;
    }
    if (text.has(f) && typeof lv === 'string' && typeof rv === 'string') {
      // texto que só cresceu de um lado: fica a versão mais completa
      if (rv.startsWith(lv)) { out[f] = rv; continue; }
      if (lv.startsWith(rv)) { out[f] = lv; continue; }
      const main = lNewer ? lv : rv, other = lNewer ? rv : lv;
      out[f] = main;
      if (other.trim()) versions.push({ field: f, text: other, side: lNewer ? 'remote' : 'local' });
      continue;
    }
    if (flag.has(f) && !b) { out[f] = !!(lv || rv); continue; }
    if (rank[f] && !b) {
      const order = rank[f];
      out[f] = order.indexOf(lv) >= order.indexOf(rv) ? lv : rv; continue;
    }
    out[f] = clone(lNewer ? lv : rv);
  }
  return { data: out, deleted: false, versions };
}

/** Id determinístico da versão guardada: importar ou sincronizar de novo não cria cópias repetidas. */
export function versionId(targetId, field, text) { return 'ver_' + hash(targetId + '|' + field + '|' + text); }
