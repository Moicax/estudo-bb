// Vídeos: biblioteca do plano, playlists, assistidos, agendar e adicionar aulas próprias.
import { icon, esc, chip, empty, openDialog, toast } from '../ui/dom.js';
import { fmtClock, fmtShort, safeUrl, parseDur, today, DIAS, weekday } from '../core/util.js';
import { subjectMap, subjectsOf, watched, activitiesOf } from '../domain/study.js';
import { ids } from '../data/schema.js';

const F = { subject: '', status: '', q: '', limit: 60 };

export function render(ctx) {
  const P = ctx.planId; if (!P) return empty('circle-play', 'Nenhum plano', 'Crie um plano primeiro.');
  const subs = subjectMap(ctx.store, P);
  const all = ctx.store.list('video', { planId: P }).filter(v => !ctx.hiddenIds.has(v.id)).sort((a, b) => ((subs[a.data.subjectId]?.data.order ?? 99) - (subs[b.data.subjectId]?.data.order ?? 99)) || a.data.title.localeCompare(b.data.title, 'pt-BR', { numeric: true }));
  const sched = {}; for (const a of activitiesOf(ctx.store, P)) for (const v of a.data.videoIds || []) (sched[v] = sched[v] || []).push(a);
  let list = all;
  if (F.subject) list = list.filter(v => v.data.subjectId === F.subject);
  if (F.status === 'n') list = list.filter(v => !watched(ctx.store, v.id));
  if (F.status === 's') list = list.filter(v => watched(ctx.store, v.id));
  if (F.q) { const q = F.q.toLowerCase(); list = list.filter(v => (v.data.title + ' ' + (v.data.channel || '')).toLowerCase().includes(q)); }
  const nW = all.filter(v => watched(ctx.store, v.id)).length;
  const pls = ctx.store.list('playlist', { planId: P }).filter(p => !F.subject || p.data.subjectId === F.subject);

  let h = `<header class="page-head"><div class="row"><h1>Vídeos</h1><button class="btn sm" data-act="add">${icon('plus', 'sm')}Meu vídeo</button></div><p class="muted">${nW} de ${all.length} aulas assistidas.</p></header>`;
  if (pls.length) h += `<details class="card" style="margin-bottom:14px"><summary style="cursor:pointer;font-weight:650">${icon('list', 'sm')} Cursos completos no YouTube (${pls.length})</summary><div class="row" style="margin-top:10px">${pls.map(p => `<a class="btn sm" href="${esc(safeUrl(p.data.url))}" target="_blank" rel="noopener noreferrer">${esc(p.data.title)} ${icon('external-link', 'sm')}</a>`).join('')}</div></details>`;
  h += `<div class="filters"><select aria-label="Matéria" data-change="subject"><option value="">Todas as matérias</option>${subjectsOf(ctx.store, P).filter(s => s.data.role !== 'rest').map(s => `<option value="${esc(s.id)}" ${F.subject === s.id ? 'selected' : ''}>${esc(s.data.name)}</option>`).join('')}</select>
    <select aria-label="Situação" data-change="status"><option value="">Todas</option><option value="n" ${F.status === 'n' ? 'selected' : ''}>Ainda não assistidas</option><option value="s" ${F.status === 's' ? 'selected' : ''}>Já assistidas</option></select>
    <input id="vd-q" type="search" placeholder="Buscar aula ou canal" aria-label="Buscar" value="${esc(F.q)}" data-input="q"></div>`;
  if (!list.length) return h + empty('search', 'Nenhuma aula encontrada', 'Tente outro filtro.');
  h += '<div class="list">' + list.slice(0, F.limit).map(v => {
    const w = watched(ctx.store, v.id), days = sched[v.id] || [];
    return `<div class="item"><button class="done-btn" style="width:36px;height:36px" data-act="watch" data-vid="${esc(v.id)}" aria-pressed="${w}" data-flash="w:${esc(v.id)}" aria-label="${w ? 'Desmarcar' : 'Marcar'} como assistida: ${esc(v.data.title)}">${icon('check', 'sm')}</button>
      <div class="body"><span class="title">${esc(v.data.title)}</span><span class="sub">${chip(subs[v.data.subjectId])}<span>${esc(v.data.channel || '')}${v.data.durationSec ? ' · ' + fmtClock(v.data.durationSec) : ''}</span>${days.length ? days.slice(0, 3).map(a => `<a class="tag" href="#estudo/${esc(a.id)}">${DIAS[weekday(a.data.date)]} ${fmtShort(a.data.date)}</a>`).join('') : '<span class="tag">sem dia</span>'}</span></div>
      <div class="row tight"><a class="btn sm soft" href="${esc(safeUrl(v.data.url))}" target="_blank" rel="noopener noreferrer" aria-label="Assistir ${esc(v.data.title)}">${icon('play', 'sm')}</a>
      <button class="btn sm ghost icon" data-act="schedule" data-vid="${esc(v.id)}" aria-label="Agendar num dia">${icon('calendar-days', 'sm')}</button>
      ${v.data.source === 'usuario' ? `<button class="btn sm ghost icon" data-act="del" data-vid="${esc(v.id)}" aria-label="Excluir vídeo">${icon('trash-2', 'sm')}</button>` : ''}</div></div>`;
  }).join('') + '</div>';
  if (list.length > F.limit) h += `<button class="btn block" style="margin-top:12px" data-act="more">Mostrar mais ${Math.min(60, list.length - F.limit)} de ${list.length - F.limit}</button>`;
  return h;
}

