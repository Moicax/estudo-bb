// Ajustes: conta, perfil, plano, aparência, IA, dados e backup.
import { icon, esc, openDialog, confirmDialog, toast } from '../ui/dom.js';
import { isCivilDate, slug, today } from '../core/util.js';
import { PRESETS, DEFAULT_KEYS, aiMessage } from '../ai/ai.js';
import { buildBackup, parseBackup, runImport } from '../data/backup.js';
import { readLegacyFromStorage, LEGACY_KEY, LEGACY_Q_PREFIX } from '../data/legacy.js';
import { listScopes, openStore, deleteScope } from '../data/store.js';
import { BB_TEMPLATE } from '../data/catalog-bb.js';
import { ids } from '../data/schema.js';

const S = { tests: {}, snaps: null, scopes: null, installEvt: null };
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; });

function download(name, obj) {
  const blob = new Blob([typeof obj === 'string' ? obj : JSON.stringify(obj, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
const sel = (opts, v) => opts.map(([k, l]) => `<option value="${esc(k)}" ${String(v) === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('');

export function render(ctx) {
  const p = ctx.prefs(), prof = ctx.profile, plan = ctx.plan, k = ctx.ai.keys(), s = ctx.syncInfo();
  if (S.snaps === null) { S.snaps = []; ctx.store.listSnapshots().then(x => { S.snaps = x; ctx.render(); }); listScopes().then(x => { S.scopes = x; ctx.render(); }).catch(() => { S.scopes = []; }); }
  let h = `<header class="page-head"><h1>Ajustes</h1></header><div class="stack lg">`;

  // conta
  h += `<section class="card stack" aria-labelledby="aj-conta"><h2 id="aj-conta">Conta e sincronização</h2>`;
  if (!ctx.fbOn) h += `<div class="notice warn">${icon('cloud-off')}<div><b>A conta ainda não foi configurada.</b> Por enquanto tudo fica salvo só neste aparelho. Para usar em qualquer aparelho, é preciso criar o projeto no Firebase (passo a passo em docs/FIREBASE.md) e colar a configuração em js/config.js.</div></div>`;
  else if (ctx.user) h += `<div class="row"><span class="tag ok">${icon('circle-user', 'sm')}${esc(ctx.user.email || 'Conta Google')}</span><span class="sync" data-phase="${s.phase}" style="cursor:default"><span class="dot"></span>${esc(s.label)}</span></div><p class="small muted">${esc(s.detail)}</p>
      <div class="row"><button class="btn" data-act="sync-now">${icon('refresh-cw')}Sincronizar agora</button><button class="btn" data-act="sign-out">${icon('log-out')}Sair da conta</button></div>`;
  else h += `<p class="muted">Você está usando sem conta: os dados ficam só neste aparelho.</p><div class="row"><button class="btn primary" data-act="go-login">${icon('log-in')}Entrar ou criar conta</button></div><p class="hint">Ao entrar, você pode enviar o que está neste aparelho para a conta.</p>`;
  if (ctx.fbError) h += `<div class="notice bad">${icon('triangle-alert')}<div>${esc(ctx.fbError)}</div></div>`;
  h += '</section>';

  // perfil e estudo
  h += `<section class="card stack" aria-labelledby="aj-perfil"><h2 id="aj-perfil">Você e seu estudo</h2><div class="grid2">
    <div class="field"><label class="f" for="pf-n">Seu nome</label><input id="pf-n" type="text" value="${esc(prof ? prof.data.name : '')}" data-change="name"></div>
    <div class="field"><label class="f" for="pf-v">Velocidade dos vídeos</label><select id="pf-v" data-change="pref" data-k="videoSpeed" data-num="1">${sel([[1, '1x'], [1.25, '1,25x'], [1.5, '1,5x'], [1.75, '1,75x'], [2, '2x']], p.videoSpeed)}</select><p class="hint">Usada para calcular o tempo das aulas.</p></div>
    <div class="field"><label class="f" for="pf-f">Duração padrão do foco</label><select id="pf-f" data-change="pref" data-k="focusMin" data-num="1">${sel([[15, '15 min'], [25, '25 min'], [30, '30 min'], [45, '45 min'], [50, '50 min'], [60, '60 min'], [90, '90 min']], p.focusMin)}</select></div></div>
    <label class="check"><input type="checkbox" data-change="prefb" data-k="sound" ${p.sound ? 'checked' : ''}> Tocar um aviso sonoro quando o foco terminar</label></section>`;

  // plano
  if (plan) {
    const cfs = plan.data.customFields || [];
    h += `<section class="card stack" aria-labelledby="aj-plano"><h2 id="aj-plano">Plano</h2><div class="grid2">
      <div class="field"><label class="f" for="pl-n">Nome</label><input id="pl-n" type="text" value="${esc(plan.data.name)}" data-change="plan" data-k="name"></div>
      <div class="field"><label class="f" for="pl-g">Objetivo</label><input id="pl-g" type="text" value="${esc(plan.data.goal || '')}" data-change="plan" data-k="goal"></div>
      <div class="field"><label class="f" for="pl-b">Banca</label><input id="pl-b" type="text" value="${esc(plan.data.banca || '')}" data-change="plan" data-k="banca"></div>
      <div class="field"><label class="f" for="pl-e">Data da prova</label><input id="pl-e" type="date" value="${esc(plan.data.examDate || '')}" data-change="exam"><p class="hint">Deixe vazio enquanto o edital não sair.</p></div></div>
      <div><b class="small">Campos personalizados</b><p class="hint">Aparecem no registro de cada atividade (ex.: Fonte, Humor, Horas).</p>
      <div class="row" style="margin-top:8px">${cfs.map(cf => `<span class="chip">${esc(cf.name)}<button class="btn sm ghost icon" style="width:26px;min-height:26px" data-act="cf-del" data-id="${esc(cf.id)}" aria-label="Remover ${esc(cf.name)}">${icon('x', 'sm')}</button></span>`).join('') || '<span class="small muted">Nenhum.</span>'}</div>
      <div class="row" style="margin-top:8px"><label class="sr-only" for="cf-new">Novo campo</label><input id="cf-new" type="text" placeholder="Nome do campo" style="max-width:240px"><button class="btn sm" data-act="cf-add">${icon('plus', 'sm')}Adicionar</button></div></div></section>`;
  }

  // aparência
  h += `<section class="card stack" aria-labelledby="aj-ap"><h2 id="aj-ap">Aparência</h2><div class="grid2">
    <div class="field"><label class="f" for="ap-t">Tema</label><select id="ap-t" data-change="pref" data-k="theme">${sel([['system', 'Igual ao aparelho'], ['light', 'Claro'], ['dark', 'Escuro']], p.theme)}</select></div>
    <div class="field"><label class="f" for="ap-m">Animações</label><select id="ap-m" data-change="pref" data-k="motion">${sel([['system', 'Igual ao aparelho'], ['reduce', 'Reduzidas'], ['full', 'Completas']], p.motion)}</select></div></div>
    <label class="check"><input type="checkbox" data-change="prefb" data-k="celebrate" ${p.celebrate ? 'checked' : ''}> Comemoração breve ao concluir tudo do dia</label></section>`;

  // IA
  const ps = PRESETS[k.gptPreset] || PRESETS.openai;
  const field = (id, key, label, type = 'text', ph = '') => `<div class="field"><label class="f" for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(k[key] || '')}" data-change="key" data-k="${key}" autocomplete="off" spellcheck="false" ${ph ? `placeholder="${esc(ph)}"` : ''}></div>`;
  const test = (id) => `<button class="btn sm" data-act="ai-test" data-p="${id}">${icon('refresh-cw', 'sm')}Testar</button><span class="small muted" role="status">${esc(S.tests[id] || '')}</span>`;
  h += `<section class="card stack" aria-labelledby="aj-ia"><h2 id="aj-ia">Inteligência artificial</h2>
    <div class="notice info">${icon('lock')}<div>As chaves ficam <b>só neste aparelho</b>: não vão para a conta, para o backup nem para outros aparelhos, e são apagadas se você sair apagando os dados. Precisa de internet para usar a IA. Perguntas simples vão para a IA grátis; as avançadas, para o Claude.</div></div>
    <div class="stack"><div class="row"><b>1. Gemini</b><span class="tag ok">cota grátis com limite diário</span><a class="small" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Pegar chave</a></div>
      <div class="grid2">${field('k-gem', 'gemKey', 'Chave', 'password', 'AIza…')}${field('k-gemm', 'gemModel', 'Modelo')}</div><div class="row">${test('gemini')}</div></div>
    <div class="stack"><div class="row"><b>2. GPT ou compatível</b><span class="tag">${esc(ps.label)}</span><a class="small" href="${esc(ps.keyUrl)}" target="_blank" rel="noopener noreferrer">Pegar chave</a></div>
      <div class="grid2"><div class="field"><label class="f" for="k-gp">Serviço</label><select id="k-gp" data-change="preset">${sel(Object.entries(PRESETS).map(([id, x]) => [id, x.label]), k.gptPreset)}</select></div>${field('k-gpt', 'gptKey', 'Chave', 'password', 'sk-…')}${field('k-gptm', 'gptModel', 'Modelo')}${field('k-gptb', 'gptBase', 'Endereço da API', 'url')}</div><div class="row">${test('gpt')}</div></div>
    <div class="stack"><div class="row"><b>3. Claude (perguntas avançadas)</b><span class="tag warn">pago à parte</span></div>
      <p class="small muted">O plano Claude Pro não inclui chave de API. Sem chave, as avançadas usam a IA grátis e você tem o botão "Abrir no Claude", que leva a pergunta pronta para o seu Claude Pro.</p>
      <div class="grid2">${field('k-cla', 'claKey', 'Chave da API Anthropic', 'password', 'sk-ant-…')}${field('k-clam', 'claModel', 'Modelo')}</div><div class="row">${test('claude')}</div></div>
    <div class="grid2"><div class="field"><label class="f" for="k-o">Nas perguntas simples, tentar primeiro</label><select id="k-o" data-change="key" data-k="order">${sel([['gemini', 'Gemini, depois GPT'], ['gpt', 'GPT, depois Gemini']], k.order)}</select></div>
      <div class="field"><label class="f" for="k-l">Limite de pedidos por dia neste aparelho</label><input id="k-l" type="number" min="1" max="1000" value="${+k.limitDay || DEFAULT_KEYS.limitDay}" data-change="key" data-k="limitDay"><p class="hint">Hoje: ${ctx.ai.usage()} pedidos. Evita gastar a cota sem perceber.</p></div></div>
    <label class="check"><input type="checkbox" data-change="mathadv" ${prof?.data.ai?.mathAdvanced !== false ? 'checked' : ''}> Tratar questões de Matemática como avançadas (conta errada no gabarito pesa mais)</label>
    <div><button class="btn sm danger" data-act="ai-clear">${icon('trash-2', 'sm')}Apagar chaves deste aparelho</button></div></section>`;

  // dados
  const legacy = readLegacyFromStorage(localStorage);
  const localCopy = ctx.scope !== 'local' && (S.scopes || []).includes('local');
  h += `<section class="card stack" aria-labelledby="aj-dados"><h2 id="aj-dados">Dados e backup</h2>
    <p class="small muted">${ctx.store.count()} itens ${ctx.scope === 'local' ? 'neste aparelho' : 'nesta conta (cópia offline neste aparelho)'}.</p>
    <div class="row"><button class="btn" data-act="export">${icon('download')}Baixar backup completo</button><button class="btn" data-act="import">${icon('upload')}Restaurar ou importar backup</button></div>
    <p class="hint">O backup inclui planos, atividades, anotações, questões da IA com respostas, erros, simulados, sessões e exclusões. Formato documentado em docs/BACKUP.md. Não inclui as chaves de IA.</p>`;
  if (S.snaps && S.snaps.length) h += `<div><b class="small">Cópias de segurança guardadas neste aparelho</b><div class="list" style="margin-top:8px">${S.snaps.map(x => `<div class="item"><div class="body"><span class="title">${esc(x.reason)}</span><span class="sub">${new Date(x.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · ${Math.max(1, Math.round(x.size / 1024))} KB</span></div><button class="btn sm" data-act="snap-dl" data-id="${esc(x.id)}">${icon('download', 'sm')}Baixar</button><button class="btn sm ghost icon" data-act="snap-del" data-id="${esc(x.id)}" aria-label="Apagar cópia">${icon('trash-2', 'sm')}</button></div>`).join('')}</div></div>`;
  if (legacy) h += `<div class="notice">${icon('history')}<div class="grow"><b>Dados do sistema anterior ainda estão neste aparelho.</b><div class="small">Eles não são mais usados depois da importação. Baixe uma cópia antes de apagar.</div><div class="row" style="margin-top:8px"><button class="btn sm" data-act="legacy-import">${icon('upload', 'sm')}Importar de novo</button><button class="btn sm" data-act="legacy-dl">${icon('download', 'sm')}Baixar</button><button class="btn sm danger" data-act="legacy-del">${icon('trash-2', 'sm')}Apagar</button></div></div></div>`;
  if (localCopy) h += `<div class="notice">${icon('smartphone')}<div class="grow"><b>Há dados de uso sem conta neste aparelho.</b><div class="small">${ctx.store.getMeta('imported:local') ? 'Já foram enviados para esta conta.' : 'Ainda não foram enviados para esta conta.'}</div><div class="row" style="margin-top:8px"><button class="btn sm" data-act="local-import">${icon('upload', 'sm')}Enviar para a conta</button><button class="btn sm danger" data-act="local-del">${icon('trash-2', 'sm')}Apagar do aparelho</button></div></div></div>`;
  h += '</section>';

  // instalar e sobre
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  h += `<section class="card stack" aria-labelledby="aj-app"><h2 id="aj-app">Usar como aplicativo</h2>
    ${standalone ? `<p>${icon('circle-check', 'sm')} Instalado neste aparelho.</p>` : S.installEvt ? `<div><button class="btn primary" data-act="install">${icon('smartphone')}Instalar neste aparelho</button></div>` : '<p class="small muted">Android ou computador (Chrome/Edge): menu ⋮ e depois "Instalar app". iPhone (Safari): Compartilhar e depois "Adicionar à Tela de Início".</p>'}
    <p class="small muted">Instalado, abre pelo ícone e funciona sem internet (vídeos, IA e sincronização precisam de conexão).</p>
    <p class="small muted">Meu Estudo ${esc(ctx.version)} · código em <a href="https://github.com/Moicax/estudo-bb" target="_blank" rel="noopener noreferrer">github.com/Moicax/estudo-bb</a></p></section></div>`;
  return h;
}

async function setPref(ctx, k, v) {
  const prof = ctx.profile;
  if (!prof) return;
  await ctx.store.patch('profile', { prefs: { ...(prof.data.prefs || {}), [k]: v } });
}

export const actions = {
  async 'cf-add'(el, e, ctx) {
    const inp = document.getElementById('cf-new'), name = inp.value.trim(); if (!name) { inp.focus(); return; }
    const plan = ctx.plan, list = plan.data.customFields || [], id = ids.customField(name);
    if (list.some(x => x.id === id)) { toast('Esse campo já existe.', { icon: 'info' }); return; }
    await ctx.store.patch(plan.id, { customFields: [...list, { id, name }] }); toast('Campo adicionado.');
  },
  async 'cf-del'(el, e, ctx) {
    const plan = ctx.plan;
    if (!(await confirmDialog({ title: 'Remover este campo?', text: 'O campo some do registro das atividades. O que já foi escrito nele continua guardado nas atividades e volta se você criar um campo com o mesmo nome.', ok: 'Remover' }))) return;
    await ctx.store.patch(plan.id, { customFields: (plan.data.customFields || []).filter(x => x.id !== el.dataset.id) });
  },
  async 'ai-test'(el, e, ctx) {
    const p = el.dataset.p; S.tests[p] = 'Testando…'; ctx.render();
    try { const r = await ctx.ai.test(p); S.tests[p] = 'Funcionando ✓ (respondeu: ' + r + ')'; } catch (err) { S.tests[p] = aiMessage({ provider: '', ...err }); }
    ctx.render();
  },
  async 'ai-clear'(el, e, ctx) { if (await confirmDialog({ title: 'Apagar as chaves de IA deste aparelho?', text: 'Você poderá colar de novo depois.', ok: 'Apagar', danger: true })) { await ctx.ai.clearKeys(); S.tests = {}; ctx.render(); toast('Chaves apagadas deste aparelho.'); } },
  export(el, e, ctx) {
    const bk = buildBackup(ctx.store, { appVersion: ctx.version, scopeLabel: ctx.scope === 'local' ? 'aparelho' : 'conta' });
    download(`meu-estudo-backup-${today()}.json`, bk); toast('Backup baixado.', { icon: 'download' });
  },
  import(el, e, ctx) {
    const d = openDialog(`<h2>Restaurar ou importar backup</h2><p class="muted small" style="margin-top:4px">Aceita o backup deste sistema e o texto "Copiar backup" do sistema anterior. Nada é apagado: o que já existe é conciliado, e edições mais novas são mantidas.</p>
      <div class="field" style="margin-top:12px"><label class="f" for="im-f">Arquivo</label><input id="im-f" type="file" accept=".json,application/json,text/plain"></div>
      <div class="field" style="margin-top:8px"><label class="f" for="im-t">Ou cole o texto</label><textarea id="im-t" style="font-family:ui-monospace,monospace;font-size:12px"></textarea></div>
      <div id="im-r" role="status" style="margin-top:8px"></div>
      <div class="dialog-actions"><button class="btn" data-close>Cancelar</button><button class="btn" id="im-check">${icon('search')}Conferir</button><button class="btn primary" id="im-go" disabled>${icon('upload')}Importar</button></div>`, { label: 'Importar backup', wide: true });
    let parsed = null;
    const R = d.el.querySelector('#im-r');
    d.el.querySelector('#im-f').onchange = async (ev) => { const f = ev.target.files[0]; if (f) { d.el.querySelector('#im-t').value = await f.text(); check(); } };
    const check = () => {
      parsed = parseBackup(d.el.querySelector('#im-t').value, BB_TEMPLATE);
      d.el.querySelector('#im-go').disabled = !parsed.ok;
      if (!parsed.ok) { R.innerHTML = `<div class="notice bad">${icon('triangle-alert')}<div>${esc(parsed.error)}</div></div>`; return; }
      const c = {}; for (const r of parsed.records) if (!r.deleted) c[r.kind] = (c[r.kind] || 0) + 1;
      R.innerHTML = `<div class="notice ok">${icon('circle-check')}<div><b>${parsed.type === 'v1' ? 'Backup do sistema anterior' : 'Backup deste sistema'}${parsed.exportedAt ? ' de ' + new Date(parsed.exportedAt).toLocaleString('pt-BR') : ''}</b><div class="small">${c.activity || 0} atividades · ${c.question || 0} questões · ${c.attempt || 0} respostas · ${c.errorEntry || 0} erros · ${c.simulation || 0} simulados · ${c.note || 0} anotações${parsed.rejected ? ` · ${parsed.rejected} itens ilegíveis ignorados` : ''}</div></div></div>`;
    };
    d.el.querySelector('#im-check').onclick = check;
    d.el.querySelector('#im-go').onclick = async () => {
      if (!parsed || !parsed.ok) return;
      const go = d.el.querySelector('#im-go'); go.disabled = true;
      await ctx.store.addSnapshot('Antes de importar um backup', buildBackup(ctx.store, { appVersion: ctx.version }));
      R.innerHTML = `<div class="bar" data-k="imp"><i style="--p:0"></i></div><p class="small muted">Importando…</p>`;
      const job = await runImport(ctx.store, parsed.records, { jobKey: parsed.jobKey + ':' + Date.now(), onProgress: (a, b) => { const i = R.querySelector('i'); if (i) i.style.setProperty('--p', (a / b).toFixed(3)); } });
      if (parsed.type === 'v1' && !ctx.store.get('profile')?.data.activePlanId) await ctx.store.patch('profile', { activePlanId: BB_TEMPLATE.planId });
      d.close(); S.snaps = null;
      toast(`Importado: ${job.added} novos, ${job.merged} conciliados${job.versions ? `, ${job.versions} versões guardadas` : ''}.`, { ms: 7000 });
    };
  },
  async 'snap-dl'(el, e, ctx) { const s = await ctx.store.getSnapshot(el.dataset.id); if (s) download(`meu-estudo-copia-${slug(s.reason)}.json`, s.payload); },
  async 'snap-del'(el, e, ctx) { if (await confirmDialog({ title: 'Apagar esta cópia de segurança?', text: 'Ela só existe neste aparelho. Baixe antes se quiser guardar.', ok: 'Apagar', danger: true })) { await ctx.store.deleteSnapshot(el.dataset.id); S.snaps = null; ctx.render(); } },
  'legacy-dl'() { const l = readLegacyFromStorage(localStorage); if (l) download('meu-estudo-sistema-anterior.json', { legacy: l.state, sets: l.sets }); },
  async 'legacy-import'(el, e, ctx) { ctx.skipWelcome = false; await ctx.store.delMeta('welcome:dismissed'); try { localStorage.removeItem('meu-estudo:legacy-imported'); } catch (er) { /* ok */ } await ctx.enterScope(ctx.scope); },
  async 'legacy-del'(el, e, ctx) {
    if (!(await confirmDialog({ title: 'Apagar os dados do sistema anterior deste aparelho?', text: 'Confira antes se a importação trouxe tudo. Se quiser, baixe uma cópia primeiro. Isso não mexe nos dados do sistema novo.', ok: 'Apagar', danger: true }))) return;
    const ks = []; for (let i = 0; i < localStorage.length; i++) { const kk = localStorage.key(i); if (kk === LEGACY_KEY || kk.startsWith(LEGACY_Q_PREFIX) || kk === 'estudo-bb-chaves') ks.push(kk); }
    ks.forEach(kk => localStorage.removeItem(kk)); ctx.render(); toast('Dados antigos apagados deste aparelho.');
  },
  async 'local-import'(el, e, ctx) {
    const ls = await openStore('local'); const recs = ls.allPublic({ includeDeleted: true }); ls.close();
    const job = await runImport(ctx.store, recs, { jobKey: 'job:scope:local:' + Date.now() });
    await ctx.store.setMeta('imported:local', Date.now()); toast(`Enviado: ${job.added} novos, ${job.merged} conciliados.`); ctx.render();
  },
  async 'local-del'(el, e, ctx) {
    if (!(await confirmDialog({ title: 'Apagar os dados de uso sem conta?', text: ctx.store.getMeta('imported:local') ? 'Eles já foram enviados para esta conta.' : 'Atenção: eles ainda não foram enviados para esta conta.', ok: 'Apagar', danger: true }))) return;
    await deleteScope('local'); S.scopes = null; S.snaps = null; ctx.render(); toast('Dados de uso sem conta apagados deste aparelho.');
  },
  async install(el, e, ctx) { if (!S.installEvt) return; const ev = S.installEvt; S.installEvt = null; ev.prompt(); try { await ev.userChoice; } catch (er) { /* ok */ } ctx.render(); },
};
export const changes = {
  async name(el, e, ctx) { await ctx.store.patch('profile', { name: el.value.trim() }); },
  async pref(el, e, ctx) { await setPref(ctx, el.dataset.k, el.dataset.num ? +el.value : el.value); },
  async prefb(el, e, ctx) { await setPref(ctx, el.dataset.k, el.checked); },
  async plan(el, e, ctx) { const v = el.value.trim(); if (el.dataset.k === 'name' && !v) { el.value = ctx.plan.data.name; return; } await ctx.store.patch(ctx.plan.id, { [el.dataset.k]: v }); },
  async exam(el, e, ctx) { await ctx.store.patch(ctx.plan.id, { examDate: isCivilDate(el.value) ? el.value : null }); },
  async key(el, e, ctx) {
    let v = el.value.trim();
    if (/Key$/.test(el.dataset.k)) { v = v.replace(/[^\x21-\x7E]/g, ''); el.value = v; S.tests = {}; }
    await ctx.ai.setKeys({ [el.dataset.k]: el.dataset.k === 'limitDay' ? Math.max(1, +el.value || DEFAULT_KEYS.limitDay) : v });
  },
  async preset(el, e, ctx) { const ps = PRESETS[el.value] || PRESETS.openai; await ctx.ai.setKeys({ gptPreset: el.value, gptBase: ps.base, gptModel: ps.model }); ctx.render(); },
  async mathadv(el, e, ctx) { const prof = ctx.profile; await ctx.store.patch('profile', { ai: { ...(prof.data.ai || {}), mathAdvanced: el.checked } }); },
};
