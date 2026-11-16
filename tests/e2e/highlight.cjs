// Marca-texto: marcar, salvar, recarregar, tirar marcação.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const scheme of ['light', 'dark']) {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme }); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8765/#hoje'); await p.waitForSelector('[data-act="start-bb"]'); await p.click('[data-act="start-bb"]'); await p.waitForSelector('.hero');
    const id = await p.evaluate(() => window.__ctx.store.list('activity').find(a => a.data.date === '2026-11-17').id);
    await p.goto('http://127.0.0.1:8765/#estudo/' + id); await p.waitForSelector('#st-note');
    await p.click('#st-note'); await p.keyboard.type('Regra de tres: grandezas diretamente proporcionais.');
    // seleciona "grandezas diretamente" e marca de amarelo; depois "proporcionais" de verde
    const sel = async (word) => p.evaluate((w) => { const ed = document.getElementById('st-note'); const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); let n; while ((n = walker.nextNode())) { const i = n.nodeValue.indexOf(w); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + w.length); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return true; } } return false; }, word);
    await sel('grandezas diretamente'); await p.click('.hl-btn[data-hl="y"][data-for="st-note"]');
    await sel('proporcionais'); await p.click('.hl-btn[data-hl="g"][data-for="st-note"]');
    await p.waitForTimeout(700);
    const saved = await p.evaluate((id) => { const a = window.__ctx.store.get(id).data; return { note: a.note, html: a.noteHtml }; }, id);
    await p.reload(); await p.waitForSelector('#st-note mark');
    const marks = await p.$$eval('#st-note mark', ms => ms.map(m => m.dataset.c + ':' + m.textContent));
    if (scheme === 'dark') await p.locator('#st-note').screenshot({ path: 'tests/out/60-hl-dark.png' }); else await p.locator('.rich-wrap').first().screenshot({ path: 'tests/out/60-hl-light.png' });
    // tirar marcação do verde
    await sel('proporcionais'); await p.click('.hl-btn[data-hl="x"][data-for="st-note"]'); await p.waitForTimeout(700);
    const after = await p.evaluate((id) => window.__ctx.store.get(id).data.noteHtml, id);
    console.log(scheme, '| texto puro:', JSON.stringify(saved.note), '| marcas após recarregar:', marks.join(', '), '| depois da borracha:', after);
    await c.close();
  }
  console.log('erros:', JSON.stringify(errs)); await b.close();
})().catch(e => { console.error('FALHOU', e.message); process.exit(1); });
