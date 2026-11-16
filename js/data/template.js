// Cria os registros de um plano a partir de um modelo (hoje: Banco do Brasil 2026).
import { addDays, safeId } from '../core/util.js';
import { makeRecord, ids } from './schema.js';

export function subjectIndex(tpl) {
  const m = {};
  for (const s of tpl.subjects) m[s.name] = ids.subject(tpl.planId, s.name);
  return m;
}
export function videoIdFor(tpl, legacyId) { return ids.video(tpl.planId, legacyId); }

/** Registros fixos do plano: plano, matérias, vídeos e playlists. */
export function planBaseRecords(tpl, { updatedAt = 1, examDate = null, weights = null, customFields = [] } = {}) {
  const P = tpl.planId, opt = { updatedAt, device: 'modelo' }, out = [];
  out.push(makeRecord('plan', ids.plan(P), P, {
    name: tpl.name, goal: tpl.goal, banca: tpl.banca, start: tpl.start, examDate,
    status: 'active', template: P, lightWeeks: tpl.lightWeeks || [],
    weightsSource: { ...tpl.weightsSource }, customFields,
    availability: { days: [1, 2, 3, 4, 5, 6], minutesPerDay: null }, notes: '',
  }, opt));
  for (const s of tpl.subjects) {
    const w = weights && weights[s.name] != null ? +weights[s.name] : s.weight;
    out.push(makeRecord('subject', ids.subject(P, s.name), P, {
      name: s.name, hue: s.hue, weight: w, order: s.order, role: s.kind,
      weightStatus: w == null ? null : (weights && weights[s.name] != null && weights[s.name] !== s.weight ? 'editado' : 'estimado'),
    }, opt));
  }
  const sub = subjectIndex(tpl);
  for (const v of tpl.videos) {
    out.push(makeRecord('video', ids.video(P, v.legacyId), P, {
      subjectId: sub[v.subject] || null, title: v.title, channel: v.channel, durationSec: v.durationSec || 0,
      url: v.url, yt: v.yt, source: 'modelo',
    }, opt));
  }
  for (const p of tpl.playlists) {
    out.push(makeRecord('playlist', ids.playlist(P, p.url), P, { subjectId: sub[p.subject] || null, title: p.title, url: p.url }, opt));
  }
  return out;
}

/** Dias do cronograma do modelo (para quem começa do zero). */
export function planScheduleRecords(tpl, { updatedAt = 1 } = {}) {
  const P = tpl.planId, opt = { updatedAt, device: 'modelo' }, out = [], sub = subjectIndex(tpl);
  const act = (date, subject, title) => {
    const restDay = subject === 'Folga';
    out.push(makeRecord('activity', ids.activity(P, date, subject), P, {
      date, subjectId: sub[subject], title: tpl.topicFor(date, title),
      videoIds: tpl.videosByDate(date).map(v => ids.video(P, v)),
      status: restDay ? 'done' : 'todo', doneAt: null, reviews: [], note: '', summary: '',
      questions: null, correct: null, difficulty: null, custom: {}, pinned: false,
    }, opt));
  };
  if (tpl.earlyDay) act(tpl.earlyDay.date, tpl.earlyDay.subject, tpl.earlyDay.title);
  tpl.weeks.forEach((week, w) => week.forEach((d, i) => act(addDays(tpl.start, w * 7 + i), d[0], d[1])));
  return out;
}

export { safeId };
