// Fumaça: modo sem conta, migração do sistema antigo e telas principais (celular e computador).
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = 'http://127.0.0.1:8765/';
const legacy = fs.readFileSync(__dirname + '/../unit/fixtures/legacy-state.json', 'utf8');
const sets = JSON.parse(fs.readFileSync(__dirname + '/../unit/fixtures/legacy-sets.json', 'utf8'));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.addInitScript(([l, s]) => { if (!localStorage.getItem('seeded')) { localStorage.setItem('estudo-bb-v1', l); for (const k in s) localStorage.setItem('estudo-bb-q-' + k, JSON.stringify(s[k])); localStorage.setItem('seeded', '1'); } }, [legacy, sets]);
  await p.goto(BASE + '#hoje'); await p.waitForTimeout(1500);
  console.log('1 welcome:', (await p.locator('h1').first().innerText()));
  await p.screenshot({ path: 'tests/out/01-welcome.png' });
  await p.click('[data-act="import-legacy"]'); await p.waitForSelector('[data-act="finish"]', { timeout: 15000 });
  console.log('2 import:', (await p.locator('.notice').first().innerText()).replace(/\n/g, ' | '));
  await p.click('[data-act="finish"]'); await p.waitForTimeout(800);
  console.log('3 hoje h1:', await p.locator('h1').first().innerText(), '| hero:', (await p.locator('.hero h2').innerText()));
  await p.screenshot({ path: 'tests/out/02-hoje-mobile.png', fullPage: true });
  for (const r of ['agenda', 'videos', 'progresso', 'erros', 'simulados', 'ajustes', 'mais']) {
    await p.goto(BASE + '#' + r); await p.waitForTimeout(500);
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    console.log('  view', r, '| h1:', await p.locator('h1').first().innerText(), '| scrollW', w);
    await p.screenshot({ path: `tests/out/03-${r}.png`, fullPage: false });
  }
  // abrir uma atividade
  await p.goto(BASE + '#agenda'); await p.waitForTimeout(500);
  await p.locator('[data-act="open"]').nth(2).click(); await p.waitForTimeout(500);
  console.log('4 estudo:', await p.locator('#st-title').inputValue());
  await p.screenshot({ path: 'tests/out/04-estudo.png', fullPage: true });
  console.log('errors:', JSON.stringify(errs.slice(0, 10)));
  await b.close();
})();
