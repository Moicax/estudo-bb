// Ponto de entrada: inicia conta/armazenamento, desenha a moldura (navegação) e as telas.
import { SPRITE } from './ui/icons.js';
import { icon, esc, toast, openDialog, confirmDialog, celebrate, closeAllDialogs, $, aiUsageLine } from './ui/dom.js';
import { FIREBASE_CONFIG, EMULATOR_CONFIG, emulatorMode, APP_VERSION } from './config.js';
import { openStore, deleteScope } from './data/store.js';
import { createAI } from './ai/ai.js';
import { BB_TEMPLATE } from './data/catalog-bb.js';
import { today, fmtShort, diffDays, rid } from './core/util.js';
import { planOf, todayPlan, reviewsAfter, subjectMap, isRest } from './domain/study.js';
import * as Today from './views/today.js';
import * as Study from './views/study.js';
import * as Agenda from './views/agenda.js';
import * as Videos from './views/videos.js';
import * as Progress from './views/progress.js';
import * as Errors from './views/errors.js';
import * as Sims from './views/sims.js';
import * as Settings from './views/settings.js';
import * as More from './views/more.js';
import * as Welcome from './views/welcome.js';
import * as Auth from './views/auth.js';

const VIEWS = { hoje: Today, estudo: Study, agenda: Agenda, videos: Videos, progresso: Progress, erros: Errors, simulados: Sims, ajustes: Settings, mais: More, 'boas-vindas': Welcome, entrar: Auth };
const NAV = [['hoje', 'Hoje', 'sun'], ['agenda', 'Agenda', 'calendar-days'], ['videos', 'Vídeos', 'circle-play'], ['progresso', 'Progresso', 'chart-column'], ['erros', 'Caderno de erros', 'notebook-pen'], ['simulados', 'Simulados', 'clipboard-check'], ['ajustes', 'Ajustes', 'settings']];
const TABS = [['hoje', 'Hoje', 'sun'], ['agenda', 'Agenda', 'calendar-days'], ['videos', 'Vídeos', 'circle-play'], ['progresso', 'Progresso', 'chart-column'], ['mais', 'Mais', 'ellipsis']];

const LS_SCOPE = 'meu-estudo:lastScope', LS_MODE = 'meu-estudo:mode', LS_LOOK = 'meu-estudo:look';

export const ctx = {
  version: APP_VERSION, store: null, scope: null, user: null, fb: null, fbOn: false, fbError: null, engine: null, ai: null,
  sync: { phase: 'local', pending: 0 }, route: { name: 'hoje', arg: null }, flash: new Set(), hiddenIds: new Set(), lastLocalSave: 0,
  skipWelcome: false, emulator: false,
  get planId() {
    const p = this.store && this.store.get('profile');
    const want = p && p.data.activePlanId;
    if (want && this.store.get('plan_' + want)) return want;
    const plans = this.store ? this.store.list('plan').filter(x => x.data.status !== 'archived') : [];
    return plans.length ? plans[0].planId : null;
  },
  get plan() { return this.planId ? planOf(this.store, this.planId) : null; },
  get profile() { return this.store && this.store.get('profile'); },
  prefs() { const p = this.profile; return { theme: 'system', motion: 'system', celebrate: true, sound: true, videoSpeed: 1.25, focusMin: 25, ...(p ? p.data.prefs : {}) }; },
  go(name, arg) { location.hash = arg ? `${name}/${arg}` : name; },
  render: (force) => render(force),
  toast, openDialog, confirmDialog,
};
window.__ctx = ctx; // para depuração e testes automatizados

/* ---------- aparência ---------- */
function applyLook(p) {
  const r = document.documentElement;
  if (p.theme === 'light' || p.theme === 'dark') r.dataset.theme = p.theme; else delete r.dataset.theme;
  if (p.motion === 'reduce' || p.motion === 'full') r.dataset.motion = p.motion; else delete r.dataset.motion;
  try { localStorage.setItem(LS_LOOK, JSON.stringify({ theme: p.theme, motion: p.motion })); } catch (e) { /* sem armazenamento */ }
}
try { applyLook(JSON.parse(localStorage.getItem(LS_LOOK) || '{}')); } catch (e) { /* primeira vez */ }

