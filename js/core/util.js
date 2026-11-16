// Utilidades sem dependência de navegador (também rodam no Node, nos testes).

/* ---------- datas ----------
 * Datas do calendário de estudos são "datas civis": texto 'AAAA-MM-DD', sem hora e sem fuso.
 * Toda conta com elas é feita ao meio-dia UTC, então nunca mudam de dia por conversão de fuso.
 * Momentos (início de sessão, conclusão etc.) são milissegundos UTC (Date.now()).
 */
export const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const DIAS_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function isCivilDate(s) { return typeof s === 'string' && DATE_RE.test(s) && !isNaN(noonUTC(s)); }
function noonUTC(iso) { return Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), 12); }
/** Data civil de hoje no fuso do aparelho. */
export function today(now = new Date()) {
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}
/** Data civil local de um instante (ms). */
export function civilOf(ms) { return today(new Date(ms)); }
export function addDays(iso, n) { const d = new Date(noonUTC(iso)); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export function diffDays(a, b) { return Math.round((noonUTC(b) - noonUTC(a)) / 86400000); }
export function weekday(iso) { return new Date(noonUTC(iso)).getUTCDay(); }
export function fmtShort(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : ''; }
export function fmtLong(iso) { return DIAS_LONGOS[weekday(iso)] + ', ' + (+iso.slice(8, 10)) + ' de ' + MESES[+iso.slice(5, 7) - 1]; }
/** Segunda-feira da semana da data. */
export function mondayOf(iso) { const w = weekday(iso); return addDays(iso, w === 0 ? -6 : 1 - w); }

/* ---------- tempo ---------- */
export function fmtDur(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  if (h && m === 60) return (h + 1) + 'h';
  if (h) return h + 'h' + (m ? String(m).padStart(2, '0') : '');
  return m + ' min';
}
export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0');
}
export function parseDur(s) {
  if (!s) return 0;
  const p = String(s).split(':').map(Number);
  let t = 0; for (const x of p) t = t * 60 + (x || 0);
  return t;
}

/* ---------- identificadores ---------- */
const ALPHA = 'abcdefghijklmnopqrstuvwxyz0123456789';
export function rid(prefix = '') {
  let s = '';
  const c = globalThis.crypto;
  if (c && c.getRandomValues) { const b = new Uint8Array(12); c.getRandomValues(b); for (const x of b) s += ALPHA[x % 36]; }
  else for (let i = 0; i < 12; i++) s += ALPHA[Math.floor(Math.random() * 36)];
  return prefix + s;
}
/** Hash estável (FNV-1a 53 bits) para ids derivados de conteúdo. Não é criptográfico. */
export function hash(str) {
  let h1 = 0xdeadbeef ^ 0, h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
export function slug(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
}
/** Ids de documento do Firestore: sem '/', sem '.' isolado, até 1500 bytes. */
export function safeId(s) { return String(s).replace(/[^A-Za-z0-9_\-]/g, '_').slice(0, 300); }

/* ---------- texto e HTML ---------- */
export function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
export function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : '#'; }
export function plain(t) {
  return String(t || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s*/gm, '').replace(/^\s*[*•]\s+/gm, '- ').trim();
}
export function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
export function pct(a, b) { return b > 0 ? Math.round(100 * a / b) : 0; }
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  const ka = Object.keys(a).filter(k => a[k] !== undefined), kb = Object.keys(b).filter(k => b[k] !== undefined);
  return ka.length === kb.length && ka.every(k => deepEqual(a[k], b[k]));
}
export function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
