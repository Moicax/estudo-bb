// Converte os dados da versão 1 (um único bloco JSON salvo no navegador ou colado do backup antigo)
// em registros da versão 2. A conversão é pura e determinística: rodar duas vezes gera os mesmos ids,
// por isso a importação pode ser repetida ou retomada sem duplicar nada.
import { hash, slug, isCivilDate, civilOf } from '../core/util.js';
import { makeRecord, ids, ERROR_REASONS } from './schema.js';
import { planBaseRecords } from './template.js';

export const LEGACY_KEY = 'estudo-bb-v1';
export const LEGACY_Q_PREFIX = 'estudo-bb-q-';

const ST = { 'A fazer': 'todo', 'Em andamento': 'doing', 'Feito': 'done' };

export function isLegacyState(o) { return !!(o && typeof o === 'object' && Array.isArray(o.rows) && o.rows.every(r => r && typeof r === 'object')); }

/** Lê do localStorage o bloco antigo e os conjuntos de questões (que ficavam fora do backup antigo). */
export function readLegacyFromStorage(ls) {
  let state = null; const sets = {};
  try { const raw = ls.getItem(LEGACY_KEY); if (raw) state = JSON.parse(raw); } catch (e) { state = null; }
  try {
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith(LEGACY_Q_PREFIX)) { try { const v = JSON.parse(ls.getItem(k)); if (v && Array.isArray(v.items)) sets[k.slice(LEGACY_Q_PREFIX.length)] = v; } catch (e) { /* ignora conjunto ilegível */ } }
    }
  } catch (e) { /* sem acesso */ }
  return isLegacyState(state) ? { state, sets } : null;
}

export function legacyFingerprint(state) {
  return hash(JSON.stringify([state.upd || 0, (state.rows || []).length, (state.erros || []).length, (state.sims || []).length]));
}

/**
 * @param {object} state  bloco da v1
 * @param {object} sets   { [rowIdAntigo]: {mat, tema, at, items:[{e,a,c,x}], by} }
 * @param {object} tpl    modelo do plano (BB_TEMPLATE)
 */