/* ---------- estado de sincronização ---------- */
export function syncInfo() {
  if (!ctx.fbOn) return { phase: 'local', label: 'Salvo neste aparelho', detail: 'A conta ainda não foi configurada: os dados ficam só neste aparelho.' };
  if (ctx.scope === 'local') return { phase: 'local', label: 'Salvo neste aparelho', detail: 'Você está usando sem conta. Entre para ver seus estudos em outros aparelhos.' };
  const s = ctx.sync;
  if (s.phase === 'error') return { phase: 'error', label: 'Falha ao sincronizar', detail: (s.error || 'Erro desconhecido.') + ' Suas alterações estão salvas neste aparelho.' };
  if (s.phase === 'offline' || !navigator.onLine) return { phase: 'offline', label: s.pending ? `Sem internet · ${s.pending} aguardando` : 'Sem internet', detail: 'Tudo está salvo neste aparelho. Quando a conexão voltar, as alterações serão enviadas.' };
  if (s.pending && Date.now() - ctx.lastLocalSave < 1500) return { phase: 'syncing', label: 'Salvo neste aparelho', detail: 'Enviando para a sua conta…' };
  if (s.phase === 'syncing' || s.pending) return { phase: 'syncing', label: 'Sincronizando…', detail: 'Enviando e recebendo alterações.' };
  if (s.phase === 'synced') return { phase: 'synced', label: 'Sincronizado', detail: 'Este aparelho está em dia com a sua conta.' + (s.lastSyncAt ? ' Última sincronização às ' + new Date(s.lastSyncAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '.' : '') };
  return { phase: 'syncing', label: 'Conectando…', detail: '' };
}
function syncButton() { const s = syncInfo(); return `<button class="sync" data-act="sync-info" data-sync data-phase="${s.phase}" title="${esc(s.detail)}"><span class="dot"></span><span class="lbl">${esc(s.label)}</span></button>`; }
function paintSync() {
  const s = syncInfo();
  document.querySelectorAll('[data-sync]').forEach(b => { b.dataset.phase = s.phase; b.title = s.detail; b.querySelector('.lbl').textContent = s.label; });
}
setInterval(paintSync, 1500);
setInterval(() => { Study.checkSessions(ctx).catch(() => {}); }, 5000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { Study.checkSessions(ctx).catch(() => {}); render(); } });

/* ---------- moldura ---------- */
function shell() {
  const app = $('#app');
  if (app.dataset.built) return;
  app.dataset.built = '1';
  app.innerHTML = `
  <aside class="side" aria-label="Navegação principal">
    <div class="brand"><span class="brand-mark">${icon('book-open')}</span>Meu Estudo</div>
    <div class="plan-card" id="plan-card"></div>
    <nav class="nav" id="side-nav"></nav>
    <div class="side-foot"><p class="ai-usage small muted" id="side-ai"></p>${syncButton()}<a class="btn ghost sm" href="#ajustes" style="justify-content:flex-start" id="side-account">${icon('circle-user', 'sm')}<span>Conta</span></a></div>
  </aside>
  <div class="content">
    <header class="topbar" id="topbar"><div class="brand"><span class="brand-mark">${icon('book-open')}</span><span id="top-title">Meu Estudo</span></div>${syncButton()}</header>
    <main class="main" id="view" tabindex="-1"></main>
  </div>
  <nav class="tabbar" id="tabbar" aria-label="Navegação"></nav>`;
  addEventListener('scroll', () => { const t = $('#topbar'); if (t) t.classList.toggle('scrolled', scrollY > 4); }, { passive: true });
}
function paintChrome() {
  const r = ctx.route.name === 'estudo' ? 'agenda' : ctx.route.name;
  const counts = { erros: ctx.store ? ctx.store.list('errorEntry', { planId: ctx.planId }).length : 0 };
  $('#side-nav').innerHTML = NAV.map(([k, l, i]) => `<a href="#${k}" ${r === k ? 'aria-current="page"' : ''}>${icon(i)}<span>${l}</span>${counts[k] ? `<span class="count">${counts[k]}</span>` : ''}</a>`).join('');
  const more = ['erros', 'simulados', 'ajustes', 'mais'].includes(r) ? 'mais' : r;
  $('#tabbar').innerHTML = TABS.map(([k, l, i]) => `<a class="tab" href="#${k}" ${more === k ? 'aria-current="page"' : ''}>${icon(i)}<span>${l}</span></a>`).join('');
  const plan = ctx.plan;
  let exam = '';
  if (plan) {
    if (plan.data.examDate) { const d = diffDays(today(), plan.data.examDate); exam = d >= 0 ? `Prova em ${fmtShort(plan.data.examDate)} · ${d} ${d === 1 ? 'dia' : 'dias'}` : `Prova em ${fmtShort(plan.data.examDate)}`; }
    else exam = 'Data da prova a definir';
  }
  $('#plan-card').innerHTML = plan ? `<div class="eyebrow">Plano atual</div><b>${esc(plan.data.name)}</b><div class="small muted">${esc(exam)}</div>` : '<div class="small muted">Nenhum plano ainda</div>';
  const acc = $('#side-account span'); if (acc) acc.textContent = ctx.user ? (ctx.user.email || 'Conta') : (ctx.fbOn ? 'Entrar' : 'Ajustes');
  const sa = $('#side-ai'); if (sa) sa.innerHTML = aiUsageLine(ctx.ai);
  paintSync();
}

