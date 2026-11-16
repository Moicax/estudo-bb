// Hoje: o que estudar, qual a próxima ação, como estou avançando.
import { icon, esc, chip, bar, empty, aiUsageLine } from '../ui/dom.js';
import { today, fmtLong, fmtShort, fmtDur, DIAS, weekday, pct } from '../core/util.js';
import { todayPlan, dueReviews, progress, subjectMap, weekOf, planWeeks, isRest, activeSession, sessionElapsed } from '../domain/study.js';

function hello(name) {
  const h = new Date().getHours();
  const g = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  return name ? `${g}, ${esc(name.split(' ')[0])}` : g;
}
function lessonMeta(ctx, a) {
  const vids = (a.data.videoIds || []).map(id => ctx.store.get(id)).filter(Boolean);
  const sec = vids.reduce((n, v) => n + (v.data.durationSec || 0), 0);
  const sp = +ctx.prefs().videoSpeed || 1;
  if (!vids.length) return `<span>${icon('book-open', 'sm')}Sem aulas marcadas</span>`;
  return `<span>${icon('circle-play', 'sm')}${vids.length} ${vids.length === 1 ? 'aula' : 'aulas'} · ${fmtDur(sec)}${sp !== 1 ? ` (${fmtDur(sec / sp)} a ${String(sp).replace('.', ',')}x)` : ''}</span>`;
}

