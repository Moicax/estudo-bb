// O app abre e grava sem internet (service worker + IndexedDB), no modo sem conta.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/#hoje'); await p.waitForSelector('[data-act="start-bb"]', { timeout: 20000 });
  await p.click('[data-act="start-bb"]'); await p.waitForSelector('.hero');
  await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForSelector('.hero');
  await c.setOffline(true); await p.reload(); await p.waitForSelector('.hero', { timeout: 15000 });
  const id = await p.evaluate(() => window.__ctx.store.list('activity').find(a => a.data.date === '2026-11-17').id);
  await p.goto('http://127.0.0.1:8765/#estudo/' + id); await p.waitForSelector('#st-note');
  await p.fill('#st-note', 'Escrito sem internet'); await p.waitForTimeout(700);
  await p.reload(); await p.waitForSelector('#st-note');
  console.log('sem internet: app abriu e a anotação ficou =', await p.inputValue('#st-note'));
  await p.screenshot({ path: 'tests/out/40-estudo-mobile.png', fullPage: false });
  console.log('erros:', JSON.stringify(errs));
  await b.close();
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