/* ---------- desenho das telas ---------- */
let renderQueued = false, pendingRender = false, lastRouteKey = '';
let forceNext = false;
export function render(force = false) {
  if (force) forceNext = true;
  if (renderQueued) return; renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; const f = forceNext; forceNext = false; doRender(f); });
}
function view0() { return $('#view') || document.body; }
function editing() { const a = document.activeElement; return a && $('#view') && $('#view').contains(a) && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && /text|search|email|url|number|password/.test(a.type))); }
function doRender(force = false) {
  const name = ctx.route.name, V = VIEWS[name] || Today;
  if (name === 'entrar' || name === 'boas-vindas') { renderFull(V); return; }
  if (!ctx.store) return;
  shell();
  const routeKey = name + '/' + (ctx.route.arg || '');
  if (routeKey === lastRouteKey && editing() && !force) { pendingRender = true; return; }
  const act = document.activeElement, focusId = act && act.id && view0().contains(act) ? act.id : null;
  const sel = focusId && 'selectionStart' in act ? [act.selectionStart, act.selectionEnd] : null;
  const view = $('#view');
  const bars = {}; view.querySelectorAll('.bar[data-k] > i').forEach(i => { bars[i.parentElement.dataset.k] = i.style.getPropertyValue('--p'); });
  const changed = routeKey !== lastRouteKey;
  let html;
  try { html = V.render(ctx); } catch (e) { console.error(e); html = `<div class="notice bad">${icon('triangle-alert')}<div><b>Algo deu errado ao mostrar esta tela.</b><div class="small">${esc(e.message)}</div><button class="btn sm" style="margin-top:8px" data-act="go" data-to="hoje">Voltar para Hoje</button></div></div>`; }
  const scrollKeep = scrollY;
  view.innerHTML = `<div class="${changed ? 'view' : ''}">${html}</div>`;
  view.querySelectorAll('.bar[data-k] > i').forEach(i => {
    const old = bars[i.parentElement.dataset.k]; if (old == null) return;
    const target = i.style.getPropertyValue('--p'); if (old === target) return;
    i.style.setProperty('--p', old); void i.offsetWidth; requestAnimationFrame(() => i.style.setProperty('--p', target));
  });
  for (const k of ctx.flash) { const el = view.querySelector(`[data-flash="${CSS.escape(k)}"]`); if (el) el.classList.add('pop'); }
  ctx.flash.clear();
  if (V.after) V.after(ctx, view);
  const T = { hoje: 'Hoje', agenda: 'Agenda', estudo: 'Estudar', videos: 'Vídeos', progresso: 'Progresso', erros: 'Caderno de erros', simulados: 'Simulados', ajustes: 'Ajustes', mais: 'Mais' };
  document.title = (T[name] || 'Meu Estudo') + ' · Meu Estudo';
  paintChrome();
  if (changed) { scrollTo(0, 0); if (lastRouteKey) view.focus({ preventScroll: true }); } else {
    scrollTo(0, scrollKeep);
    if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus({ preventScroll: true }); if (sel) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* tipo sem seleção */ } } }
  }
  lastRouteKey = routeKey;
}
function renderFull(V) {
  const app = $('#app'); delete app.dataset.built; lastRouteKey = '';
  app.innerHTML = `<div class="auth-wrap"><div class="auth view">${V.render(ctx)}</div></div>`;
  if (V.after) V.after(ctx, app);
}
document.addEventListener('focusout', () => { setTimeout(() => { if (pendingRender && !editing()) { pendingRender = false; render(); } }, 0); });

