// Progresso: avanço geral e raio-x por matéria, com pesos e a fonte deles sinalizada.
import { icon, esc, chip, bar, empty, toast } from '../ui/dom.js';
import { fmtDur, pct } from '../core/util.js';
import { progress, raioX, FEW_ANSWERS } from '../domain/study.js';

export function render(ctx) {
  const P = ctx.planId, plan = ctx.plan; if (!plan) return empty('chart-column', 'Nenhum plano', 'Crie um plano primeiro.');
  const pr = progress(ctx.store, P), rx = raioX(ctx.store, P);
  const ws = plan.data.weightsSource || { status: 'pendente', label: 'Não informado' };
  let h = `<header class="page-head"><h1>Progresso</h1><p class="muted">Como cada parte do plano está andando. Os números contam só o que foi registrado.</p></header>
  <div class="stats3">
    <div class="stat"><span class="v">${pct(pr.done, pr.total)}%</span><span class="l">do plano concluído (${pr.done} de ${pr.total} atividades)</span>${bar(pr.total ? pr.done / pr.total : 0, 'thin', 'p-done')}</div>
    <div class="stat"><span class="v">${fmtDur(pr.focusSec)}</span><span class="l">de foco cronometrado · ${fmtDur(pr.watchedSec)} de aulas assistidas</span></div>
    <div class="stat"><span class="v">${rx.estimate == null ? '—' : Math.round(100 * rx.estimate) + '%'}</span><span class="l">${rx.estimate == null ? `acerto estimado: precisa de ${FEW_ANSWERS} questões numa matéria` : `acerto estimado, ponderado pelos pesos (cobre ${Math.round(100 * rx.coverage)}% do peso)`}</span></div>
  </div>`;
  if (rx.focus.length) h += `<div class="notice info" style="margin-top:14px">${icon('target')}<div><b>Onde focar primeiro:</b> ${rx.focus.map((r, i) => `${i + 1}. ${esc(r.s.data.name)} (${Math.round(100 * r.pct)}% de acerto, peso ${String(r.weight).replace('.', ',')})`).join(' · ')}<div class="small muted">Matérias com mais peso e menos acerto, entre as que têm pelo menos ${FEW_ANSWERS} questões.</div></div></div>`;
  h += `<div class="section-title"><h2>Por matéria</h2></div>
  <div class="notice ${ws.status === 'oficial' ? 'ok' : 'warn'}" style="margin-bottom:12px">${icon(ws.status === 'oficial' ? 'shield-check' : 'scale')}<div class="grow"><b>Pesos: ${esc(ws.label || '')}</b> <span class="tag ${ws.status === 'oficial' ? 'ok' : 'warn'}">${ws.status === 'oficial' ? 'confirmado no edital' : ws.status === 'estimado' ? 'estimado' : 'pendente'}</span>
    <div class="small">${ws.status === 'oficial' ? 'Conferido no edital informado.' : 'Não são oficiais. Quando o edital sair, ajuste os pesos abaixo e marque como confirmado.'}</div>
    <div class="row" style="margin-top:8px"><label class="sr-only" for="ws-l">Fonte dos pesos</label><input id="ws-l" type="text" style="max-width:320px" value="${esc(ws.label || '')}" data-change="wsLabel" placeholder="Ex.: Edital BB 2026, item 9.1">
    ${ws.status === 'oficial' ? '<button class="btn sm" data-act="ws" data-v="estimado">Marcar como estimado</button>' : '<button class="btn sm" data-act="ws" data-v="oficial">Confirmar como oficial</button>'}</div></div></div>`;
  h += '<div class="list">' + rx.rows.map(r => {
    const tone = r.pct == null ? '' : r.pct >= .7 ? '' : r.pct >= .5 ? 'warn' : 'bad';
    return `<div class="item" style="align-items:flex-start;flex-wrap:wrap">
      <div class="body" style="min-width:180px">${chip(r.s)}<span class="sub" style="margin-top:4px">${r.done} de ${r.days} atividades · ${r.videosWatched} de ${r.videos} aulas · ${fmtDur(r.focus)} de foco · ${r.errors} no caderno</span></div>
      <div style="min-width:150px;flex:1">${r.q ? `<div class="row" style="justify-content:space-between"><b class="tabular">${Math.round(100 * r.pct)}%</b><span class="small muted">${r.c} de ${r.q}${r.few ? ' · <span class="tag warn">poucas respostas</span>' : ''}</span></div>${bar(r.pct, tone, 'rx-' + r.s.id)}` : '<span class="small muted">Sem questões ainda</span>'}</div>
      <div class="field" style="width:96px"><label class="f" for="w-${esc(r.s.id)}">Peso (%)</label><input id="w-${esc(r.s.id)}" type="number" min="0" max="100" step="0.5" inputmode="decimal" value="${r.weight ?? ''}" data-change="weight" data-id="${esc(r.s.id)}"></div></div>`;
  }).join('') + '</div><p class="hint" style="margin-top:8px">Acerto soma as questões que você registrou nas atividades e as respondidas no sistema. Com menos de ' + FEW_ANSWERS + ' respostas, o número ainda diz pouco.</p>';
  return h;
}

export const actions = {
  async ws(el, e, ctx) {
    const plan = ctx.plan; const ws = { ...(plan.data.weightsSource || {}), status: el.dataset.v, checkedOn: new Date().toISOString().slice(0, 10) };
    await ctx.store.patch(plan.id, { weightsSource: ws });
    for (const s of ctx.store.list('subject', { planId: ctx.planId })) if (s.data.weight != null) await ctx.store.patch(s.id, { weightStatus: el.dataset.v === 'oficial' ? 'oficial' : 'estimado' });
    toast(el.dataset.v === 'oficial' ? 'Pesos marcados como confirmados no edital.' : 'Pesos marcados como estimados.');
  },
};
export const changes = {
  async weight(el, e, ctx) { const v = el.value === '' ? null : Math.max(0, Math.min(100, +el.value)); await ctx.store.patch(el.dataset.id, { weight: v, weightStatus: 'editado' }); },
  async wsLabel(el, e, ctx) { const plan = ctx.plan; await ctx.store.patch(plan.id, { weightsSource: { ...(plan.data.weightsSource || {}), label: el.value.trim() } }); },
};
