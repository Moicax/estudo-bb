// Agenda: o cronograma como lista por semana, confortável no celular.
import { icon, esc, chip, empty, openDialog, toast, bar } from '../ui/dom.js';
import { today, fmtShort, DIAS, weekday, addDays, isCivilDate, rid } from '../core/util.js';
import { activitiesOf, subjectMap, subjectsOf, weekOf, isRest } from '../domain/study.js';

const F = { mode: 'todas', subject: '', q: '' };

export function render(ctx) {
  const P = ctx.planId, plan = ctx.plan, t = today();
  if (ctx.route.arg === 'abertas') { F.mode = 'abertas'; ctx.route.arg = null; history.replaceState(null, '', '#agenda'); }
  if (!plan) return empty('calendar-days', 'Nenhum plano', 'Crie um plano para montar a agenda.');
  const subs = subjectMap(ctx.store, P);
  let acts = activitiesOf(ctx.store, P).filter(a => !ctx.hiddenIds.has(a.id));
  const total = acts.length;
  if (F.mode === 'abertas') acts = acts.filter(a => a.data.status !== 'done' && !isRest(subs[a.data.subjectId]));
  if (F.mode === 'semana') { const w = weekOf(plan, t); acts = acts.filter(a => weekOf(plan, a.data.date) === w); }
  if (F.subject) acts = acts.filter(a => a.data.subjectId === F.subject);
  if (F.q) { const q = F.q.toLowerCase(); acts = acts.filter(a => ((a.data.title || '') + ' ' + (a.data.note || '')).toLowerCase().includes(q)); }

  let h = `<header class="page-head"><div class="row"><h1>Agenda</h1><button class="btn primary sm" data-act="add">${icon('plus', 'sm')}Nova atividade</button></div>
    <p class="muted">${total} atividades no plano. Toque numa para estudar; no círculo, marque como concluída.</p></header>
    <div class="filters"><div class="seg" role="group" aria-label="Mostrar">${[['todas', 'Todas'], ['semana', 'Esta semana'], ['abertas', 'Em aberto']].map(([v, l]) => `<button data-act="mode" data-v="${v}" aria-pressed="${F.mode === v}">${l}</button>`).join('')}</div>
    <select aria-label="Matéria" data-change="subject"><option value="">Todas as matérias</option>${subjectsOf(ctx.store, P).map(s => `<option value="${esc(s.id)}" ${F.subject === s.id ? 'selected' : ''}>${esc(s.data.name)}</option>`).join('')}</select>
    <input id="ag-q" type="search" placeholder="Buscar tema ou anotação" aria-label="Buscar" value="${esc(F.q)}" data-input="q"></div>`;
  if (!acts.length) return h + empty(F.mode === 'abertas' ? 'circle-check' : 'search', F.mode === 'abertas' ? 'Nada em aberto' : 'Nenhuma atividade encontrada', F.mode === 'abertas' ? 'Tudo o que estava marcado foi concluído.' : 'Tente outro filtro ou crie uma atividade.');

  const groups = new Map();
  for (const a of acts) { const w = weekOf(plan, a.data.date) || 0; if (!groups.has(w)) groups.set(w, []); groups.get(w).push(a); }
  const curW = weekOf(plan, t);
  for (const [w, list] of groups) {
    const first = list[0].data.date, last = list[list.length - 1].data.date;
    const real = list.filter(a => !isRest(subs[a.data.subjectId])), done = real.filter(a => a.data.status === 'done').length;
    const light = (plan.data.lightWeeks || []).includes(w);
    h += `<div class="week-head" ${w === curW ? 'id="semana-atual"' : ''}><h3>${w === 0 ? 'Antes do início' : 'Semana ' + w}${light ? ' <span class="tag">leve</span>' : ''}${w === curW ? ' <span class="tag ok">atual</span>' : ''}</h3>
      <span class="small muted">${fmtShort(first)} a ${fmtShort(last)} · ${done} de ${real.length}</span></div>
      <div style="margin:-2px 2px 8px">${bar(real.length ? done / real.length : 0, 'thin', 'wk' + w)}</div><div class="list">`;
    for (const a of list) {
      const s = subs[a.data.subjectId], rest = isRest(s), isDone = a.data.status === 'done', nv = (a.data.videoIds || []).length;
      h += `<div class="item clickable agenda-item ${isDone ? 'done' : ''}">
        <div class="date-block ${a.data.date === t ? 'today' : ''}"><b>${a.data.date.slice(8)}</b><span>${DIAS[weekday(a.data.date)]}</span></div>
        <div class="body"><a class="title clamp2" data-act="open" href="#estudo/${esc(encodeURIComponent(a.id))}">${esc(a.data.title || '(sem tema)')}</a><span class="sub">${chip(s)}${nv ? `<span>${icon('circle-play', 'sm')} ${nv}</span>` : ''}${a.data.note ? `<span title="Tem anotações">${icon('pencil', 'sm')}</span>` : ''}${a.data.status === 'doing' ? '<span class="tag info">Estudando</span>' : ''}${!isDone && !rest && a.data.date < t ? '<span class="tag">em aberto</span>' : ''}</span></div>
        ${rest ? `<span class="tag">${icon('moon', 'sm')}Folga</span>` : `<button class="done-btn" data-act="toggle-done" data-id="${esc(a.id)}" aria-pressed="${isDone}" data-flash="done:${esc(a.id)}" aria-label="${isDone ? 'Desmarcar' : 'Concluir'}: ${esc(a.data.title)}">${icon('check')}</button>`}</div>`;
    }
    h += '</div>';
  }
  return h;
}