/* ---------- rotas ---------- */
function parseRoute() {
  const h = decodeURIComponent(location.hash.slice(1));
  const [name, ...rest] = h.split('/');
  return { name: VIEWS[name] ? name : 'hoje', arg: rest.join('/') || null };
}
addEventListener('hashchange', () => {
  const r = parseRoute();
  if (ctx.mustAuth && r.name !== 'entrar') { location.hash = 'entrar'; return; }
  ctx.route = r; closeAllDialogs();
  if (r.name === 'boas-vindas' && ctx.store) { Welcome.prepare(ctx).then(() => render()); return; }
  render();
});

/* ---------- ações comuns (data-act) ---------- */
const GLOBAL = {
  go: (el) => ctx.go(el.dataset.to, el.dataset.arg),
  'sync-info': () => {
    const s = syncInfo();
    const d = openDialog(`<h2>${esc(s.label)}</h2><p class="muted" style="margin-top:6px">${esc(s.detail)}</p>
      ${ctx.user ? `<p class="small" style="margin-top:12px">Conta: <b>${esc(ctx.user.email || ctx.user.uid)}</b></p>` : ''}
      <div class="dialog-actions">${ctx.engine ? `<button class="btn" data-act="sync-now">${icon('refresh-cw')}Sincronizar agora</button>` : ''}<a class="btn" href="#ajustes" data-close>${icon('settings')}Conta e dados</a><button class="btn primary" data-close>Fechar</button></div>`, { label: 'Sincronização' });
    return d;
  },
  'sync-now': async () => { if (!ctx.engine) return; if (!navigator.onLine) { toast('Sem internet. Suas alterações estão salvas neste aparelho.', { icon: 'wifi-off' }); return; } await ctx.engine.syncNow(); paintSync(); toast(syncInfo().label, { icon: 'refresh-cw' }); },
  'toggle-done': async (el) => toggleDone(el.dataset.id),
  'review-done': async (el) => {
    const id = el.dataset.id, step = +el.dataset.step, rec = ctx.store.get(id); if (!rec) return;
    ctx.flash.add('rv:' + id);
    await ctx.store.patch(id, { reviews: reviewsAfter(rec.data.reviews, step) });
    toast(`Revisão de ${step} ${step === 1 ? 'dia' : 'dias'} registrada.`);
  },
  watch: async (el) => {
    const vid = el.dataset.vid, pid = 'vp_' + vid, cur = ctx.store.get(pid);
    const now = !(cur && cur.data.watched);
    ctx.flash.add('w:' + vid);
    if (cur) await ctx.store.patch(pid, { watched: now, at: Date.now() }); else await ctx.store.put('videoProgress', pid, ctx.planId, { videoId: vid, watched: now, at: Date.now() });
  },
};

export async function toggleDone(id, to) {
  const a = ctx.store.get(id); if (!a) return;
  const was = a.data.status === 'done';
  const next = to || (was ? 'todo' : 'done');
  ctx.flash.add('done:' + id);
  await ctx.store.patch(id, next === 'done' ? { status: 'done', doneAt: today(), reviews: was ? a.data.reviews : [] } : { status: next, doneAt: null });
  if (next === 'done' && !was) {
    const tp = todayPlan(ctx.store, ctx.planId);
    const allToday = tp.todays.length && tp.todayOpen.length === 0 && a.data.date === today();
    toast(allToday ? 'Tudo feito por hoje. Revisões marcadas para 1, 7 e 30 dias.' : 'Atividade concluída. Revisões em 1, 7 e 30 dias.', { action: 'Desfazer', onAction: () => ctx.store.patch(id, { status: a.data.status, doneAt: a.data.doneAt, reviews: a.data.reviews }) });
    if (allToday) celebrate(ctx.prefs().celebrate);
  }
}

