// Caderno de erros: o que errei, por quê, a regra certa, revisões e "resolver de novo" com a questão completa.
import { icon, esc, chip, empty, openDialog, toast } from '../ui/dom.js';
import { today, fmtShort, rid, isCivilDate } from '../core/util.js';
import { subjectMap, subjectsOf, REVIEW_STEPS } from '../domain/study.js';
import { ERROR_REASONS } from '../data/schema.js';

const F = { subject: '' };

export function render(ctx) {
  const P = ctx.planId; if (!P) return empty('notebook-pen', 'Nenhum plano', 'Crie um plano primeiro.');
  const subs = subjectMap(ctx.store, P);
  let list = ctx.store.list('errorEntry', { planId: P }).filter(e => !ctx.hiddenIds.has(e.id)).sort((a, b) => (b.data.date || '').localeCompare(a.data.date || '') || (b.updatedAt - a.updatedAt));
  if (F.subject) list = list.filter(e => e.data.subjectId === F.subject);
  let h = `<header class="page-head"><div class="row"><h1>Caderno de erros</h1><button class="btn primary sm" data-act="add">${icon('plus', 'sm')}Registrar erro</button></div>
    <p class="muted">Revise esta lista, não o conteúdo inteiro. Cada erro volta para revisão depois de 1, 7 e 30 dias.</p></header>
    <div class="filters"><select aria-label="Matéria" data-change="subject"><option value="">Todas as matérias</option>${subjectsOf(ctx.store, P).filter(s => s.data.role === 'subject').map(s => `<option value="${esc(s.id)}" ${F.subject === s.id ? 'selected' : ''}>${esc(s.data.name)}</option>`).join('')}</select></div>`;
  if (!list.length) return h + empty('notebook-pen', 'Nenhum erro registrado', 'Quando errar uma questão na prática com IA, ela entra aqui sozinha, com o enunciado completo. Erros de outras fontes você registra no botão acima.');
  h += '<div class="stack">' + list.map(e => {
    const q = e.data.questionId ? ctx.store.get(e.data.questionId) : null;
    const tries = q ? ctx.store.list('attempt', { planId: P }).filter(a => a.data.questionId === q.id) : [];
    return `<article class="card"><div class="row" style="justify-content:space-between"><div class="row tight">${chip(subs[e.data.subjectId])}<span class="small muted">${fmtShort(e.data.date)}</span><span class="tag">${esc(e.data.reason)}</span></div>
      <div class="row tight">${q ? `<button class="btn sm soft" data-act="redo" data-id="${esc(e.id)}">${icon('rotate-ccw', 'sm')}Resolver de novo</button>` : ''}<button class="btn sm ghost icon" data-act="edit" data-id="${esc(e.id)}" aria-label="Editar">${icon('pencil', 'sm')}</button><button class="btn sm ghost icon" data-act="del" data-id="${esc(e.id)}" aria-label="Excluir">${icon('trash-2', 'sm')}</button></div></div>
      <h3 style="margin-top:8px">${esc(e.data.topic || 'Sem tema')}</h3>
      ${q ? `<p class="small muted clamp2" style="margin-bottom:4px">${esc(q.data.stem)}</p>` : ''}
      ${e.data.rule ? `<div class="answer" style="margin-top:4px"><b>Regra certa:</b> ${esc(e.data.rule)}</div>` : ''}
      <div class="row" style="margin-top:10px"><span class="small muted">Revisões:</span>${REVIEW_STEPS.map(n => `<label class="check" style="min-height:32px"><input type="checkbox" data-change="rev" data-id="${esc(e.id)}" data-n="${n}" ${(e.data.reviews || []).includes(n) ? 'checked' : ''}> ${n} ${n === 1 ? 'dia' : 'dias'}</label>`).join('')}
      ${tries.length ? `<span class="small muted">· ${tries.length} ${tries.length === 1 ? 'tentativa' : 'tentativas'}, ${tries.filter(t => t.data.correct).length} certas</span>` : ''}</div></article>`;
  }).join('') + '</div>';
  return h;
}

