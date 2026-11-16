// Conta criada com Google ganha senha; outro aparelho entra com e-mail e senha e vê os mesmos dados.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const A = await (await b.newContext()).newPage(); A.on('pageerror', e => errs.push(e.message));
  await A.goto('http://127.0.0.1:8765/?emu=1#hoje'); await A.waitForSelector('[data-act="google"]', { timeout: 20000 });
  const email = 'google' + Date.now() + '@gmail.com';
  // simula o login com Google (o emulador aceita uma credencial Google de teste)
  const uid = await A.evaluate(async (email) => { const { A: Au, auth } = window.__ctx.fb; const cred = Au.GoogleAuthProvider.credential(JSON.stringify({ sub: 'g' + Date.now(), email, email_verified: true })); const r = await Au.signInWithCredential(auth, cred); return r.user.uid; }, email);
  await A.waitForSelector('[data-act="start-bb"]', { timeout: 30000 }); await A.click('[data-act="start-bb"]'); await A.waitForSelector('.hero');
  await A.goto('http://127.0.0.1:8765/?emu=1#ajustes'); await A.waitForSelector('#pw-new');
  await A.fill('#pw-new', 'senha-do-iphone-1'); await A.click('[data-act="add-password"]');
  try { await A.waitForSelector('text=Esta conta também entra com e-mail e senha.', { timeout: 15000 }); } catch (e) { console.log('tela:', (await A.locator('#aj-conta').locator('..').innerText()).slice(0, 600)); console.log('providers', await A.evaluate(() => JSON.stringify(window.__ctx.fb.auth.currentUser.providerData.map(p => p.providerId)))); throw e; }
  await A.waitForFunction(() => window.__ctx.syncInfo().label === 'Sincronizado', null, { timeout: 30000 });
  console.log('A (Google) criou senha: ok');
  const B = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); B.on('pageerror', e => errs.push(e.message));
  await B.goto('http://127.0.0.1:8765/?emu=1#hoje'); await B.waitForSelector('#au-email', { timeout: 20000 });
  await B.fill('#au-email', email); await B.fill('#au-pass', 'senha-do-iphone-1'); await B.click('form[data-form=auth] button[type=submit]');
  await B.waitForSelector('.hero', { timeout: 30000 });
  const uidB = await B.evaluate(() => window.__ctx.scope);
  console.log('B entrou com e-mail e senha: mesma conta =', uid === uidB, '| atividades:', await B.evaluate(() => window.__ctx.store.list('activity').length));
  console.log('erros:', JSON.stringify(errs)); await b.close();
})().catch(e => { console.error('FALHOU', e.message); process.exit(1); });
