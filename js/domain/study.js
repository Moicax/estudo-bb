// Regras de estudo (sem interface): atividades do dia, revisões, progresso, raio-x e cronômetro.
import { addDays, today as todayFn, diffDays } from '../core/util.js';

export const REVIEW_STEPS = [1, 7, 30];

export function planOf(store, planId) { return store.get('plan_' + planId); }
export function subjectsOf(store, planId) { return store.list('subject', { planId }).sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99) || a.data.name.localeCompare(b.data.name)); }
export function subjectMap(store, planId) { const m = {}; for (const s of store.list('subject', { planId })) m[s.id] = s; return m; }
export function isRest(sub) { return !!sub && sub.data.role === 'rest'; }
export function activitiesOf(store, planId) { return store.list('activity', { planId }).sort((a, b) => a.data.date < b.data.date ? -1 : a.data.date > b.data.date ? 1 : a.id < b.id ? -1 : 1); }
export function videosOf(store, planId) { return store.list('video', { planId }); }
export function watched(store, videoId) { const p = store.get('vp_' + videoId); return !!(p && p.data.watched); }

export function weekOf(plan, date) {
  if (!plan || !plan.data.start) return null;
  const n = diffDays(plan.data.start, date);
  return n < 0 ? 0 : Math.floor(n / 7) + 1;
}
export function planWeeks(store, planId) {
  const plan = planOf(store, planId); const acts = activitiesOf(store, planId);
  if (!plan || !acts.length) return 0;
  return Math.max(...acts.map(a => weekOf(plan, a.data.date) || 0));
}

/** O que mostrar em "Hoje": atividade de hoje, atrasadas, próxima. */
export function todayPlan(store, planId, t = todayFn()) {
  const subs = subjectMap(store, planId);
  const acts = activitiesOf(store, planId);
  const real = acts.filter(a => !isRest(subs[a.data.subjectId]));
  const todays = acts.filter(a => a.data.date === t);
  const overdue = real.filter(a => a.data.date < t && a.data.status !== 'done');
  const upcoming = real.filter(a => a.data.date > t && a.data.status !== 'done');
  const todayOpen = todays.filter(a => a.data.status !== 'done' && !isRest(subs[a.data.subjectId]));
  const next = todayOpen[0] || null;
  return { todays, todayOpen, overdue, upcoming, next, nextUpcoming: upcoming[0] || null, restToday: todays.length > 0 && todays.every(a => isRest(subs[a.data.subjectId])) };
}

export function dueReviews(store, planId, t = todayFn()) {
  const subs = subjectMap(store, planId); const out = [];
  const pick = (base, done) => { let best = 0; for (const n of REVIEW_STEPS) if (!(done || []).includes(n) && addDays(base, n) <= t) best = n; return best; };
  for (const a of store.list('activity', { planId })) {
    const s = subs[a.data.subjectId];
    if (a.data.status !== 'done' || isRest(s) || (s && s.data.role === 'activity')) continue;
    const base = a.data.doneAt || a.data.date; const n = pick(base, a.data.reviews);
    if (n) out.push({ kind: 'activity', id: a.id, step: n, due: addDays(base, n), subjectId: a.data.subjectId, title: a.data.title });
  }
  for (const e of store.list('errorEntry', { planId })) {
    if (!e.data.topic && !e.data.rule) continue;
    const n = pick(e.data.date, e.data.reviews);
    if (n) out.push({ kind: 'error', id: e.id, step: n, due: addDays(e.data.date, n), subjectId: e.data.subjectId, title: e.data.topic || e.data.rule.slice(0, 80) });
  }
  return out.sort((a, b) => a.due < b.due ? -1 : 1);
}
/** Marcar a revisão de n dias também marca as anteriores (quem revisou com 7 dias não precisa da de 1). */
export function reviewsAfter(done, step) { const s = new Set(done || []); for (const n of REVIEW_STEPS) if (n <= step) s.add(n); return [...s].sort((a, b) => a - b); }

/* ---------- cronômetro ----------
 * Uma sessão guarda trechos {s: início, e: fim} em ms. O tempo é calculado pelos registros, nunca por um contador
 * na tela: recarregar a página ou fechar o app não muda nada.
 */
