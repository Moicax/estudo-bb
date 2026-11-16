// "Mais" (celular): atalhos para as telas que não cabem na barra inferior.
import { icon } from '../ui/dom.js';

export function render(ctx) {
  const n = ctx.planId ? ctx.store.list('errorEntry', { planId: ctx.planId }).length : 0;
  const s = ctx.syncInfo();
  const row = (href, ic, t, sub, extra = '') => `<a class="item clickable" href="${href}" style="text-decoration:none;color:inherit">${icon(ic)}<span class="body"><span class="title">${t}</span><span class="sub">${sub}</span></span>${extra}${icon('chevron-right', 'sm')}</a>`;
  return `<header class="page-head"><h1>Mais</h1></header><div class="list">
    ${row('#erros', 'notebook-pen', 'Caderno de erros', 'Revise o que você errou', n ? `<span class="tag">${n}</span>` : '')}
    ${row('#simulados', 'clipboard-check', 'Simulados', 'Resultados e evolução')}
    ${row('#ajustes', 'settings', 'Ajustes', 'Aparência, IA, dados e backup')}
    ${row('#ajustes', ctx.user ? 'circle-user' : 'log-in', ctx.user ? 'Conta' : (ctx.fbOn ? 'Entrar na conta' : 'Conta'), ctx.user ? ctx.user.email || '' : s.label)}
  </div>`;
}
