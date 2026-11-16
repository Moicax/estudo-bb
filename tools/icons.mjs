// Gera js/ui/icons.js com um sprite SVG dos ícones Lucide usados (mesma família, licença ISC).
import fs from 'node:fs';
const names = 'sun calendar-days circle-play chart-column notebook-pen clipboard-check settings circle-user cloud-check cloud-off refresh-cw cloud-alert check circle-check circle plus search x chevron-left chevron-right chevron-down external-link timer pause play square sparkles message-circle-question file-text trash-2 undo-2 download upload log-out log-in mail key-round smartphone ellipsis pencil rotate-ccw history triangle-alert wifi-off target list book-open info eye eye-off volume-2 moon monitor lock shield-check list-checks flag scale arrow-right copy book-marked graduation-cap circle-help repeat-2 house'.split(' ');
let sym = '';
for (const n of names) {
  const svg = fs.readFileSync(`node_modules/lucide-static/icons/${n}.svg`, 'utf8');
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s+/g, ' ').trim();
  sym += `<symbol id="i-${n}" viewBox="0 0 24 24">${inner}</symbol>`;
}
const out = `// Gerado por tools/icons.mjs a partir de lucide-static (ISC). Não edite à mão.
export const SPRITE = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">${sym.replace(/'/g, "\\'")}</svg>';
export const ICONS = ${JSON.stringify(names)};
`;
fs.writeFileSync('js/ui/icons.js', out);
console.log('ícones', names.length, Math.round(out.length / 1024) + 'KB');