/** Exclusão com "Desfazer": o item some na hora e a exclusão só é gravada depois de alguns segundos. */
const pendingDeletes = new Map();
export function softDelete(id, label) {
  ctx.hiddenIds.add(id); render();
  const commit = async () => { pendingDeletes.delete(id); ctx.hiddenIds.delete(id); await ctx.store.remove(id); };
  const t = setTimeout(commit, 5200);
  pendingDeletes.set(id, { t, commit });
  toast(label + ' excluído.', { icon: 'trash-2', action: 'Desfazer', ms: 5000, onAction: () => { clearTimeout(t); pendingDeletes.delete(id); ctx.hiddenIds.delete(id); render(); } });
}
addEventListener('pagehide', () => { for (const [, p] of pendingDeletes) { clearTimeout(p.t); p.commit(); } });
ctx.softDelete = softDelete; ctx.toggleDone = toggleDone; ctx.syncInfo = syncInfo;

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act; const V = VIEWS[ctx.route.name];
  const fn = (V && V.actions && V.actions[act]) || GLOBAL[act] || ACCOUNT[act];
  if (!fn) return;
  if (el.tagName === 'A' && !el.getAttribute('href')?.startsWith('http')) e.preventDefault();
  try { await fn(el, e, ctx); } catch (err) { console.error(err); toast(err && err.message ? err.message : 'Não foi possível concluir.', { icon: 'triangle-alert' }); }
});
for (const evName of ['input', 'change']) {
  document.addEventListener(evName, (e) => {
    const el = e.target; const V = VIEWS[ctx.route.name];
    const key = el.dataset && (evName === 'input' ? el.dataset.input : el.dataset.change);
    if (key && V && V[evName === 'input' ? 'inputs' : 'changes'] && V[evName === 'input' ? 'inputs' : 'changes'][key]) V[evName === 'input' ? 'inputs' : 'changes'][key](el, e, ctx);
  });
}

/* ---------- conta ---------- */
let fbMod = null;
const ACCOUNT = {
  'sign-out': async () => {
    const pending = ctx.store ? ctx.store.dirtyCount() : 0;
    if (pending && navigator.onLine && ctx.engine) await ctx.engine.flush(8000);
    const still = ctx.store ? ctx.store.dirtyCount() : 0;
    const d = openDialog(`<h2>Sair da conta</h2>
      ${still ? `<div class="notice warn" style="margin-top:10px">${icon('triangle-alert')}<div>${still} alterações ainda não foram enviadas (sem internet). Se apagar os dados deste aparelho agora, elas se perdem.</div></div>` : '<p class="muted" style="margin-top:6px">Tudo já está salvo na sua conta.</p>'}
      <p class="small" style="margin-top:12px">Em aparelho compartilhado, apague os dados deste aparelho ao sair.</p>
      <div class="dialog-actions"><button class="btn" data-close>Cancelar</button>
      <button class="btn" data-close="keep">${icon('log-out')}Sair e manter offline</button>
      <button class="btn ${still ? 'danger' : 'primary'}" data-close="wipe">${icon('trash-2')}Sair e apagar deste aparelho</button></div>`,
    { label: 'Sair da conta', onClose: async (r) => {
      if (r !== 'keep' && r !== 'wipe') return;
      const scope = ctx.scope;
      stopScope();
      if (r === 'wipe') { await deleteScope(scope); try { localStorage.removeItem(LS_SCOPE); } catch (e) { /* ok */ } }
      try { localStorage.removeItem(LS_MODE); } catch (e) { /* ok */ }
      await fbMod.signOut();
      toast(r === 'wipe' ? 'Você saiu e os dados foram apagados deste aparelho.' : 'Você saiu da conta.', { icon: 'log-out' });
    } });
    return d;
  },
  'use-local': async () => { try { localStorage.setItem(LS_MODE, 'local'); } catch (e) { /* ok */ } ctx.mustAuth = false; await enterScope('local'); },
  'go-login': async () => { try { localStorage.removeItem(LS_MODE); } catch (e) { /* ok */ } stopScope(); showAuth(); },
};
function stopScope() {
  if (ctx.engine) { ctx.engine.stop(); ctx.engine = null; }
  if (ctx.store) { ctx.store.close(); ctx.store = null; }
  ctx.scope = null; ctx.hiddenIds.clear();
}
function showAuth() { ctx.mustAuth = true; ctx.route = { name: 'entrar', arg: null }; if (location.hash !== '#entrar') location.hash = 'entrar'; else render(); }