let scrolledOnce = false;
export function after(ctx, view) {
  if (!scrolledOnce && F.mode === 'todas' && !F.q && !F.subject) { const el = view.querySelector('#semana-atual'); if (el) { scrolledOnce = true; requestAnimationFrame(() => el.scrollIntoView({ block: 'start' })); } }
}

export const actions = {
  mode(el, e, ctx) { F.mode = el.dataset.v; ctx.render(); },
  add(el, e, ctx) {
    const P = ctx.planId, subs = subjectsOf(ctx.store, P);
    const d = openDialog(`<h2>Nova atividade</h2><form class="stack" style="margin-top:12px" id="na-f">
      <div class="grid2"><div class="field"><label class="f" for="na-d">Data</label><input id="na-d" type="date" value="${today()}" required></div>
      <div class="field"><label class="f" for="na-s">Matéria</label><select id="na-s">${subs.map(s => `<option value="${esc(s.id)}">${esc(s.data.name)}</option>`).join('')}</select></div></div>
      <div class="field"><label class="f" for="na-t">Tema</label><input id="na-t" type="text" required placeholder="Ex.: Juros compostos"></div>
      <div class="dialog-actions"><button type="button" class="btn" data-close>Cancelar</button><button class="btn primary" type="submit">${icon('plus')}Adicionar</button></div></form>`, { label: 'Nova atividade' });
    d.el.querySelector('#na-f').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const date = d.el.querySelector('#na-d').value, title = d.el.querySelector('#na-t').value.trim();
      if (!isCivilDate(date) || !title) { (title ? d.el.querySelector('#na-d') : d.el.querySelector('#na-t')).setAttribute('aria-invalid', 'true'); return; }
      const id = rid('act_');
      await ctx.store.put('activity', id, P, { date, subjectId: d.el.querySelector('#na-s').value || null, title, videoIds: [], status: 'todo', doneAt: null, reviews: [], note: '', summary: '', questions: null, correct: null, difficulty: null, custom: {}, pinned: false });
      d.close(); toast('Atividade criada para ' + fmtShort(date) + '.', { action: 'Abrir', onAction: () => ctx.go('estudo', id) });
    });
  },
};
export const inputs = { q: (el, e, ctx) => { F.q = el.value; clearTimeout(F.t); F.t = setTimeout(() => { ctx.render(true); }, 250); } };
export const changes = { subject: (el, e, ctx) => { F.subject = el.value; ctx.render(); } };
export { addDays };