export function sessionElapsed(sess, now = Date.now()) {
  let ms = 0;
  for (const seg of sess.data.segments || []) ms += (seg.e || now) - seg.s;
  return Math.max(0, ms / 1000);
}
export function activeSession(store, planId) {
  return store.list('session', { planId }).filter(s => s.data.state !== 'ended').sort((a, b) => b.data.startedAt - a.data.startedAt)[0] || null;
}
export function sessionStart(activityId, plannedSec, device, now = Date.now()) {
  return { activityId, plannedSec, segments: [{ s: now, e: null }], state: 'running', startedAt: now, endedAt: null, device, completed: false };
}
export function sessionPause(d, now = Date.now()) {
  if (d.state !== 'running') return d;
  const segs = d.segments.map((x, i) => i === d.segments.length - 1 && !x.e ? { ...x, e: now } : x);
  return { ...d, segments: segs, state: 'paused' };
}
export function sessionResume(d, now = Date.now()) {
  if (d.state !== 'paused') return d;
  return { ...d, segments: [...d.segments, { s: now, e: null }], state: 'running' };
}
export function sessionStop(d, now = Date.now(), completed = false) {
  const segs = d.segments.map(x => x.e ? x : { ...x, e: now });
  return { ...d, segments: segs, state: 'ended', endedAt: now, completed };
}
/** Se o tempo planejado já passou (mesmo com o app fechado), encerra no momento exato em que terminou. */
export function sessionAutoFinish(d, now = Date.now()) {
  if (d.state !== 'running') return null;
  const done = d.segments.reduce((ms, x) => ms + ((x.e || now) - x.s), 0);
  if (done < d.plannedSec * 1000) return null;
  const last = d.segments[d.segments.length - 1];
  const before = done - (now - last.s);
  const endAt = last.s + (d.plannedSec * 1000 - before);
  return sessionStop(d, endAt, true);
}
export function focusSecondsOf(store, planId, activityId = null) {
  let s = 0;
  for (const x of store.list('session', { planId })) if (x.data.state === 'ended' && (!activityId || x.data.activityId === activityId)) s += sessionElapsed(x);
  for (const a of store.list('activity', { planId })) if (!activityId || a.id === activityId) s += (a.data.legacyFocusMin || 0) * 60;
  return s;
}

/* ---------- progresso ---------- */
export function attemptsOf(store, planId) {
  const qs = {}; for (const q of store.list('question', { planId })) qs[q.id] = q;
  return store.list('attempt', { planId }).map(a => ({ a, q: qs[a.data.questionId] || null }));
}
export function progress(store, planId) {
  const subs = subjectMap(store, planId);
  const acts = activitiesOf(store, planId).filter(a => !isRest(subs[a.data.subjectId]));
  const done = acts.filter(a => a.data.status === 'done').length;
  const sched = new Set(); for (const a of acts) for (const v of a.data.videoIds || []) sched.add(v);
  let vw = 0, vsec = 0; for (const id of sched) { const v = store.get(id); if (v && watched(store, id)) { vw++; vsec += v.data.durationSec || 0; } }
  let q = 0, c = 0;
  for (const a of acts) { q += +a.data.questions || 0; c += +a.data.correct || 0; }
  for (const { a } of attemptsOf(store, planId)) if (!a.data.countedInActivity) { q++; if (a.data.correct) c++; }
  return { done, total: acts.length, videosWatched: vw, videosTotal: sched.size, watchedSec: vsec, questions: q, correct: c, focusSec: focusSecondsOf(store, planId) };
}
export const FEW_ANSWERS = 10;
export function raioX(store, planId) {
  const subs = subjectsOf(store, planId).filter(s => s.data.role === 'subject');
  const acts = activitiesOf(store, planId); const att = attemptsOf(store, planId);
  const errs = store.list('errorEntry', { planId }); const vids = videosOf(store, planId);
  const rows = subs.map(s => {
    const rs = acts.filter(a => a.data.subjectId === s.id);
    let q = 0, c = 0; for (const a of rs) { q += +a.data.questions || 0; c += +a.data.correct || 0; }
    for (const { a, q: qq } of att) if (qq && qq.data.subjectId === s.id && !a.data.countedInActivity) { q++; if (a.data.correct) c++; }
    const vs = vids.filter(v => v.data.subjectId === s.id);
    const focus = rs.reduce((n, a) => n + focusSecondsOf(store, planId, a.id), 0);
    const pctv = q ? c / q : null;
    return { s, weight: s.data.weight, days: rs.length, done: rs.filter(a => a.data.status === 'done').length, q, c, pct: pctv, few: q < FEW_ANSWERS,
      videos: vs.length, videosWatched: vs.filter(v => watched(store, v.id)).length, focus, errors: errs.filter(e => e.data.subjectId === s.id).length,
      loss: q >= FEW_ANSWERS && s.data.weight != null ? s.data.weight * (1 - pctv) : null };
  });
  let cov = 0, sum = 0, tot = 0;
  for (const r of rows) { if (r.weight != null) tot += r.weight; if (!r.few && r.weight != null) { cov += r.weight; sum += r.weight * r.pct; } }
  return { rows, estimate: cov > 0 ? sum / cov : null, coverage: tot ? cov / tot : 0, focus: rows.filter(r => r.loss != null).sort((a, b) => b.loss - a.loss).slice(0, 3) };
}
