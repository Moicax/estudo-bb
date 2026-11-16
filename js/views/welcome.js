// Primeiro acesso: importar dados do sistema antigo / deste aparelho, ou escolher como começar.
import { icon, esc, bar, toast } from '../ui/dom.js';
import { readLegacyFromStorage, legacyFingerprint } from '../data/legacy.js';
import { migrateLegacy, runImport } from '../data/backup.js';
import { openStore, listScopes } from '../data/store.js';
import { BB_TEMPLATE, BB_PLAN_ID } from '../data/catalog-bb.js';
import { planBaseRecords, planScheduleRecords } from '../data/template.js';
import { makeRecord, ids } from '../data/schema.js';
import { rid, slug, isCivilDate, today as todayCivil } from '../core/util.js';

const LS_IMPORTED = 'meu-estudo:legacy-imported';
function importedMap() { try { return JSON.parse(localStorage.getItem(LS_IMPORTED) || '{}'); } catch (e) { return {}; } }
function markImported(scope, fp) { const m = importedMap(); m[scope] = fp; try { localStorage.setItem(LS_IMPORTED, JSON.stringify(m)); } catch (e) { /* ok */ } }

let W = { legacy: null, local: null, busy: false, progress: 0, total: 0, error: null, step: 'choose' };

export async function prepare(ctx) {
  W = { legacy: null, local: null, busy: false, progress: 0, total: 0, error: null, step: 'choose' };
  const lg = readLegacyFromStorage(localStorage);
  if (lg) {
    const fp = legacyFingerprint(lg.state);
    const job = ctx.store.getMeta('job:legacy:' + fp);
    if (importedMap()[ctx.scope] !== fp && !(job && job.status === 'done')) {
      const st = lg.state;
      W.legacy = { ...lg, fp, counts: { dias: st.rows.filter(r => r.st === 'Feito' && r.mat !== 'Folga').length, total: st.rows.length, notas: Object.keys(st.vn || {}).length + st.rows.filter(r => r.nota).length, erros: (st.erros || []).length, sims: (st.sims || []).length, questoes: Object.values(lg.sets).reduce((n, s) => n + s.items.length, 0) }, partial: job && job.status !== 'done' ? job : null };
    }
  }
  if (ctx.scope !== 'local' && !ctx.store.getMeta('imported:local')) {
    const scopes = await listScopes().catch(() => []);
    if (scopes.includes('local')) {
      const ls = await openStore('local');
      const n = ls.count();
      if (n > 0) W.local = { count: n, records: ls.allPublic({ includeDeleted: true }) };
      ls.close();
    }
  }
}
export function needed(ctx) {
  const dismissed = ctx.store.getMeta('welcome:dismissed');
  return (!dismissed && (W.legacy || W.local)) || !ctx.store.list('plan').length;
}

