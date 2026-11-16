// Gera sw.js com a lista de arquivos do app e uma versão derivada do conteúdo.
// Rode depois de qualquer mudança: node tools/build-sw.mjs
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const roots = ['index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'css', 'js', 'assets', 'vendor'];
const files = [];
const walk = (p) => { const st = fs.statSync(p); if (st.isDirectory()) for (const f of fs.readdirSync(p).sort()) walk(path.join(p, f)); else files.push(p.split(path.sep).join('/')); };
roots.forEach(walk);
const h = crypto.createHash('sha256'); for (const f of files) { h.update(f); h.update(fs.readFileSync(f)); }
const version = h.digest('hex').slice(0, 12);
const sw = `/* Gerado por tools/build-sw.mjs. Guarda o app no aparelho para abrir sem internet.
   Só arquivos do próprio site: dados do usuário ficam no IndexedDB, nunca neste cache. */
const CACHE = 'meu-estudo-${version}';
const FILES = ${JSON.stringify(['./', ...files.map(f => './' + f)], null, 0)};
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== self.location.origin) return; // Firebase, IA e YouTube vão direto à internet
  if (req.mode === 'navigate') { e.respondWith(fetch(req).catch(() => caches.match('./index.html'))); return; }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
`;
fs.writeFileSync('sw.js', sw);
console.log('sw.js', version, files.length, 'arquivos');