export function render(ctx) {
  const P = ctx.planId, plan = ctx.plan, t = today();
  if (!plan) return empty('calendar-days', 'Nenhum plano ainda', 'Crie um plano para ver o que estudar.', '<button class="btn primary" data-act="go" data-to="boas-vindas">Criar plano</button>');
  const subs = subjectMap(ctx.store, P);
  const tp = todayPlan(ctx.store, P, t);
  const wk = weekOf(plan, t), weeks = planWeeks(ctx.store, P);
  const name = ctx.profile && ctx.profile.data.name;
  const sess = activeSession(ctx.store, P);
  let h = `<header class="page-head"><p class="eyebrow">${esc(fmtLong(t))}${wk && wk <= weeks ? ` · semana ${wk} de ${weeks}` : ''}</p><h1>${hello(name)}</h1></header>`;

  // próxima ação
  let hero;
  const doing = tp.todayOpen.find(a => a.data.status === 'doing') || tp.todayOpen[0];
  if (sess) {
    const a = ctx.store.get(sess.data.activityId);
    hero = `<section class="hero" aria-labelledby="hero-t"><div class="row">${a ? chip(subs[a.data.subjectId]) : ''}<span class="tag ${sess.data.state === 'running' ? 'ok' : 'warn'}">${icon('timer', 'sm')}${sess.data.state === 'running' ? 'Foco em andamento' : 'Foco pausado'}</span></div>
      <h2 id="hero-t">${esc(a ? a.data.title : 'Sessão de estudo')}</h2><div class="meta"><span>${icon('timer', 'sm')}${fmtDur(sessionElapsed(sess))} de ${fmtDur(sess.data.plannedSec)}</span></div>
      <div class="actions"><button class="btn primary lg" data-act="go" data-to="estudo" data-arg="${esc(sess.data.activityId)}">${icon('play')}Voltar ao estudo</button></div></section>`;
  } else if (doing) {
    const a = doing, started = a.data.status === 'doing';
    hero = `<section class="hero" aria-labelledby="hero-t"><div class="row">${chip(subs[a.data.subjectId])}<span class="muted small">${a.data.date === t ? 'Hoje' : fmtShort(a.data.date)}</span>${tp.todayOpen.length > 1 ? `<span class="tag">+${tp.todayOpen.length - 1} hoje</span>` : ''}</div>
      <h2 id="hero-t">${esc(a.data.title || 'Atividade')}</h2><div class="meta">${lessonMeta(ctx, a)}</div>
      <div class="actions"><button class="btn primary lg" data-act="go" data-to="estudo" data-arg="${esc(a.id)}">${icon('play')}${started ? 'Continuar estudo' : 'Começar estudo'}</button>
      <button class="btn lg" data-act="toggle-done" data-id="${esc(a.id)}">${icon('check')}Marcar como concluída</button></div></section>`;
  } else {
    const n = tp.nextUpcoming;
    const title = tp.restToday ? 'Hoje é dia de folga' : tp.todays.length ? 'Atividade de hoje concluída' : 'Nada marcado para hoje';
    const msg = tp.restToday ? 'Descansar também faz parte do plano.' : tp.todays.length ? 'Bom trabalho. Se quiser adiantar, a próxima já está aqui.' : 'Aproveite para revisar ou adiantar a próxima atividade.';
    hero = `<section class="hero" aria-labelledby="hero-t"><div class="row"><span class="tag ok">${icon(tp.restToday ? 'moon' : 'circle-check', 'sm')}${tp.restToday ? 'Folga' : 'Em dia'}</span></div>
      <h2 id="hero-t">${title}</h2><p class="muted">${msg}</p>
      ${n ? `<div class="card flat" style="margin-top:14px;background:var(--surface-2)"><div class="row">${chip(subs[n.data.subjectId])}<span class="small muted">${DIAS[weekday(n.data.date)]} ${fmtShort(n.data.date)}</span></div><p style="margin-top:6px;font-weight:650">${esc(n.data.title)}</p>
      <div class="actions" style="margin-top:10px"><button class="btn soft" data-act="go" data-to="estudo" data-arg="${esc(n.id)}">${icon('play')}Adiantar esta atividade</button></div></div>` : ''}</section>`;
  }
  h += hero;

  // revisões
  const rv = dueReviews(ctx.store, P, t).filter(x => !ctx.hiddenIds.has(x.id));
  if (rv.length) {
    h += `<div class="section-title"><h2>Revisões de hoje <span class="tag">${rv.length}</span></h2><span class="small muted">Releia o resumo e refaça 3 a 5 questões</span></div><div class="list">`;
    h += rv.slice(0, 6).map(x => `<div class="item"><button class="done-btn" data-act="review-done" data-id="${esc(x.id)}" data-step="${x.step}" data-flash="rv:${esc(x.id)}" aria-pressed="false" aria-label="Marcar revisão de ${x.step} dias como feita: ${esc(x.title)}">${icon('check')}</button>
      <div class="body"><span class="title">${esc(x.title)}</span><span class="sub">${chip(subs[x.subjectId])}<span>${x.kind === 'error' ? 'Caderno de erros' : 'Atividade'} · revisão de ${x.step} ${x.step === 1 ? 'dia' : 'dias'}${x.due < t ? ' · desde ' + fmtShort(x.due) : ''}</span></span></div>
      ${x.kind === 'activity' ? `<button class="btn ghost sm icon" data-act="go" data-to="estudo" data-arg="${esc(x.id)}" aria-label="Abrir atividade">${icon('chevron-right')}</button>` : `<button class="btn ghost sm icon" data-act="go" data-to="erros" aria-label="Abrir caderno de erros">${icon('chevron-right')}</button>`}</div>`).join('');
    h += '</div>' + (rv.length > 6 ? `<p class="small muted" style="margin-top:8px">E mais ${rv.length - 6}. Marque as de cima e as próximas aparecem.</p>` : '');
  }

  // pendências, sem culpa
  if (tp.overdue.length) {
    h += `<div class="notice" style="margin-top:18px">${icon('list-checks')}<div>${tp.overdue.length === 1 ? 'Ficou <b>1</b> atividade' : `Ficaram <b>${tp.overdue.length}</b> atividades`} de dias anteriores. Faça quando der, no seu ritmo. <a href="#agenda" data-act="go" data-to="agenda" data-arg="abertas">Ver na Agenda</a></div></div>`;
  }

  // avanço
  const pr = progress(ctx.store, P);
  const acc = pr.questions ? pr.correct / pr.questions : null;
  h += `<div class="section-title"><h2>Seu avanço</h2><a class="small" href="#progresso">Ver detalhes</a></div><div class="stats3">
    <div class="stat"><span class="v">${pr.done}<span class="muted" style="font-size:.9rem;font-weight:600"> / ${pr.total}</span></span><span class="l">atividades concluídas</span>${bar(pr.total ? pr.done / pr.total : 0, 'thin', 't-done')}</div>
    <div class="stat"><span class="v">${pr.videosWatched}<span class="muted" style="font-size:.9rem;font-weight:600"> / ${pr.videosTotal}</span></span><span class="l">aulas assistidas · ${fmtDur(pr.watchedSec)}</span>${bar(pr.videosTotal ? pr.videosWatched / pr.videosTotal : 0, 'thin', 't-vid')}</div>
    <div class="stat"><span class="v">${acc == null ? '—' : pct(pr.correct, pr.questions) + '%'}</span><span class="l">${pr.questions ? `de acerto em ${pr.questions} questões${pr.questions < 30 ? ' · <span class="tag warn">poucas respostas</span>' : ''}` : 'faça questões para medir o acerto'}</span>${acc == null ? '' : bar(acc, 'thin ' + (acc < .5 ? 'bad' : acc < .7 ? 'warn' : ''), 't-acc')}</div>
  </div>`;
  h += `<p class="ai-usage small muted">${aiUsageLine(ctx.ai)}</p>`;
  return h;
}
