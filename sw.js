/* Gerado por tools/build-sw.mjs. Guarda o app no aparelho para abrir sem internet.
   Só arquivos do próprio site: dados do usuário ficam no IndexedDB, nunca neste cache. */
const CACHE = 'meu-estudo-dda3696b0162';
const FILES = ["./","./index.html","./manifest.webmanifest","./icon.svg","./icon-192.png","./icon-512.png","./apple-touch-icon.png","./css/app.css","./js/ai/ai.js","./js/app.js","./js/config.js","./js/core/util.js","./js/data/backup.js","./js/data/catalog-bb.js","./js/data/legacy.js","./js/data/merge.js","./js/data/schema.js","./js/data/store.js","./js/data/template.js","./js/domain/study.js","./js/sync/engine.js","./js/sync/firebase.js","./js/ui/dom.js","./js/ui/icons.js","./js/views/agenda.js","./js/views/auth.js","./js/views/errors.js","./js/views/more.js","./js/views/progress.js","./js/views/settings.js","./js/views/sims.js","./js/views/study.js","./js/views/today.js","./js/views/videos.js","./js/views/welcome.js","./assets/fonts/inter-latin.woff2","./assets/fonts/plus-jakarta-sans-latin.woff2","./vendor/firebase/13.1.0/firebase-app.js","./vendor/firebase/13.1.0/firebase-auth.js","./vendor/firebase/13.1.0/firebase-firestore.js"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== self.location.origin) return; // Firebase, IA e YouTube vão direto à internet
  if (req.mode === 'navigate') { e.respondWith(fetch(req).catch(() => caches.match('./index.html'))); return; }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