async function enterScope(scope) {
  stopScope();
  ctx.skipWelcome = false;
  ctx.store = await openStore(scope); ctx.scope = scope; ctx.ai = createAI(ctx.store); ctx.mustAuth = false;
  ctx.store.on((ev) => {
    if (ev.origin === 'local' || ev.origin === 'input') ctx.lastLocalSave = Date.now();
    if (ctx.engine) ctx.sync = ctx.engine.status();
    paintSync();
    if (ev.origin !== 'input') render();
    if (ev.ids.includes('profile')) applyLook(ctx.prefs());
  });
  if (scope !== 'local' && ctx.fb) {
    const { createSyncEngine } = await import('./sync/engine.js');
    ctx.engine = createSyncEngine({ fs: ctx.fb.F, db: ctx.fb.db, uid: scope, store: ctx.store, isOnline: () => navigator.onLine,
      onStatus: (s) => { ctx.sync = s; paintSync(); } });
    ctx.engine.start();
    if (navigator.onLine && !ctx.store.getMeta('lastPull')) {
      showLoading('Baixando seus estudos da conta…');
      try { await ctx.engine.waitInitialPull(20000); } catch (e) { /* segue com o que tem */ }
    }
  } else ctx.sync = { phase: 'local', pending: 0 };
  applyLook(ctx.prefs());
  await Welcome.prepare(ctx);
  if (!ctx.skipWelcome && Welcome.needed(ctx)) { ctx.route = { name: 'boas-vindas', arg: null }; render(); return; }
  ctx.route = parseRoute();
  if (ctx.route.name === 'entrar' || ctx.route.name === 'boas-vindas') { ctx.route = { name: 'hoje', arg: null }; history.replaceState(null, '', '#hoje'); }
  render();
}
ctx.enterScope = enterScope;
ctx.finishWelcome = () => { ctx.skipWelcome = true; ctx.route = { name: 'hoje', arg: null }; history.replaceState(null, '', '#hoje'); render(); };

function showLoading(text) {
  const app = $('#app'); delete app.dataset.built; lastRouteKey = '';
  app.innerHTML = `<div class="auth-wrap"><div class="auth" style="align-items:center;text-align:center"><div class="brand"><span class="brand-mark">${icon('book-open')}</span>Meu Estudo</div>
    <div class="skeleton" style="width:100%;height:12px"></div><p class="muted" role="status">${esc(text)}</p></div></div>`;
}

/* ---------- início ---------- */
async function boot() {
  document.body.insertAdjacentHTML('afterbegin', SPRITE);
  ctx.emulator = emulatorMode();
  const cfg = ctx.emulator ? EMULATOR_CONFIG : FIREBASE_CONFIG;
  ctx.fbOn = !!cfg;
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !ctx.emulator) {
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) toast('Nova versão do sistema disponível.', { icon: 'refresh-cw', action: 'Atualizar', ms: 15000, onAction: () => location.reload() }); });
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* opcional */ }
  addEventListener('online', () => { if (ctx.engine) ctx.engine.online(); paintSync(); });
  addEventListener('offline', () => { if (ctx.engine) ctx.engine.offline(); paintSync(); });
  if (!cfg) { await enterScope('local'); return; }
  let mode = null; try { mode = localStorage.getItem(LS_MODE); } catch (e) { /* ok */ }
  showLoading('Abrindo seus estudos…');
  try {
    fbMod = await import('./sync/firebase.js');
    ctx.fb = await fbMod.loadFirebase(cfg, { emulator: ctx.emulator });
    ctx.authApi = fbMod;
  } catch (e) {
    console.error(e); ctx.fbError = 'Não consegui carregar o sistema de contas. Usando os dados deste aparelho.';
    let last = null; try { last = localStorage.getItem(LS_SCOPE); } catch (er) { /* ok */ }
    await enterScope(last || 'local'); toast(ctx.fbError, { icon: 'cloud-off', ms: 7000 }); return;
  }
  await fbMod.waitAuthReady();
  fbMod.onUser(async (u) => {
    if (u && ctx.user && u.uid === ctx.user.uid && ctx.store) return;
    ctx.user = u || null;
    if (u) { try { localStorage.setItem(LS_SCOPE, u.uid); localStorage.removeItem(LS_MODE); } catch (e) { /* ok */ } await enterScope(u.uid); }
    else if (mode === 'local') { await enterScope('local'); }
    else { stopScope(); showAuth(); }
    mode = null;
  });
}
boot().catch(e => { console.error(e); $('#app').innerHTML = `<div class="auth-wrap"><div class="auth"><div class="notice bad">${icon('triangle-alert')}<div><b>Não foi possível abrir o sistema.</b><div class="small">${esc(e.message || e)}</div><button class="btn sm" style="margin-top:8px" onclick="location.reload()">Tentar de novo</button></div></div></div></div>`; });

export { BB_TEMPLATE, rid, subjectMap, isRest };