export function render(ctx) {
  const where = ctx.scope === 'local' ? 'neste aparelho' : 'na sua conta';
  const head = `<div class="brand"><span class="brand-mark">${icon('book-open')}</span>Meu Estudo</div>`;
  if (W.busy) {
    const p = W.total ? W.progress / W.total : 0;
    return head + `<h1>Importando seus estudos</h1><p class="muted">Não feche esta página. Se fechar, a importação continua de onde parou na próxima vez.</p>
      <div class="bar" data-k="imp"><i style="--p:${p.toFixed(3)}"></i></div><p class="small muted" role="status">${W.progress} de ${W.total} itens</p>`;
  }
  if (W.step === 'done') {
    return head + `<div class="notice ok">${icon('circle-check')}<div><b>Importação concluída.</b><div class="small">${esc(W.summary || '')}</div></div></div>
      <p class="muted small">Os dados antigos continuam guardados neste aparelho como cópia de segurança. Você pode baixá-los ou apagá-los em Ajustes, Dados.</p>
      <button class="btn primary lg block" data-act="finish">${icon('arrow-right')}Ir para Hoje</button>`;
  }
  if (W.legacy || W.local) {
    const L = W.legacy, C = L && L.counts;
    return head + `<div><h1>Encontramos estudos neste aparelho</h1><p class="muted" style="margin-top:6px">Traga tudo para ${where}. Antes de importar, guardamos uma cópia de segurança. Nada é apagado.</p></div>
    ${W.error ? `<div class="notice bad">${icon('triangle-alert')}<div>${esc(W.error)}</div></div>` : ''}
    ${L ? `<div class="card stack">
      <div class="row"><span class="tag info">${icon('history', 'sm')}Sistema anterior</span>${L.partial ? '<span class="tag warn">Importação interrompida: continua de onde parou</span>' : ''}</div>
      <p><b>${C.dias}</b> de ${C.total} dias concluídos · <b>${C.notas}</b> anotações · <b>${C.erros}</b> erros · <b>${C.sims}</b> simulados · <b>${C.questoes}</b> questões da IA</p>
      <div class="row"><button class="btn primary" data-act="import-legacy">${icon('download')}Importar para ${where}</button><button class="btn" data-act="download-legacy">${icon('hard-drive-download')}Baixar cópia</button></div></div>` : ''}
    ${W.local ? `<div class="card stack"><div class="row"><span class="tag">${icon('smartphone', 'sm')}Usado sem conta neste aparelho</span></div>
      <p><b>${W.local.count}</b> itens salvos só neste aparelho.</p>
      <div class="row"><button class="btn primary" data-act="import-local">${icon('upload')}Enviar para a conta</button></div></div>` : ''}
    <button class="btn ghost" data-act="dismiss">Agora não</button>
    <p class="small muted">Você pode fazer isso depois em Ajustes, Dados.</p>`;
  }
  // sem plano: escolher como começar
  return head + `<div><h1>Como você quer começar?</h1><p class="muted" style="margin-top:6px">Dá para mudar tudo depois.</p></div>
    <button class="card stack" style="text-align:left;cursor:pointer" data-act="start-bb">
      <div class="row"><span class="tag ok">${icon('graduation-cap', 'sm')}Modelo pronto</span></div>
      <h2>Banco do Brasil 2026 · Escriturário</h2>
      <p class="muted small">13 semanas a partir de 16/11/2026, 8 matérias, 192 aulas gratuitas já organizadas por dia. Pesos estimados do edital de 2023.</p>
    </button>
    <div class="card stack">
      <div class="row"><span class="tag">${icon('plus', 'sm')}Plano em branco</span></div>
      <div class="field"><label class="f" for="bp-name">Nome do plano</label><input id="bp-name" type="text" placeholder="Ex.: INSS 2027, Inglês, Faculdade"></div>
      <div class="field"><label class="f" for="bp-subj">Matérias (uma por linha)</label><textarea id="bp-subj" placeholder="Português\nMatemática\nInformática"></textarea></div>
      <div class="field"><label class="f" for="bp-exam">Data da prova (opcional)</label><input id="bp-exam" type="date"></div>
      <p class="hint">Você adiciona as atividades na Agenda. A montagem automática do cronograma a partir do edital chega na próxima etapa.</p>
      <button class="btn" data-act="start-blank">${icon('plus')}Criar plano em branco</button>
    </div>`;
}

async function ensureProfile(ctx, planId) {
  const p = ctx.store.get('profile');
  if (!p) await ctx.store.put('profile', 'profile', null, { name: (ctx.user && ctx.user.displayName) || '', prefs: { videoSpeed: 1.25, focusMin: 25, sound: true, theme: 'system', motion: 'system', celebrate: true }, ai: { mathAdvanced: true }, activePlanId: planId });
  else if (!p.data.activePlanId || !ctx.store.get('plan_' + p.data.activePlanId)) await ctx.store.patch('profile', { activePlanId: planId });
}

