// Copia os módulos do SDK do Firebase para vendor/, apontando os imports para arquivos locais.
// Assim o app funciona offline (o service worker guarda tudo) e não depende de CDN.
import fs from 'node:fs';
const V = JSON.parse(fs.readFileSync('node_modules/firebase/package.json', 'utf8')).version;
const out = `vendor/firebase/${V}`;
fs.mkdirSync(out, { recursive: true });
for (const m of ['app', 'auth', 'firestore']) {
  let s = fs.readFileSync(`node_modules/firebase/firebase-${m}.js`, 'utf8');
  s = s.replaceAll(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`, './firebase-app.js');
  s = s.replace(/\n?\/\/# sourceMappingURL=.*$/m, '');
  fs.writeFileSync(`${out}/firebase-${m}.js`, s);
}
console.log('vendor ok', out);
