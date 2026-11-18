// Simulados: registro de resultados e evolução.
import { icon, esc, empty, openDialog, toast } from '../ui/dom.js';
import { today, fmtShort, rid, isCivilDate, pct } from '../core/util.js';
import { scored, scoreError } from '../domain/study.js';

function chart(list) {
  const s = list.filter(x => scored(x.data.total, x.data.correct)).slice().sort((a, b) => a.data.date.localeCompare(b.data.date));
  if (!s.length) return '';
  const W = 640, H = 220, L = 40, B = 34, T = 14, R = 10, n = s.length, gap = (W - L - R) / n, bw = Math.min(46, gap * .6);
  const y = (p) => T + (H - T - B) * (1 - p / 100);
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Porcentagem de acertos por simulado">`;
  for (const p of [0, 25, 50, 75, 100]) svg += `<line x1="${L}" x2="${W - R}" y1="${y(p)}" y2="${y(p)}" stroke="var(--line)"/><text x="${L - 8}" y="${y(p) + 4}" text-anchor="end">${p}%</text>`;
  svg += `<line x1="${L}" x2="${W - R}" y1="${y(70)}" y2="${y(70)}" stroke="var(--primary)" stroke-dasharray="5 4"/><text x="${W - R}" y="${y(70) - 6}" text-anchor="end" style="fill:var(--primary)">meta pessoal 70%</text>`;
  s.forEach((x, i) => {
    const p = pct(x.data.correct, x.data.total), cx = L + gap * i + gap / 2, top = y(p);
    svg += `<rect x="${cx - bw / 2}" y="${top}" width="${bw}" height="${y(0) - top}" rx="5" fill="var(--primary)" opacity="${i === n - 1 ? 1 : .55}"/><text x="${cx}" y="${top - 6}" text-anchor="middle" style="fill:var(--ink);font-weight:650">${p}%</text><text x="${cx}" y="${H - 12}" text-anchor="middle">${esc(fmtShort(x.data.date))}</text>`;
  });
  return `<div class="card" style="margin-bottom:14px"><h3>Acertos por simulado</h3>${svg}</svg></div>`;
}

export function render(ctx) {
  const P = ctx.planId; if (!P) return empty('clipboard-check', 'Nenhum plano', 'Crie um plano primeiro.');
  const list = ctx.store.list('simulation', { planId: P }).filter(x => !ctx.hiddenIds.has(x.id)).sort((a, b) => b.data.date.localeCompare(a.data.date));
  let h = `<header class="page-head"><div class="row"><h1>Simulados</h1><button class="btn primary sm" data-act="add">${icon('plus', 'sm')}Registrar simulado</button></div><p class="muted">Anote total e acertos. A evolução importa mais que um resultado isolado.</p></header>`;
  if (!list.length) return h + empty('clipboard-check', 'Nenhum simulado ainda', 'O primeiro pode ser o diagnóstico: uma prova antiga completa, para saber de onde você parte.');
  h += chart(list) + '<div class="list">' + list.map(x => {
    const p = scored(x.data.total, x.data.correct) ? pct(x.data.correct, x.data.total) : null;
    const pending = scoreError(x.data.total, x.data.correct, 1) ? 'Conferir resultado' : 'Aguardando resultado';
    return `<div class="item"><div class="date-block"><b>${x.data.date.slice(8)}</b><span>${x.data.date.slice(5, 7)}/${x.data.date.slice(2, 4)}</span></div>
      <div class="body"><span class="title">${esc(x.data.name)}</span><span class="sub">${x.data.correct ?? '—'} de ${x.data.total ?? '—'}${x.data.notes ? ' · ' + esc(x.data.notes) : ''}</span></div>
      ${p != null ? `<b class="tabular" style="font-family:var(--font-head);font-size:1.15rem">${p}%</b>` : `<span class="tag">${pending}</span>`}
      <button class="btn sm ghost icon" data-act="edit" data-id="${esc(x.id)}" aria-label="Editar">${icon('pencil', 'sm')}</button><button class="btn sm ghost icon" data-act="del" data-id="${esc(x.id)}" aria-label="Excluir">${icon('trash-2', 'sm')}</button></div>`;
  }).join('') + '</div>';
  return h;
}

function open(ctx, x) {
  const d0 = x ? x.data : { date: today(), name: 'Simulado ' + (ctx.store.list('simulation', { planId: ctx.planId }).length + 1), correct: '', total: 70, notes: '' };
  const d = openDialog(`<h2>${x ? 'Editar simulado' : 'Registrar simulado'}</h2><form id="sm-f" class="stack" style="margin-top:12px" novalidate>
    <div class="grid2"><div class="field"><label class="f" for="sm-d">Data</label><input id="sm-d" type="date" value="${esc(d0.date)}"></div><div class="field"><label class="f" for="sm-n">Nome</label><input id="sm-n" type="text" value="${esc(d0.name)}"></div></div>
    <div class="grid2"><div class="field"><label class="f" for="sm-c">Acertos</label><input id="sm-c" type="number" min="0" inputmode="numeric" value="${d0.correct ?? ''}"></div><div class="field"><label class="f" for="sm-t">Total de questões</label><input id="sm-t" type="number" min="1" inputmode="numeric" value="${d0.total ?? ''}"></div></div>
    <div class="field"><label class="f" for="sm-o">Observação</label><input id="sm-o" type="text" value="${esc(d0.notes || '')}" placeholder="Matéria mais fraca, tempo…"></div>
    <p class="hint" id="sm-e" role="alert"></p>
    <div class="dialog-actions"><button type="button" class="btn" data-close>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></form>`, { label: 'Simulado' });
  d.el.querySelector('#sm-f').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const v = (s) => d.el.querySelector(s).value;
    const c = v('#sm-c') === '' ? null : +v('#sm-c'), t = v('#sm-t') === '' ? null : +v('#sm-t');
    const fields = ['#sm-c', '#sm-t'].map(s => d.el.querySelector(s));
    const error = fields.some(f => f.validity.badInput) ? 'Confira os números informados.' : scoreError(t, c, 1);
    if (error) { d.el.querySelector('#sm-e').textContent = error; return; }
    const data = { date: isCivilDate(v('#sm-d')) ? v('#sm-d') : today(), name: v('#sm-n').trim() || 'Simulado', correct: c, total: t, notes: v('#sm-o').trim() };
    if (x) await ctx.store.patch(x.id, data); else await ctx.store.put('simulation', rid('sim_'), ctx.planId, data);
    d.close(); toast('Simulado salvo.');
  });
}
export const actions = { add(el, e, ctx) { open(ctx, null); }, edit(el, e, ctx) { open(ctx, ctx.store.get(el.dataset.id)); }, del(el, e, ctx) { ctx.softDelete(el.dataset.id, 'Simulado'); } };
