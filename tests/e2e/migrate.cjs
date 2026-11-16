// Sistema antigo -> uso sem conta -> primeiro login: os dados sobem para a conta sem duplicar.
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = 'http://127.0.0.1:8765/?emu=1';
const legacy = fs.readFileSync(__dirname + '/../unit/fixtures/legacy-state.json', 'utf8');
const sets = JSON.parse(fs.readFileSync(__dirname + '/../unit/fixtures/legacy-sets.json', 'utf8'));
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(([l, s]) => { if (!localStorage.getItem('seeded')) { localStorage.setItem('estudo-bb-v1', l); for (const k in s) localStorage.setItem('estudo-bb-q-' + k, JSON.stringify(s[k])); localStorage.setItem('seeded', '1'); } }, [legacy, sets]);
  await p.goto(BASE + '#hoje'); await p.waitForSelector('[data-act="use-local"]', { timeout: 20000 });
  await p.click('[data-act="use-local"]'); await p.waitForSelector('[data-act="import-legacy"]');
  await p.click('[data-act="import-legacy"]'); await p.waitForSelector('[data-act="finish"]', { timeout: 20000 }); await p.click('[data-act="finish"]');
  const localCount = await p.evaluate(() => window.__ctx.store.count());
  console.log('sem conta: importados', localCount, 'itens; escopo =', await p.evaluate(() => window.__ctx.scope));
  await p.goto(BASE + '#ajustes'); await p.click('[data-act="go-login"]'); await p.waitForSelector('#au-email');
  await p.click('[data-act="mode"][data-m="up"]'); await p.waitForSelector('#au-name'); await p.fill('#au-email', 'mig' + Date.now() + '@teste.dev'); await p.fill('#au-pass', 'senha-forte-123'); await p.click('form[data-form=auth] button[type=submit]');
  try { await p.waitForSelector('[data-act="import-local"], [data-act="import-legacy"]', { timeout: 40000 }); } catch (e) { await p.screenshot({ path: 'tests/out/31-fail.png' }); console.log('hash', await p.evaluate(() => location.hash), 'route', await p.evaluate(() => JSON.stringify(window.__ctx.route)), 'scope', await p.evaluate(() => window.__ctx.scope), 'h1', await p.locator('h1').first().innerText().catch(() => '-')); throw e; }
  const offers = await p.evaluate(() => [...document.querySelectorAll('[data-act^="import-"]')].map(b => b.dataset.act));
  console.log('primeiro login oferece:', offers.join(', '));
  await p.screenshot({ path: 'tests/out/30-first-login.png' });
  for (const a of offers) { await p.click(`[data-act="${a}"]`); await p.waitForFunction(() => !document.querySelector('.bar[data-k="imp"]'), null, { timeout: 30000 }); await p.waitForTimeout(400); }
  await p.waitForSelector('[data-act="finish"]', { timeout: 20000 }); await p.click('[data-act="finish"]');
  const n = await p.evaluate(() => window.__ctx.store.count());
  const dup = await p.evaluate(() => { const s = window.__ctx.store; const acts = s.list('activity'); const keys = new Set(acts.map(a => a.data.date + a.data.subjectId + a.data.title)); return acts.length - keys.size; });
  await p.waitForFunction(() => window.__ctx.syncInfo().label === 'Sincronizado', null, { timeout: 40000 });
  const q = await p.evaluate(() => window.__ctx.store.list('question').length);
  console.log('na conta:', n, 'itens (sem conta eram', localCount + ') · atividades duplicadas:', dup, '· questões da IA:', q, '·', await p.evaluate(() => window.__ctx.syncInfo().label));
  console.log('dados antigos continuam no aparelho:', await p.evaluate(() => !!localStorage.getItem('estudo-bb-v1')), '· cópia de segurança:', (await p.evaluate(() => window.__ctx.store.listSnapshots())).length > 0 ? 'sim' : 'não');
  console.log('erros:', JSON.stringify(errs));
  await b.close();
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