export const actions = {
  async 'import-legacy'(el, e, ctx) {
    W.busy = true; W.error = null; W.progress = 0; W.total = 1; ctx.render();
    try {
      const job = await migrateLegacy(ctx.store, W.legacy, BB_TEMPLATE, { chunk: 60, onProgress: (d, t) => { W.progress = d; W.total = t; ctx.render(); } });
      await ensureProfile(ctx, BB_PLAN_ID);
      markImported(ctx.scope, W.legacy.fp);
      W.summary = `${job.added} itens novos, ${job.merged} conciliados com o que já existia${job.versions ? `, ${job.versions} textos diferentes guardados como versão` : ''}.`;
      W.legacy = null; W.busy = false; W.step = W.local ? 'choose' : 'done';
      if (W.step === 'choose') toast('Dados do sistema anterior importados.');
    } catch (err) { console.error(err); W.busy = false; W.error = 'A importação parou: ' + (err.message || err) + '. Tente de novo: ela continua de onde parou.'; }
    ctx.render();
  },
  async 'import-local'(el, e, ctx) {
    W.busy = true; W.error = null; W.progress = 0; W.total = W.local.records.length; ctx.render();
    try {
      const job = await runImport(ctx.store, W.local.records, { jobKey: 'job:scope:local', chunk: 80, onProgress: (d, t) => { W.progress = d; W.total = t; ctx.render(); } });
      await ctx.store.setMeta('imported:local', Date.now());
      const plans = ctx.store.list('plan'); if (plans.length) await ensureProfile(ctx, plans[0].planId);
      W.summary = `${job.added} itens novos, ${job.merged} conciliados${job.versions ? `, ${job.versions} versões guardadas` : ''}.`;
      W.local = null; W.busy = false; W.step = W.legacy ? 'choose' : 'done';
    } catch (err) { console.error(err); W.busy = false; W.error = 'O envio parou: ' + (err.message || err) + '. Tente de novo.'; }
    ctx.render();
  },
  'download-legacy'() {
    const blob = new Blob([JSON.stringify({ legacy: W.legacy.state, sets: W.legacy.sets }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'meu-estudo-sistema-anterior.json'; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  },
  async dismiss(el, e, ctx) {
    await ctx.store.setMeta('welcome:dismissed', Date.now());
    W.legacy = null; W.local = null;
    if (!ctx.store.list('plan').length) ctx.render(); else ctx.finishWelcome();
  },
  finish(el, e, ctx) { ctx.finishWelcome(); },
  async 'start-bb'(el, e, ctx) {
    el.disabled = true;
    await ctx.store.importRecords([...planBaseRecords(BB_TEMPLATE), ...planScheduleRecords(BB_TEMPLATE)]);
    await ensureProfile(ctx, BB_PLAN_ID);
    toast('Plano Banco do Brasil 2026 criado.');
    ctx.finishWelcome();
  },
  async 'start-blank'(el, e, ctx) {
    const name = document.getElementById('bp-name').value.trim();
    if (!name) { const i = document.getElementById('bp-name'); i.setAttribute('aria-invalid', 'true'); i.focus(); toast('Dê um nome ao plano.', { icon: 'info' }); return; }
    const planId = slug(name).slice(0, 24) + '-' + rid().slice(0, 4);
    const exam = document.getElementById('bp-exam').value;
    const subs = document.getElementById('bp-subj').value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 30);
    const start = todayCivil();
    const recs = [makeRecord('plan', ids.plan(planId), planId, { name, goal: '', banca: '', start, examDate: isCivilDate(exam) ? exam : null, status: 'active', template: null, lightWeeks: [], weightsSource: { label: 'Não informado', status: 'pendente', note: '' }, customFields: [], availability: { days: [1, 2, 3, 4, 5, 6], minutesPerDay: null }, notes: '' }, { updatedAt: Date.now() })];
    subs.forEach((s, i) => recs.push(makeRecord('subject', ids.subject(planId, s), planId, { name: s, hue: (i * 47 + 150) % 360, weight: null, order: i, role: 'subject', weightStatus: null }, { updatedAt: Date.now() })));
    await ctx.store.importRecords(recs);
    await ensureProfile(ctx, planId);
    if (ctx.store.get('profile').data.activePlanId !== planId) await ctx.store.patch('profile', { activePlanId: planId });
    toast('Plano criado. Adicione as atividades na Agenda.');
    ctx.finishWelcome();
  },
};
