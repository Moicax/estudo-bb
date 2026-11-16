// Estudar: a atividade do dia com aulas, foco, prática, dúvidas, anotações e registro.
import { icon, esc, chip, empty, debounce, openDialog, confirmDialog, toast, chime, $ } from '../ui/dom.js';
import { today, fmtShort, fmtLong, fmtDur, fmtClock, rid, safeUrl, isCivilDate } from '../core/util.js';
import { subjectMap, subjectsOf, watched, activeSession, sessionElapsed, sessionStart, sessionPause, sessionResume, sessionStop, sessionAutoFinish, focusSecondsOf, weekOf } from '../domain/study.js';
import { STATUS, ERROR_REASONS } from '../data/schema.js';
import { prompts, validQuestions, aiMessage, isAdvanced } from '../ai/ai.js';

const S = { openNotes: new Set(), aiBusy: {}, aiErr: {}, doubtLevel: 'auto', showAllDoubts: false };
const GRAN = 'https://questoes.grancursosonline.com.br/concursos';
const savers = new Map();
function saver(ctx, key, fn) { if (!savers.has(key)) savers.set(key, debounce(fn, 400)); return savers.get(key); }
addEventListener('pagehide', () => { for (const s of savers.values()) s.flush(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') for (const s of savers.values()) s.flush(); });

function act(ctx) { const a = ctx.store.get(ctx.route.arg); return a && !ctx.hiddenIds.has(a.id) ? a : null; }

export function render(ctx) {
  const a = act(ctx);
  if (!a) return empty('calendar-days', 'Atividade não encontrada', 'Ela pode ter sido excluída em outro aparelho.', '<button class="btn" data-act="go" data-to="agenda">Abrir a Agenda</button>');
  const P = a.planId, subs = subjectMap(ctx.store, P), sub = subs[a.data.subjectId], plan = ctx.plan;
  const wk = weekOf(plan, a.data.date);
  let h = `<div class="study-head">
    <div class="row"><a class="btn ghost sm" href="#agenda">${icon('chevron-left', 'sm')}Agenda</a><span class="spacer"></span><span class="small muted">${esc(fmtLong(a.data.date))}${wk ? ' · semana ' + wk : ''}</span></div>
    <div class="row">${chip(sub)}${a.data.date === today() ? '<span class="tag ok">Hoje</span>' : a.data.date < today() && a.data.status !== 'done' ? '<span class="tag">De um dia anterior</span>' : ''}</div>
    <label class="sr-only" for="st-title">Tema da atividade</label>
    <input id="st-title" class="title-input" type="text" value="${esc(a.data.title)}" data-input="title" autocomplete="off">
    <div class="seg status" role="group" aria-label="Situação">${['todo', 'doing', 'done'].map(v => `<button data-act="status" data-v="${v}" aria-pressed="${a.data.status === v}" data-flash="${v === 'done' ? 'done:' + esc(a.id) : ''}">${v === 'done' ? icon('check', 'sm') : ''}${STATUS[v]}</button>`).join('')}</div>
  </div><div class="stack lg">`;

  h += versionsBox(ctx, a);
  h += lessons(ctx, a);
  h += timerBox(ctx, a);
  h += practice(ctx, a, sub);
  h += doubts(ctx, a, sub);
  h += notes(ctx, a);
  h += record(ctx, a, plan);
  h += more(ctx, a, P);
  return h + '</div>';
}

function versionsBox(ctx, a) {
  const vids = new Set(a.data.videoIds || []);
  const vs = ctx.store.list('version').filter(v => v.data.targetId === a.id || (v.data.targetKind === 'note' && vids.has(v.data.targetId.replace(/^note_/, ''))));
  if (!vs.length) return '';
  return `<div class="notice warn">${icon('history')}<div class="grow"><b>Há ${vs.length === 1 ? 'uma versão alternativa' : vs.length + ' versões alternativas'} de texto.</b>
    <div class="small">O mesmo texto foi editado em dois aparelhos. A versão mais recente ficou valendo; a outra está guardada aqui.</div>
    ${vs.map(v => `<div class="qa" style="margin-top:8px"><div class="small muted">${v.data.field === 'note' ? 'Anotações' : v.data.field === 'summary' ? 'Resumo' : 'Anotação da aula'} · guardada em ${new Date(v.data.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</div>
      <div class="answer" style="max-height:160px;overflow:auto">${esc(v.data.text)}</div>
      <div class="row" style="margin-top:8px"><button class="btn sm" data-act="ver-use" data-id="${esc(v.id)}">Usar esta versão</button><button class="btn sm ghost" data-act="ver-drop" data-id="${esc(v.id)}">Descartar</button></div></div>`).join('')}</div></div>`;
}

function lessons(ctx, a) {
  const vids = (a.data.videoIds || []).map(id => ctx.store.get(id)).filter(Boolean);
  const sp = +ctx.prefs().videoSpeed || 1;
  const tot = vids.reduce((n, v) => n + (v.data.durationSec || 0), 0);
  let h = `<section class="card" aria-labelledby="sec-aulas"><div class="row" style="justify-content:space-between"><h3 id="sec-aulas">Aulas</h3><span class="small muted">${vids.length ? `${fmtDur(tot)}${sp !== 1 ? ` · ${fmtDur(tot / sp)} a ${String(sp).replace('.', ',')}x` : ''}` : ''}</span></div>`;
  if (!vids.length) h += `<p class="muted small" style="margin:6px 0 10px">Nenhuma aula neste dia.</p>`;
  for (const v of vids) {
    const w = watched(ctx.store, v.id), n = ctx.store.get('note_' + v.id), open = S.openNotes.has(v.id);
    h += `<div class="vid"><button class="done-btn" style="width:34px;height:34px" data-act="watch" data-vid="${esc(v.id)}" aria-pressed="${w}" data-flash="w:${esc(v.id)}" aria-label="${w ? 'Desmarcar' : 'Marcar'} como assistida: ${esc(v.data.title)}">${icon('check', 'sm')}</button>
      <div class="t"><b>${esc(v.data.title)}</b><small>${esc(v.data.channel || '')}${v.data.durationSec ? ' · ' + fmtClock(v.data.durationSec) : ''}${n && n.data.text ? ' · com anotação' : ''}</small></div>
      <div class="vid-acts row tight"><button class="btn sm ghost icon" data-act="vnote" data-vid="${esc(v.id)}" aria-expanded="${open}" aria-label="Anotações desta aula">${icon('pencil', 'sm')}</button>
      <a class="btn sm soft" href="${esc(safeUrl(v.data.url))}" target="_blank" rel="noopener noreferrer">${icon('play', 'sm')}<span>Assistir</span></a>
      <button class="btn sm ghost icon" data-act="detach" data-vid="${esc(v.id)}" aria-label="Tirar esta aula do dia">${icon('x', 'sm')}</button></div></div>
      <div class="vid-note collapse ${open ? 'open' : ''}"><div>${open ? `<label class="sr-only" for="vn-${esc(v.id)}">Anotações da aula</label><textarea id="vn-${esc(v.id)}" data-input="vnote" data-vid="${esc(v.id)}" placeholder="O que você aprendeu nesta aula. Fica salvo enquanto você digita.">${esc(n ? n.data.text : '')}</textarea>` : ''}</div></div>`;
  }
  return h + `<button class="btn sm" data-act="add-video" style="margin-top:8px">${icon('plus', 'sm')}Adicionar aula</button></section>`;
}

function timerBox(ctx, a) {
  const sess = activeSession(ctx.store, a.planId);
  const mine = sess && sess.data.activityId === a.id;
  const total = focusSecondsOf(ctx.store, a.planId, a.id);
  let h = `<section class="card" aria-labelledby="sec-foco"><div class="row" style="justify-content:space-between"><h3 id="sec-foco">Foco</h3><span class="small muted">Neste dia: ${fmtDur(total)}</span></div>`;
  if (mine) {
    const el = sessionElapsed(sess), left = Math.max(0, sess.data.plannedSec - el), run = sess.data.state === 'running';
    h += `<div class="timer-box" style="margin-top:8px"><div class="ring" id="ring" style="--p:${Math.min(1, el / sess.data.plannedSec).toFixed(3)}"></div>
      <div><div class="clock ${run ? 'running' : ''}" id="clock" role="timer" aria-live="off">${fmtClock(left)}</div><div class="small muted">${run ? 'Em andamento' : 'Pausado'} · ${fmtDur(sess.data.plannedSec)} no total</div></div>
      <div class="row">${run ? `<button class="btn" data-act="t-pause">${icon('pause')}Pausar</button>` : `<button class="btn primary" data-act="t-resume">${icon('play')}Continuar</button>`}<button class="btn ghost" data-act="t-stop">${icon('square')}Encerrar</button></div></div>`;
  } else if (sess) {
    h += `<div class="notice" style="margin-top:8px">${icon('timer')}<div>Há um foco ${sess.data.state === 'running' ? 'em andamento' : 'pausado'} em outra atividade. <a href="#estudo/${esc(sess.data.activityId)}">Abrir</a></div></div>`;
  } else {
    const def = +ctx.prefs().focusMin || 25;
    const opts = [...new Set([15, 25, 30, 45, 50, 60, 90, def])].sort((x, y) => x - y);
    h += `<div class="row" style="margin-top:8px"><label class="sr-only" for="t-min">Duração</label><select id="t-min" style="width:auto">${opts.map(m => `<option value="${m}" ${m === def ? 'selected' : ''}>${m} min</option>`).join('')}</select>
      <button class="btn primary" data-act="t-start">${icon('play')}Iniciar foco</button><span class="small muted">Continua contando mesmo se você fechar o app.</span></div>`;
  }
  return h + '</section>';
}

function practice(ctx, a, sub) {
  if (!sub || sub.data.role !== 'subject') return '';
  const sets = ctx.store.list('quizSet', { planId: a.planId }).filter(s => s.data.activityId === a.id).sort((x, y) => (y.data.createdAt || 0) - (x.data.createdAt || 0));
  const busy = S.aiBusy['quiz:' + a.id];
  let h = `<section class="card" aria-labelledby="sec-pr"><h3 id="sec-pr">Praticar</h3>`;
  if (S.aiErr['quiz:' + a.id]) h += `<div class="notice bad" style="margin:8px 0">${icon('triangle-alert')}<div>${esc(S.aiErr['quiz:' + a.id])}</div></div>`;
  for (const s of sets) {
    const r = lastRound(ctx, s);
    h += `<div class="item" style="padding:10px 0;background:none"><div class="body"><span class="title">${s.data.questionIds.length} questões · ${esc(s.data.provider || 'IA')}</span><span class="sub">${r ? `Última rodada: ${r.ok} de ${r.n}${r.n < s.data.questionIds.length ? ' (incompleta)' : ''}` : 'Ainda não respondida'}</span></div>
      <button class="btn sm ${r ? '' : 'primary'}" data-act="quiz-open" data-set="${esc(s.id)}">${r ? icon('rotate-ccw', 'sm') + 'Refazer' : icon('play', 'sm') + 'Responder'}</button></div>`;
  }
  h += `<div class="row" style="margin-top:8px">${ctx.ai.hasAny() ? `<button class="btn ${sets.length ? '' : 'primary'}" data-act="quiz-new" ${busy ? 'disabled' : ''}>${busy ? icon('refresh-cw', 'spin') + 'Gerando questões…' : icon('sparkles') + 'Gerar 10 questões com IA'}</button>` : `<a class="btn" href="#ajustes">${icon('sparkles')}Configurar IA para gerar questões</a>`}
    <a class="btn ghost" href="${GRAN}" target="_blank" rel="noopener noreferrer">${icon('external-link', 'sm')}Questões reais no Gran</a></div>
    <p class="hint">${ctx.ai.hasAny() ? 'IA usada: ' + esc(ctx.ai.routeNames(/matem/i.test(sub.data.name) && (ctx.profile?.data.ai?.mathAdvanced !== false) ? 'adv' : 'basic')) + '. Questões criadas por IA podem ter erros: confira na apostila se algo parecer estranho.' : 'Para gerar questões, configure uma IA em Ajustes. Precisa de internet.'}</p></section>`;
  return h;
}
function lastRound(ctx, set) {
  const atts = ctx.store.list('attempt', { planId: set.planId }).filter(x => x.data.setId === set.id);
  if (!atts.length) return null;
  const byRound = {};
  for (const x of atts) { const k = x.data.round || 'v1'; (byRound[k] = byRound[k] || []).push(x); }
  const k = Object.keys(byRound).sort((p, q) => Math.max(...byRound[q].map(z => z.data.at)) - Math.max(...byRound[p].map(z => z.data.at)))[0];
  const list = byRound[k];
  return { n: list.length, ok: list.filter(z => z.data.correct).length };
}

function doubts(ctx, a, sub) {
  if (sub && sub.data.role === 'rest') return '';
  const list = ctx.store.list('doubt', { planId: a.planId }).filter(d => d.data.activityId === a.id && !ctx.hiddenIds.has(d.id)).sort((x, y) => (y.data.at || 0) - (x.data.at || 0));
  const busy = S.aiBusy['doubt:' + a.id];
  let h = `<section class="card" aria-labelledby="sec-dv"><h3 id="sec-dv">Tirar dúvida</h3>
    <label class="sr-only" for="dv-q">Sua dúvida</label><textarea id="dv-q" placeholder="Ex.: qual a diferença entre CMN e Bacen? Como calculo a parcela no SAC?" style="min-height:70px">${esc(S.draft || '')}</textarea>
    <div class="row" style="margin-top:8px"><label class="sr-only" for="dv-l">Nível</label><select id="dv-l" style="width:auto" data-change="dvlevel">
      ${[['auto', 'Nível automático'], ['basic', 'Simples (IA grátis)'], ['adv', 'Avançada (Claude)']].map(([v, l]) => `<option value="${v}" ${S.doubtLevel === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button class="btn primary" data-act="doubt-ask" ${busy ? 'disabled' : ''}>${busy ? icon('refresh-cw', 'spin') + 'Pensando…' : icon('message-circle-question') + 'Perguntar'}</button>
      <a class="btn ghost" data-act="doubt-claude" href="https://claude.ai/new" target="_blank" rel="noopener noreferrer">${icon('external-link', 'sm')}Abrir no Claude</a></div>`;
  if (S.aiErr['doubt:' + a.id]) h += `<div class="notice bad" style="margin-top:8px">${icon('triangle-alert')}<div>${esc(S.aiErr['doubt:' + a.id])}</div></div>`;
  for (const d of (S.showAllDoubts ? list : list.slice(0, 3))) {
    h += `<div class="qa" style="margin-top:10px"><div class="row small muted" style="justify-content:space-between"><span>${d.data.date ? fmtShort(d.data.date) + ' · ' : ''}${d.data.level === 'adv' ? 'avançada' : 'simples'} · ${esc(d.data.by)}</span><button class="btn sm ghost icon" data-act="doubt-del" data-id="${esc(d.id)}" aria-label="Excluir dúvida">${icon('trash-2', 'sm')}</button></div>
      <p style="font-weight:650;margin:4px 0">${esc(d.data.question)}</p><div class="answer">${esc(d.data.answer)}</div>
      ${d.data.fallback ? '<p class="hint">Sem Claude configurado, respondeu a IA grátis. Para a resposta do seu Claude Pro, use "Abrir no Claude".</p>' : ''}</div>`;
  }
  if (list.length > 3) h += `<button class="btn sm ghost" style="margin-top:8px" data-act="doubt-all">${S.showAllDoubts ? 'Mostrar só as 3 últimas' : 'Ver todas as ' + list.length}</button>`;
  return h + '</section>';
}

function notes(ctx, a) {
  const busy = S.aiBusy['sum:' + a.id];
  const hasNotes = !!(a.data.note || '').trim() || (a.data.videoIds || []).some(v => { const n = ctx.store.get('note_' + v); return n && n.data.text && n.data.text.trim(); });
  return `<section class="card stack" aria-labelledby="sec-nt"><h3 id="sec-nt">Anotações</h3>
    <label class="sr-only" for="st-note">Anotações do dia</label><textarea id="st-note" data-input="note" placeholder="Regras para decorar, dúvidas, o que caiu na prática…">${esc(a.data.note || '')}</textarea>
    <div class="row" style="justify-content:space-between"><b>Resumo</b><button class="btn sm" data-act="summarize" ${busy || !hasNotes ? 'disabled' : ''} title="${hasNotes ? '' : 'Escreva anotações primeiro'}">${busy ? icon('refresh-cw', 'spin') + 'Resumindo…' : icon('sparkles', 'sm') + (a.data.summary ? 'Resumir de novo' : 'Resumir com IA')}</button></div>
    ${S.aiErr['sum:' + a.id] ? `<div class="notice bad">${icon('triangle-alert')}<div>${esc(S.aiErr['sum:' + a.id])}</div></div>` : ''}
    <label class="sr-only" for="st-sum">Resumo</label><textarea id="st-sum" data-input="summary" placeholder="${hasNotes ? 'O resumo organizado aparece aqui. Você pode editar.' : 'Escreva anotações (aqui ou nas aulas) para poder resumir.'}">${esc(a.data.summary || '')}</textarea></section>`;
}

function record(ctx, a, plan) {
  const cfs = (plan && plan.data.customFields) || [];
  return `<section class="card" aria-labelledby="sec-rg"><h3 id="sec-rg">Registro</h3><p class="hint" style="margin-bottom:10px">Questões feitas fora do sistema (apostila, sites). As da IA são contadas automaticamente.</p><div class="grid2">
    <div class="field"><label class="f" for="rg-q">Questões feitas</label><input id="rg-q" type="number" min="0" inputmode="numeric" value="${a.data.questions ?? ''}" data-input="num" data-f="questions"></div>
    <div class="field"><label class="f" for="rg-c">Acertos</label><input id="rg-c" type="number" min="0" inputmode="numeric" value="${a.data.correct ?? ''}" data-input="num" data-f="correct"></div>
    <div class="field"><label class="f" for="rg-d">Dificuldade (1 a 5)</label><input id="rg-d" type="number" min="1" max="5" inputmode="numeric" value="${a.data.difficulty ?? ''}" data-input="num" data-f="difficulty"></div>
    ${cfs.map(cf => `<div class="field"><label class="f" for="cf-${esc(cf.id)}">${esc(cf.name)}</label><input id="cf-${esc(cf.id)}" type="text" value="${esc((a.data.custom || {})[cf.id] || '')}" data-input="custom" data-cf="${esc(cf.id)}"></div>`).join('')}
  </div></section>`;
}

function more(ctx, a, P) {
  const subs = subjectsOf(ctx.store, P);
  return `<section class="card" aria-labelledby="sec-mv"><h3 id="sec-mv">Mudar dia ou matéria</h3><div class="grid2" style="margin-top:6px">
    <div class="field"><label class="f" for="mv-date">Data</label><input id="mv-date" type="date" value="${esc(a.data.date)}" data-change="date"></div>
    <div class="field"><label class="f" for="mv-sub">Matéria</label><select id="mv-sub" data-change="subject">${subs.map(s => `<option value="${esc(s.id)}" ${s.id === a.data.subjectId ? 'selected' : ''}>${esc(s.data.name)}</option>`).join('')}</select></div></div>
    <button class="btn danger sm" style="margin-top:12px" data-act="delete">${icon('trash-2', 'sm')}Excluir atividade</button></section>`;
}

/* ---------- quiz ---------- */
let Q = null;
function openQuiz(ctx, setId) {
  const set = ctx.store.get(setId); if (!set) return;
  const qs = set.data.questionIds.map(id => ctx.store.get(id)).filter(Boolean);
  if (!qs.length) { toast('As questões deste conjunto não estão disponíveis.', { icon: 'triangle-alert' }); return; }
  Q = { set, qs, i: 0, round: rid('r'), answers: {}, dlg: null };
  Q.dlg = openDialog('', { wide: true, label: 'Praticar', onClose: () => { Q = null; } });
  paintQuiz(ctx);
}
function paintQuiz(ctx) {
  if (!Q) return;
  const n = Q.qs.length, L = 'ABCDE';
  if (Q.i >= n) {
    const ok = Q.qs.filter(q => Q.answers[q.id] === q.data.answer).length;
    Q.dlg.set(`<h2>Resultado: ${ok} de ${n}</h2><p class="muted">${Math.round(100 * ok / n)}% de acerto.${n - ok ? ` As ${n - ok} erradas foram para o Caderno de erros, com o enunciado completo para refazer.` : ''}</p>
      <div class="list" style="margin-top:12px">${Q.qs.map((q, k) => `<div class="item"><span class="tag ${Q.answers[q.id] === q.data.answer ? 'ok' : 'bad'}">${Q.answers[q.id] === q.data.answer ? 'Acertou' : 'Errou'}</span><div class="body"><span class="small">${k + 1}. ${esc(q.data.stem.slice(0, 120))}${q.data.stem.length > 120 ? '…' : ''}</span></div></div>`).join('')}</div>
      <div class="dialog-actions"><button class="btn" data-close>Fechar</button></div>`);
    return;
  }
  const q = Q.qs[Q.i], ans = Q.answers[q.id], done = ans != null;
  Q.dlg.set(`<div class="row" style="justify-content:space-between"><span class="eyebrow">Questão ${Q.i + 1} de ${n}</span><button class="btn sm ghost icon" data-close aria-label="Fechar">${icon('x')}</button></div>
    <p style="margin:10px 0 14px;white-space:pre-wrap;font-size:1.02rem">${esc(q.data.stem)}</p>
    <div class="stack" style="gap:8px">${q.data.options.map((o, k) => `<button class="opt ${done ? (k === q.data.answer ? 'right' : k === ans ? 'wrong' : '') : ''}" data-act="quiz-pick" data-k="${k}" ${done ? 'disabled' : ''}><b>${L[k]})</b><span>${esc(o)}</span></button>`).join('')}</div>
    ${done ? `<div class="notice ${ans === q.data.answer ? 'ok' : 'bad'}" style="margin-top:12px">${icon(ans === q.data.answer ? 'circle-check' : 'info')}<div><b>${ans === q.data.answer ? 'Acertou!' : 'A correta é a ' + L[q.data.answer] + '.'}</b><div>${esc(q.data.explanation)}</div></div></div>
    <div class="dialog-actions"><button class="btn primary" data-act="quiz-next" autofocus>${Q.i + 1 < n ? 'Próxima' : 'Ver resultado'}${icon('arrow-right', 'sm')}</button></div>` : ''}
    <p class="hint" style="margin-top:12px">Questão criada por IA (${esc(q.data.source?.provider || 'IA')}). Pode haver erros.</p>`);
  Q.dlg.el.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); quizAct(ctx, b); }));
}
async function quizAct(ctx, b) {
  if (!Q) return;
  if (b.dataset.act === 'quiz-next') { Q.i++; paintQuiz(ctx); return; }
  const q = Q.qs[Q.i], k = +b.dataset.k; if (Q.answers[q.id] != null) return;
  Q.answers[q.id] = k;
  const correct = k === q.data.answer;
  await ctx.store.put('attempt', rid('att_'), Q.set.planId, { questionId: q.id, chosen: k, correct, at: Date.now(), context: 'pratica', setId: Q.set.id, round: Q.round });
  if (!correct && !ctx.store.list('errorEntry', { planId: Q.set.planId }).some(e => e.data.questionId === q.id)) {
    const a = ctx.store.get(Q.set.data.activityId);
    await ctx.store.put('errorEntry', rid('err_'), Q.set.planId, { date: today(), subjectId: q.data.subjectId, topic: a ? a.data.title : q.data.topic, reason: ERROR_REASONS[0], rule: q.data.explanation, note: '', reviews: [], questionId: q.id });
  }
  paintQuiz(ctx);
}

/* ---------- ações ---------- */
async function patchA(ctx, partial) { const a = act(ctx); if (a) await ctx.store.patch(a.id, partial); }

export const actions = {
  async status(el, e, ctx) {
    const a = act(ctx), v = el.dataset.v; if (!a || a.data.status === v) return;
    if (v === 'done' || a.data.status === 'done') return ctx.toggleDone(a.id, v);
    await patchA(ctx, { status: v });
  },
  vnote(el, e, ctx) { const v = el.dataset.vid; if (S.openNotes.has(v)) S.openNotes.delete(v); else S.openNotes.add(v); ctx.render(); setTimeout(() => { const t = document.getElementById('vn-' + v); if (t) t.focus(); }, 60); },
  async detach(el, e, ctx) { const a = act(ctx); await patchA(ctx, { videoIds: a.data.videoIds.filter(x => x !== el.dataset.vid) }); toast('Aula tirada deste dia. Ela continua na biblioteca.', { action: 'Desfazer', onAction: () => ctx.store.patch(a.id, { videoIds: a.data.videoIds }) }); },
  'add-video'(el, e, ctx) {
    const a = act(ctx); const all = ctx.store.list('video', { planId: a.planId });
    const subs = subjectMap(ctx.store, a.planId);
    const list = (f, q) => all.filter(v => (!f || v.data.subjectId === f) && (!q || (v.data.title + ' ' + v.data.channel).toLowerCase().includes(q.toLowerCase())) && !a.data.videoIds.includes(v.id)).slice(0, 80)
      .map(v => `<button class="item clickable" style="width:100%;border:0;text-align:left" data-pick="${esc(v.id)}">${chip(subs[v.data.subjectId])}<span class="body"><span class="title">${esc(v.data.title)}</span><span class="sub">${esc(v.data.channel || '')}${v.data.durationSec ? ' · ' + fmtClock(v.data.durationSec) : ''}${watched(ctx.store, v.id) ? ' · assistida' : ''}</span></span></button>`).join('') || '<p class="muted" style="padding:12px">Nenhuma aula encontrada.</p>';
    const d = openDialog(`<h2>Adicionar aula</h2><div class="filters" style="margin-top:10px"><select id="pk-s" aria-label="Matéria"><option value="">Todas as matérias</option>${subjectsOf(ctx.store, a.planId).map(s => `<option value="${esc(s.id)}" ${s.id === a.data.subjectId ? 'selected' : ''}>${esc(s.data.name)}</option>`).join('')}</select><input id="pk-q" type="search" placeholder="Buscar aula" aria-label="Buscar aula"></div><div class="list" id="pk-l" style="max-height:50dvh;overflow:auto">${list(a.data.subjectId, '')}</div><div class="dialog-actions"><button class="btn" data-close>Fechar</button></div>`, { wide: true, label: 'Adicionar aula' });
    const upd = () => { d.el.querySelector('#pk-l').innerHTML = list(d.el.querySelector('#pk-s').value, d.el.querySelector('#pk-q').value); };
    d.el.querySelector('#pk-s').onchange = upd; d.el.querySelector('#pk-q').oninput = upd;
    d.el.addEventListener('click', async (ev) => { const b = ev.target.closest('[data-pick]'); if (!b) return; const cur = ctx.store.get(a.id); await ctx.store.patch(a.id, { videoIds: [...cur.data.videoIds, b.dataset.pick] }); d.close(); toast('Aula adicionada.'); });
  },
  async 't-start'(el, e, ctx) {
    const a = act(ctx); if (activeSession(ctx.store, a.planId)) return;
    const min = +document.getElementById('t-min').value || 25;
    await ctx.store.put('session', rid('ses_'), a.planId, sessionStart(a.id, min * 60, ctx.store.deviceId));
    if (a.data.status === 'todo') await ctx.store.patch(a.id, { status: 'doing' });
  },
  async 't-pause'(el, e, ctx) { const s = activeSession(ctx.store, act(ctx).planId); if (s) await ctx.store.put('session', s.id, s.planId, sessionPause(s.data)); },
  async 't-resume'(el, e, ctx) { const s = activeSession(ctx.store, act(ctx).planId); if (s) await ctx.store.put('session', s.id, s.planId, sessionResume(s.data)); },
  async 't-stop'(el, e, ctx) {
    const s = activeSession(ctx.store, act(ctx).planId); if (!s) return;
    const el2 = sessionElapsed(s);
    await ctx.store.put('session', s.id, s.planId, sessionStop(s.data));
    toast(`Foco registrado: ${fmtDur(el2)}.`, { icon: 'timer' });
  },
  async 'quiz-new'(el, e, ctx) {
    const a = act(ctx), sub = subjectMap(ctx.store, a.planId)[a.data.subjectId], key = 'quiz:' + a.id;
    if (S.aiBusy[key]) return;
    S.aiBusy[key] = true; S.aiErr[key] = null; ctx.render();
    const math = /matem/i.test(sub ? sub.data.name : '') && ctx.profile?.data.ai?.mathAdvanced !== false;
    try {
      const r = await ctx.ai.ask('quiz', prompts.quiz(sub ? sub.data.name : '', a.data.title), { level: math ? 'adv' : 'basic', json: true, check: (v) => validQuestions(v).length >= 5 });
      const items = validQuestions(r.value); const setId = rid('qs_'), now = Date.now(); const qids = [];
      for (const it of items) { const qid = rid('q_'); qids.push(qid); await ctx.store.put('question', qid, a.planId, { subjectId: a.data.subjectId, topic: a.data.title, stem: it.stem, options: it.options, answer: it.answer, explanation: it.explanation, source: { type: 'ia', provider: r.byName, activityId: a.id, createdOn: today() } }); }
      await ctx.store.put('quizSet', setId, a.planId, { activityId: a.id, questionIds: qids, provider: r.byName, createdOn: today(), createdAt: now });
      S.aiBusy[key] = false; ctx.render(); openQuiz(ctx, setId);
    } catch (err) { S.aiErr[key] = aiMessage(err); S.aiBusy[key] = false; ctx.render(); }
  },
  'quiz-open'(el, e, ctx) { openQuiz(ctx, el.dataset.set); },
  async 'doubt-ask'(el, e, ctx) {
    const a = act(ctx), sub = subjectMap(ctx.store, a.planId)[a.data.subjectId], key = 'doubt:' + a.id;
    const q = (document.getElementById('dv-q').value || '').trim(); S.draft = document.getElementById('dv-q').value;
    if (!q) { S.aiErr[key] = 'Escreva a dúvida primeiro.'; ctx.render(); return; }
    const level = S.doubtLevel === 'auto' ? (isAdvanced(q, sub && sub.data.name) ? 'adv' : 'basic') : S.doubtLevel;
    S.aiBusy[key] = true; S.aiErr[key] = null; ctx.render();
    try {
      const r = await ctx.ai.ask('doubt', prompts.doubt(sub ? sub.data.name : '', a.data.title, q), { level, check: t => typeof t === 'string' && t.trim().length > 10 });
      await ctx.store.put('doubt', rid('dbt_'), a.planId, { activityId: a.id, question: q, answer: r.text + (r.truncated ? '\n(resposta cortada)' : ''), by: r.byName, level, date: today(), at: Date.now(), fallback: level === 'adv' && r.by !== 'claude' });
      S.draft = '';
    } catch (err) { S.aiErr[key] = aiMessage(err); }
    S.aiBusy[key] = false; ctx.render();
  },
  'doubt-claude'(el, e, ctx) {
    const a = act(ctx), sub = subjectMap(ctx.store, a.planId)[a.data.subjectId];
    const q = (document.getElementById('dv-q').value || '').trim();
    let p = q ? prompts.doubt(sub ? sub.data.name : '', a.data.title, q) : `Estudo para concurso. Matéria: ${sub ? sub.data.name : ''}. Tema: ${a.data.title}. Minha dúvida: `;
    if (p.length > 1800) p = p.slice(0, 1800);
    el.href = 'https://claude.ai/new?q=' + encodeURIComponent(p);
  },
  'doubt-del'(el, e, ctx) { ctx.softDelete(el.dataset.id, 'Dúvida'); },
  'doubt-all'(el, e, ctx) { S.showAllDoubts = !S.showAllDoubts; ctx.render(); },
  async summarize(el, e, ctx) {
    const a = act(ctx), sub = subjectMap(ctx.store, a.planId)[a.data.subjectId], key = 'sum:' + a.id;
    const parts = [];
    for (const v of a.data.videoIds || []) { const n = ctx.store.get('note_' + v), vv = ctx.store.get(v); if (n && n.data.text && n.data.text.trim()) parts.push('### ' + (vv ? vv.data.title : 'Aula') + '\n' + n.data.text.trim()); }
    if ((a.data.note || '').trim()) parts.push('### Anotações gerais\n' + a.data.note.trim());
    if (!parts.length) return;
    S.aiBusy[key] = true; S.aiErr[key] = null; ctx.render();
    try { const r = await ctx.ai.ask('summary', prompts.summary(sub ? sub.data.name : '', a.data.title, parts.join('\n\n')), { level: 'basic', check: t => t.trim().length > 20 }); await ctx.store.patch(a.id, { summary: r.text + (r.truncated ? '\n(texto cortado: resuma menos aulas por vez)' : '') }); }
    catch (err) { S.aiErr[key] = aiMessage(err); }
    S.aiBusy[key] = false; ctx.render();
  },
  async 'ver-use'(el, e, ctx) {
    const v = ctx.store.get(el.dataset.id); if (!v) return;
    const target = ctx.store.get(v.data.targetId);
    if (target) {
      const current = target.data[v.data.field] || '';
      await ctx.store.patch(target.id, { [v.data.field]: v.data.text });
      if (current.trim()) await ctx.store.patch(v.id, { text: current, at: Date.now(), reason: 'trocada' }); else await ctx.store.remove(v.id);
      toast('Versão aplicada. O texto anterior ficou guardado no lugar dela.');
    }
  },
  async 'ver-drop'(el, e, ctx) { ctx.softDelete(el.dataset.id, 'Versão'); },
  async delete(el, e, ctx) {
    const a = act(ctx);
    if (!(await confirmDialog({ title: 'Excluir esta atividade?', text: 'As aulas continuam na biblioteca. Anotações e registro deste dia serão excluídos.', ok: 'Excluir', danger: true }))) return;
    ctx.softDelete(a.id, 'Atividade'); ctx.go('agenda');
  },
};

export const inputs = {
  title: (el, e, ctx) => saver(ctx, 'title:' + ctx.route.arg, (id, v) => ctx.store.patch(id, { title: v }, { origin: 'input' }))(ctx.route.arg, el.value),
  note: (el, e, ctx) => saver(ctx, 'note:' + ctx.route.arg, (id, v) => ctx.store.patch(id, { note: v }, { origin: 'input' }))(ctx.route.arg, el.value),
  summary: (el, e, ctx) => saver(ctx, 'sum:' + ctx.route.arg, (id, v) => ctx.store.patch(id, { summary: v }, { origin: 'input' }))(ctx.route.arg, el.value),
  num: (el, e, ctx) => saver(ctx, 'n:' + el.dataset.f + ctx.route.arg, (id, f, v) => ctx.store.patch(id, { [f]: v === '' ? null : Math.max(0, +v || 0) }, { origin: 'input' }))(ctx.route.arg, el.dataset.f, el.value),
  custom: (el, e, ctx) => saver(ctx, 'cf:' + el.dataset.cf + ctx.route.arg, (id, cf, v) => { const a = ctx.store.get(id); if (a) ctx.store.patch(id, { custom: { ...(a.data.custom || {}), [cf]: v } }, { origin: 'input' }); })(ctx.route.arg, el.dataset.cf, el.value),
  vnote: (el, e, ctx) => saver(ctx, 'vn:' + el.dataset.vid, async (vid, v) => {
    const id = 'note_' + vid; const cur = ctx.store.getRaw(id);
    if (cur && !cur.deleted) await ctx.store.patch(id, { text: v }, { origin: 'input' });
    else if (!cur) await ctx.store.put('note', id, ctx.planId, { target: vid, targetKind: 'video', text: v }, { origin: 'input' });
  })(el.dataset.vid, el.value),
};
export const changes = {
  dvlevel: (el) => { S.doubtLevel = el.value; },
  date: async (el, e, ctx) => { if (isCivilDate(el.value)) { await ctx.store.patch(ctx.route.arg, { date: el.value }); toast('Atividade movida para ' + fmtShort(el.value) + '.'); } },
  subject: async (el, e, ctx) => { await ctx.store.patch(ctx.route.arg, { subjectId: el.value }); },
};

/* ---------- relógio na tela e término automático ---------- */
let tick = null;
export function after(ctx) {
  clearInterval(tick);
  const a = act(ctx); if (!a) return;
  tick = setInterval(() => {
    const clock = document.getElementById('clock'); if (!clock) { clearInterval(tick); return; }
    const s = activeSession(ctx.store, a.planId); if (!s || s.data.activityId !== a.id) return;
    const el = sessionElapsed(s), left = Math.max(0, s.data.plannedSec - el);
    clock.textContent = fmtClock(left);
    const ring = document.getElementById('ring'); if (ring) ring.style.setProperty('--p', Math.min(1, el / s.data.plannedSec).toFixed(3));
  }, 1000);
}
/** Chamado periodicamente pelo app: encerra sessões cujo tempo terminou (mesmo que o app tenha ficado fechado). */
export async function checkSessions(ctx) {
  if (!ctx.store || !ctx.planId) return;
  const s = activeSession(ctx.store, ctx.planId); if (!s) return;
  const fin = sessionAutoFinish(s.data); if (!fin) return;
  await ctx.store.put('session', s.id, s.planId, fin);
  if (document.visibilityState === 'visible') {
    if (ctx.prefs().sound) chime();
    toast(`Foco de ${fmtDur(s.data.plannedSec)} concluído. Faça uma pausa curta.`, { icon: 'timer', ms: 7000 });
  }
}