function form(ctx, e) {
  const P = ctx.planId, d = e ? e.data : { date: today(), subjectId: '', topic: '', reason: ERROR_REASONS[0], rule: '' };
  return `<h2>${e ? 'Editar erro' : 'Registrar erro'}</h2><form class="stack" id="er-f" style="margin-top:12px" novalidate>
    <div class="grid2"><div class="field"><label class="f" for="er-d">Data</label><input id="er-d" type="date" value="${esc(d.date)}"></div>
    <div class="field"><label class="f" for="er-s">Matéria</label><select id="er-s">${subjectsOf(ctx.store, P).filter(s => s.data.role === 'subject').map(s => `<option value="${esc(s.id)}" ${s.id === d.subjectId ? 'selected' : ''}>${esc(s.data.name)}</option>`).join('')}</select></div></div>
    <div class="field"><label class="f" for="er-t">Tema</label><input id="er-t" type="text" value="${esc(d.topic)}" placeholder="Ex.: Crase antes de horas"></div>
    <div class="field"><label class="f" for="er-r">Por que errei</label><select id="er-r">${ERROR_REASONS.map(r => `<option ${r === d.reason ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></div>
    <div class="field"><label class="f" for="er-g">Regra certa</label><textarea id="er-g" placeholder="O que eu preciso lembrar da próxima vez">${esc(d.rule)}</textarea></div>
    <div class="dialog-actions"><button type="button" class="btn" data-close>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></form>`;
}

let R = null;
function paintRedo(ctx) {
  const q = R.q, L = 'ABCDE', ans = R.ans, done = ans != null;
  R.d.set(`<div class="row" style="justify-content:space-between"><span class="eyebrow">Resolver de novo</span><button class="btn sm ghost icon" data-close aria-label="Fechar">${icon('x')}</button></div>
    <p style="margin:10px 0 14px;white-space:pre-wrap;font-size:1.02rem">${esc(q.data.stem)}</p>
    <div class="stack" style="gap:8px">${q.data.options.map((o, k) => `<button class="opt ${done ? (k === q.data.answer ? 'right' : k === ans ? 'wrong' : '') : ''}" data-k="${k}" ${done ? 'disabled' : ''}><b>${L[k]})</b><span>${esc(o)}</span></button>`).join('')}</div>
    ${done ? `<div class="notice ${ans === q.data.answer ? 'ok' : 'bad'}" style="margin-top:12px">${icon(ans === q.data.answer ? 'circle-check' : 'info')}<div><b>${ans === q.data.answer ? 'Acertou desta vez!' : 'Ainda não. A correta é a ' + L[q.data.answer] + '.'}</b><div>${esc(q.data.explanation)}</div></div></div><div class="dialog-actions"><button class="btn primary" data-close>Fechar</button></div>` : ''}
    <p class="hint" style="margin-top:12px">A tentativa entra no histórico; as anteriores não são apagadas.</p>`);
  R.d.el.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', async () => {
    if (R.ans != null) return; R.ans = +b.dataset.k;
    await ctx.store.put('attempt', rid('att_'), ctx.planId, { questionId: q.id, chosen: R.ans, correct: R.ans === q.data.answer, at: Date.now(), context: 'caderno', setId: null, round: rid('r') });
    paintRedo(ctx);
  }));
}

export const actions = {
  add(el, e, ctx) { open(ctx, null); },
  edit(el, e, ctx) { open(ctx, ctx.store.get(el.dataset.id)); },
  del(el, e, ctx) { ctx.softDelete(el.dataset.id, 'Erro'); },
  redo(el, e, ctx) { const er = ctx.store.get(el.dataset.id); const q = er && ctx.store.get(er.data.questionId); if (!q) return; R = { q, ans: null, d: openDialog('', { wide: true, label: 'Resolver de novo', onClose: () => { R = null; } }) }; paintRedo(ctx); },
};
function open(ctx, e) {
  const d = openDialog(form(ctx, e), { label: e ? 'Editar erro' : 'Registrar erro' });
  d.el.querySelector('#er-f').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const v = (id) => d.el.querySelector(id).value;
    const data = { date: isCivilDate(v('#er-d')) ? v('#er-d') : today(), subjectId: v('#er-s'), topic: v('#er-t').trim(), reason: v('#er-r'), rule: v('#er-g').trim() };
    if (!data.topic && !data.rule) { d.el.querySelector('#er-t').setAttribute('aria-invalid', 'true'); d.el.querySelector('#er-t').focus(); return; }
    if (e) await ctx.store.patch(e.id, data); else await ctx.store.put('errorEntry', rid('err_'), ctx.planId, { ...data, note: '', reviews: [], questionId: null });
    d.close(); toast(e ? 'Erro atualizado.' : 'Erro registrado. Ele volta para revisão em 1, 7 e 30 dias.');
  });
}
export const changes = {
  subject: (el, e, ctx) => { F.subject = el.value; ctx.render(); },
  async rev(el, e, ctx) { const er = ctx.store.get(el.dataset.id); if (!er) return; const n = +el.dataset.n; const s = new Set(er.data.reviews || []); if (el.checked) s.add(n); else s.delete(n); await ctx.store.patch(er.id, { reviews: [...s].sort((a, b) => a - b) }); },
};