export function legacyToRecords(state, sets, tpl) {
  const P = tpl.planId;
  const T = state.upd || 1; // "idade" dos dados antigos: alterações mais novas feitas no app novo vencem
  const opt = { updatedAt: T, device: 'importacao-v1' };
  const s = state.settings || {};
  const out = [];
  const push = (kind, id, data, planId = P) => out.push(makeRecord(kind, id, planId, data, opt));

  // perfil
  push('profile', 'profile', {
    name: s.nome || '',
    prefs: { videoSpeed: +s.speed || 1.25, focusMin: 25, sound: true, theme: 'system', motion: 'system', celebrate: true },
    ai: { mathAdvanced: !(s.ai && s.ai.mathHigh === false) },
  }, null);

  // campos personalizados (colunas criadas pelo usuário)
  const cfMap = {}; const customFields = [];
  for (const c of state.cc || []) { if (!c || !c.name) continue; const id = ids.customField(c.name); cfMap[c.id] = id; if (!customFields.some(x => x.id === id)) customFields.push({ id, name: c.name }); }

  // plano, matérias (com pesos editados), vídeos do modelo e playlists
  const base = planBaseRecords(tpl, { updatedAt: T, examDate: isCivilDate(s.prova) ? s.prova : null, weights: s.pesos || null, customFields });
  out.push(...base);
  const subjByName = {};
  for (const r of base) if (r.kind === 'subject') subjByName[r.data.name] = r.id;
  const subjectId = (name) => {
    if (!name) return null;
    if (!subjByName[name]) { const id = ids.subject(P, name); subjByName[name] = id; push('subject', id, { name, hue: 210, weight: null, order: 99, role: 'subject', weightStatus: null }); }
    return subjByName[name];
  };

  // vídeos do usuário
  const vidMap = {};
  for (const v of tpl.videos) vidMap[v.legacyId] = ids.video(P, v.legacyId);
  for (const x of state.xv || []) {
    if (!x || !x.u) continue;
    const id = ids.userVideo(P, x.u); vidMap[x.id] = id;
    push('video', id, { subjectId: subjectId(x.m), title: x.t || 'Vídeo', channel: x.c || '', durationSec: +x.d || 0, url: x.u, yt: null, source: 'usuario' });
  }

  // dias do cronograma
  const rowMap = {}; const seen = {};
  const rows = (state.rows || []).filter(r => r && isCivilDate(r.date));
  for (const r of rows) {
    const key = r.date + '|' + r.mat; const n = seen[key] || 0; seen[key] = n + 1;
    const id = ids.activity(P, r.date, r.mat || 'sem-materia', n); rowMap[r.id] = id;
    const custom = {};
    for (const k of Object.keys(r.cc || {})) if (cfMap[k] && r.cc[k] !== '') custom[cfMap[k]] = String(r.cc[k]);
    const status = ST[r.st] || 'todo';
    push('activity', id, {
      date: r.date, subjectId: subjectId(r.mat), title: r.tema || '',
      videoIds: (r.videos || []).map(v => vidMap[v]).filter(Boolean),
      status, doneAt: status === 'done' ? (isCivilDate(r.doneAt) ? r.doneAt : (r.mat === 'Folga' ? null : r.date)) : null,
      reviews: Array.isArray(r.rv) ? r.rv.filter(n => [1, 7, 30].includes(n)) : [],
      note: r.nota || '', summary: r.resumo || '',
      questions: r.q === '' || r.q == null ? null : +r.q || 0, correct: r.a === '' || r.a == null ? null : +r.a || 0,
      difficulty: r.dif === '' || r.dif == null ? null : +r.dif || null,
      custom, pinned: false, legacyFocusMin: +r.min || 0,
    });
    for (const d of r.duv || []) {
      if (!d || !d.q) continue;
      push('doubt', 'dbt_' + hash(id + '|' + d.q + '|' + (d.at || '') + '|' + (d.by || '')), {
        activityId: id, question: d.q, answer: d.a || '', by: d.by || 'IA', level: d.lvl === 'adv' ? 'adv' : 'basic', date: isCivilDate(d.at) ? d.at : null, fallback: !!d.fb,
      });
    }
  }

  // vídeos assistidos e anotações por aula
  for (const v of state.w || []) { const vid = vidMap[v]; if (vid) push('videoProgress', ids.videoProgress(vid), { videoId: vid, watched: true, at: T }); }
  for (const k of Object.keys(state.vn || {})) { const vid = vidMap[k]; const t = state.vn[k]; if (vid && t && String(t).trim()) push('note', ids.videoNote(vid), { target: vid, targetKind: 'video', text: String(t) }); }

  // questões geradas por IA (conteúdo) + tentativas (respostas) — separadas
  const qIdOf = {};
  for (const rowId of Object.keys(sets || {})) {
    const set = sets[rowId], actId = rowMap[rowId];
    if (!actId || !set || !Array.isArray(set.items)) continue;
    const qids = [];
    set.items.forEach((it, i) => {
      if (!it || typeof it.e !== 'string' || !Array.isArray(it.a)) return;
      const qid = 'q_' + actId + '_v1_' + i; qIdOf[rowId + ':' + i] = qid; qids.push(qid);
      push('question', qid, {
        subjectId: subjectId(set.mat), topic: set.tema || '', stem: it.e, options: it.a.map(String), answer: +it.c,
        explanation: it.x || '', source: { type: 'ia', provider: set.by || 'IA', activityId: actId, createdOn: isCivilDate(set.at) ? set.at : null },
      });
    });
    if (qids.length) push('quizSet', 'qs_' + actId + '_v1', { activityId: actId, questionIds: qids, provider: set.by || 'IA', createdOn: isCivilDate(set.at) ? set.at : null });
    const prog = (state.qs || {})[rowId];
    if (prog && Array.isArray(prog.ans)) prog.ans.forEach((ans, i) => {
      const qid = qIdOf[rowId + ':' + i]; if (qid == null || ans == null) return;
      push('attempt', 'att_' + qid + '_v1', { questionId: qid, chosen: +ans, correct: +ans === +set.items[i].c, at: T, context: 'pratica', setId: 'qs_' + actId + '_v1', countedInActivity: true });
    });
  }

  // caderno de erros (agora aponta para a questão completa quando ela existe)
  for (const e of state.erros || []) {
    if (!e) continue;
    let questionId = null;
    if (e.src && /^ia:/.test(e.src)) { const p = e.src.split(':'); questionId = qIdOf[p[1] + ':' + p[2]] || null; }
    push('errorEntry', 'err_' + hash([e.date, e.mat, e.tema, e.regra, e.src].join('|')), {
      date: isCivilDate(e.date) ? e.date : civilOf(T), subjectId: subjectId(e.mat), topic: e.tema || '',
      reason: ERROR_REASONS.includes(e.why) ? e.why : ERROR_REASONS[0], rule: e.regra || '', note: '',
      reviews: Array.isArray(e.rev) ? e.rev.filter(n => [1, 7, 30].includes(n)) : [], questionId,
    });
  }

  // simulados
  for (const x of state.sims || []) {
    if (!x) continue;
    push('simulation', 'sim_' + hash([x.date, x.nome, x.acertos, x.total, x.obs].join('|')), {
      date: isCivilDate(x.date) ? x.date : civilOf(T), name: x.nome || 'Simulado', correct: x.acertos == null || x.acertos === '' ? null : +x.acertos || 0,
      total: x.total == null || x.total === '' ? null : +x.total || 0, notes: x.obs || '',
    });
  }
  return out;
}

export { slug };