export const actions = {
  more(el, e, ctx) { F.limit += 60; ctx.render(); },
  schedule(el, e, ctx) {
    const P = ctx.planId, v = ctx.store.get(el.dataset.vid), subs = subjectMap(ctx.store, P);
    const days = activitiesOf(ctx.store, P).filter(a => a.data.date >= today() && subs[a.data.subjectId]?.data.role !== 'rest').slice(0, 90);
    const d = openDialog(`<h2>Agendar aula</h2><p class="muted small">${esc(v.data.title)}</p><div class="field" style="margin-top:12px"><label class="f" for="sc-d">Dia</label><select id="sc-d">${days.map(a => `<option value="${esc(a.id)}" ${a.data.subjectId === v.data.subjectId ? '' : ''}>${DIAS[weekday(a.data.date)]} ${fmtShort(a.data.date)} · ${esc(subs[a.data.subjectId]?.data.name || '')} · ${esc((a.data.title || '').slice(0, 40))}</option>`).join('')}</select></div>
      <div class="dialog-actions"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="sc-ok">${icon('calendar-days')}Agendar</button></div>`, { label: 'Agendar aula' });
    const first = days.find(a => a.data.subjectId === v.data.subjectId); if (first) d.el.querySelector('#sc-d').value = first.id;
    d.el.querySelector('#sc-ok').onclick = async () => { const a = ctx.store.get(d.el.querySelector('#sc-d').value); if (a && !a.data.videoIds.includes(v.id)) await ctx.store.patch(a.id, { videoIds: [...a.data.videoIds, v.id] }); d.close(); toast('Aula agendada para ' + fmtShort(a.data.date) + '.'); };
  },
  add(el, e, ctx) {
    const P = ctx.planId;
    const d = openDialog(`<h2>Adicionar meu vídeo</h2><form id="nv-f" class="stack" style="margin-top:12px" novalidate>
      <div class="field"><label class="f" for="nv-t">Título</label><input id="nv-t" type="text" required></div>
      <div class="field"><label class="f" for="nv-u">Link</label><input id="nv-u" type="url" placeholder="https://www.youtube.com/watch?v=…" required></div>
      <div class="grid2"><div class="field"><label class="f" for="nv-s">Matéria</label><select id="nv-s">${subjectsOf(ctx.store, P).filter(s => s.data.role !== 'rest').map(s => `<option value="${esc(s.id)}">${esc(s.data.name)}</option>`).join('')}</select></div>
      <div class="field"><label class="f" for="nv-d">Duração (mm:ss)</label><input id="nv-d" type="text" inputmode="numeric" placeholder="35:20"></div></div>
      <div class="field"><label class="f" for="nv-c">Canal (opcional)</label><input id="nv-c" type="text"></div>
      <p class="hint" id="nv-e" role="alert"></p>
      <div class="dialog-actions"><button type="button" class="btn" data-close>Cancelar</button><button class="btn primary" type="submit">Salvar vídeo</button></div></form>`, { label: 'Adicionar vídeo' });
    d.el.querySelector('#nv-f').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const t = d.el.querySelector('#nv-t').value.trim(), u = d.el.querySelector('#nv-u').value.trim();
      if (!t || !/^https?:\/\//i.test(u)) { d.el.querySelector('#nv-e').textContent = 'Preencha o título e um link que comece com https://'; return; }
      const id = ids.userVideo(P, u);
      if (ctx.store.getRaw(id)) { d.el.querySelector('#nv-e').textContent = 'Esse link já está na biblioteca.'; return; }
      await ctx.store.put('video', id, P, { subjectId: d.el.querySelector('#nv-s').value, title: t, channel: d.el.querySelector('#nv-c').value.trim(), durationSec: parseDur(d.el.querySelector('#nv-d').value), url: u, yt: null, source: 'usuario' });
      d.close(); toast('Vídeo adicionado à biblioteca.');
    });
  },
  del(el, e, ctx) { ctx.softDelete(el.dataset.vid, 'Vídeo'); },
};
export const inputs = { q: (el, e, ctx) => { F.q = el.value; F.limit = 60; clearTimeout(F.t); F.t = setTimeout(() => ctx.render(true), 250); } };
export const changes = { subject: (el, e, ctx) => { F.subject = el.value; F.limit = 60; ctx.render(); }, status: (el, e, ctx) => { F.status = el.value; F.limit = 60; ctx.render(); } };
