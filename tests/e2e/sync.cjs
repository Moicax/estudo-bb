// Dois aparelhos reais no navegador (contextos separados), conta no emulador do Firebase.
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = 'http://127.0.0.1:8765/?emu=1';
const EMAIL = 'moises' + Date.now() + '@teste.dev', PASS = 'senha-forte-123';
const log = (...a) => console.log(...a);
async function until(fn, ms = 15000, what = '') { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await fn()) return true; } catch (e) { } await new Promise(r => setTimeout(r, 250)); } throw new Error('tempo esgotado: ' + what); }
const syncLabel = (p) => p.evaluate(() => window.__ctx.syncInfo().label);
const rec = (p, id) => p.evaluate((id) => { const r = window.__ctx.store.getRaw(id); return r ? { ...r.data, _deleted: r.deleted } : null; }, id);
async function login(p, mode) {
  await p.goto(BASE + '#hoje'); await p.waitForSelector('#au-email', { timeout: 20000 });
  if (mode === 'up') { await p.click('[data-act="mode"][data-m="up"]'); await p.waitForSelector('#au-name'); }
  await p.fill('#au-email', EMAIL); await p.fill('#au-pass', PASS); await p.click('form[data-form=auth] button[type=submit]');
}
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const mk = async (vp) => { const c = await b.newContext({ viewport: vp }); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Firestore|identitytoolkit|400|net::ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text())) errs.push(m.text()); }); return { c, p }; };
  const A = await mk({ width: 1280, height: 860 }), B = await mk({ width: 390, height: 844 });

  // A: cria conta e começa pelo modelo BB
  await login(A.p, 'up');
  await A.p.waitForSelector('[data-act="start-bb"]', { timeout: 20000 });
  await A.p.click('[data-act="start-bb"]'); await A.p.waitForSelector('.hero', { timeout: 15000 });
  await until(async () => (await syncLabel(A.p)) === 'Sincronizado', 30000, 'A sincronizado');
  log('A conta criada, plano BB, status:', await syncLabel(A.p));
  await A.p.screenshot({ path: 'tests/out/10-desktop-hoje.png' });

  // B: entra na mesma conta e recebe tudo
  await login(B.p, 'in');
  await B.p.waitForSelector('.hero', { timeout: 30000 });
  const nB = await B.p.evaluate(() => window.__ctx.store.list('activity').length);
  log('B entrou e baixou', nB, 'atividades');

  const today = await A.p.evaluate(() => window.__ctx.store.list('activity').find(a => a.data.date === '2026-11-16').id);
  // A conclui a atividade de hoje -> B vê
  await A.p.click(`.hero [data-act="toggle-done"]`);
  await until(async () => (await rec(B.p, today)).status === 'done', 15000, 'B recebe concluída');
  log('A concluiu hoje -> B recebeu: ok');

  // offline em A: conclui 17/11 e escreve anotação no 18/11
  const d17 = await A.p.evaluate(() => window.__ctx.store.list('activity').find(a => a.data.date === '2026-11-17').id);
  const d18 = await A.p.evaluate(() => window.__ctx.store.list('activity').find(a => a.data.date === '2026-11-18').id);
  const d19 = await A.p.evaluate(() => window.__ctx.store.list('activity').find(a => a.data.date === '2026-11-19').id);
  await A.c.setOffline(true);
  await A.p.goto(BASE + '#agenda'); await A.p.waitForTimeout(600);
  await A.p.click(`.done-btn[data-id="${d17}"]`);
  await A.p.goto(BASE + '#estudo/' + d18); await A.p.waitForSelector('#st-note');
  await A.p.fill('#st-note', 'Anotação escrita sem internet'); await A.p.waitForTimeout(700);
  const offLbl = await syncLabel(A.p);
  log('A offline, status:', offLbl);
  await A.p.screenshot({ path: 'tests/out/11-desktop-offline.png' });

  // B, ao mesmo tempo, mexe no MESMO registro do 19/11 (campo diferente) e A conclui o 19/11 offline
  await B.p.goto(BASE + '#estudo/' + d19); await B.p.waitForSelector('#st-note');
  await B.p.fill('#st-note', 'Anotação do celular'); await B.p.waitForTimeout(700);
  await A.p.goto(BASE + '#agenda'); await A.p.waitForTimeout(500);
  await A.p.click(`.done-btn[data-id="${d19}"]`);
  await A.c.setOffline(false); await A.p.evaluate(() => dispatchEvent(new Event('online')));
  await until(async () => (await rec(B.p, d17)).status === 'done' && (await rec(B.p, d18)).note === 'Anotação escrita sem internet', 20000, 'B recebe alterações offline');
  log('A voltou a ficar online -> B recebeu as alterações feitas offline: ok');
  await until(async () => { const a = await rec(A.p, d19), b2 = await rec(B.p, d19); return a.status === 'done' && a.note === 'Anotação do celular' && b2.status === 'done' && b2.note === 'Anotação do celular'; }, 20000, 'mesmo registro, campos diferentes');
  log('mesmo registro, campos diferentes em dois aparelhos: os dois valeram');

  // exclusão em A não volta em B (que estava offline e editou)
  const d20 = await A.p.evaluate(() => window.__ctx.store.list('activity').find(a => a.data.date === '2026-11-20').id);
  await until(async () => !!(await rec(B.p, d20)), 10000, 'B tem 20/11');
  await B.c.setOffline(true); await B.p.evaluate(() => dispatchEvent(new Event('offline')));
  await A.p.goto(BASE + '#estudo/' + d20); await A.p.waitForSelector('[data-act="delete"]');
  await A.p.click('[data-act="delete"]'); await A.p.click('[data-close="yes"]');
  await A.p.waitForTimeout(6500);
  await until(async () => (await rec(A.p, d20))._deleted && (await A.p.evaluate(() => window.__ctx.store.dirtyCount())) === 0, 15000, 'A enviou exclusão');
  await B.p.evaluate((id) => window.__ctx.store.patch(id, { note: 'editado offline depois da exclusão' }), d20);
  await B.c.setOffline(false); await B.p.evaluate(() => dispatchEvent(new Event('online')));
  await until(async () => (await rec(B.p, d20))._deleted && (await B.p.evaluate(() => window.__ctx.store.dirtyCount())) === 0, 20000, 'B respeita exclusão');
  await A.p.waitForTimeout(1500);
  log('exclusão: A excluiu, B (offline) editou; resultado: excluída nos dois =', (await rec(A.p, d20))._deleted && (await rec(B.p, d20))._deleted,
    '| versão do texto guardada em B =', await B.p.evaluate((id) => window.__ctx.store.list('version').some(v => v.data.targetId === id), d20));

  // cronômetro: iniciar, recarregar, pausar, recarregar
  await A.p.goto(BASE + '#estudo/' + d18); await A.p.waitForSelector('[data-act="t-start"]');
  await A.p.selectOption('#t-min', '25'); await A.p.click('[data-act="t-start"]'); await A.p.waitForSelector('#clock');
  await A.p.waitForTimeout(2200); await A.p.reload(); await A.p.waitForSelector('#clock', { timeout: 20000 });
  const c1 = await A.p.locator('#clock').innerText(); await A.p.waitForTimeout(1500); const c2 = await A.p.locator('#clock').innerText();
  await A.p.click('[data-act="t-pause"]'); await A.p.waitForTimeout(300); await A.p.reload(); await A.p.waitForSelector('[data-act="t-resume"]', { timeout: 20000 });
  const sessions = await A.p.evaluate(() => window.__ctx.store.list('session').length);
  log('cronômetro após recarregar:', c1, '->', c2, '| pausado após recarregar: ok | sessões registradas:', sessions);
  await until(async () => (await B.p.evaluate(() => window.__ctx.store.list('session').length)) === 1, 15000, 'sessão em B');
  log('sessão aparece no outro aparelho sem duplicar: ok');

  // outra conta não vê nada
  const C = await mk({ width: 390, height: 844 });
  await C.p.goto(BASE + '#hoje'); await C.p.waitForSelector('#au-email', { timeout: 20000 });
  await C.p.click('[data-act="mode"][data-m="up"]'); await C.p.fill('#au-email', 'outra' + Date.now() + '@teste.dev'); await C.p.fill('#au-pass', PASS); await C.p.click('form[data-form=auth] button[type=submit]');
  try { await C.p.waitForSelector('[data-act="start-bb"]', { timeout: 45000 }); } catch (e) { await C.p.screenshot({ path: 'tests/out/14-c-fail.png' }); throw e; }
  log('outra conta: começa vazia, registros =', await C.p.evaluate(() => window.__ctx.store.count()));

  // sair apagando os dados deste aparelho
  await A.p.goto(BASE + '#ajustes'); await A.p.waitForSelector('[data-act="sign-out"]');
  const uid = await A.p.evaluate(() => window.__ctx.scope);
  await A.p.click('[data-act="sign-out"]'); await A.p.click('[data-close="wipe"]');
  await A.p.waitForSelector('#au-email', { timeout: 15000 });
  const dbs = await A.p.evaluate(async () => (await indexedDB.databases()).map(d => d.name));
  log('saiu e apagou: banco da conta removido =', !dbs.includes('meu-estudo:' + uid));
  await B.p.goto(BASE + '#hoje'); await B.p.waitForTimeout(800);
  await B.p.screenshot({ path: 'tests/out/12-mobile-hoje-sync.png' });
  log('erros de página:', JSON.stringify(errs.slice(0, 8)));
  await b.close();
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
