// Editor de anotações com marca-texto colorido.
// Guarda duas coisas: o texto puro (usado em busca, IA e conflitos) e uma versão marcada, que só aceita
// <mark data-c="..."> e <br>. Tudo o que vem do editor passa pelo "sanitize", então nenhum HTML estranho é salvo.
import { esc } from '../core/util.js';
import { icon } from './dom.js';

export const HL = [['y', 'Amarelo', '#fde68a'], ['g', 'Verde', '#bbf7d0'], ['b', 'Azul', '#bfdbfe'], ['p', 'Rosa', '#fbcfe8'], ['o', 'Laranja', '#fed7aa']];
const hexRgb = (h) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
const BY_RGB = Object.fromEntries(HL.map(([c, , hex]) => [hexRgb(hex), c]));
const VALID = new Set(HL.map(x => x[0]));
const ERASE = '#010203'; // cor-sentinela da borracha: vira "sem marcação" na limpeza
BY_RGB[hexRgb(ERASE)] = null;

function colorOf(el, inherited) {
  // a cor aplicada por último (estilo inline) vale mais que a marcação antiga
  const bg = el.style && el.style.backgroundColor;
  if (bg) { if (bg in BY_RGB) return BY_RGB[bg]; if (bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)' || bg === 'initial' || bg === 'inherit') return null; }
  if (el.dataset && VALID.has(el.dataset.c)) return el.dataset.c;
  return inherited;
}

/** Lê o editor e devolve { text, html } limpos. */
export function sanitize(root) {
  const segs = [];
  const push = (t, c) => { if (!t) return; const last = segs[segs.length - 1]; if (last && last.c === c) last.t += t; else segs.push({ t, c }); };
  const walk = (node, c) => {
    for (const ch of node.childNodes) {
      if (ch.nodeType === 3) push(ch.nodeValue.replace(/ /g, ' '), c);
      else if (ch.nodeType === 1) {
        const tag = ch.tagName;
        if (tag === 'BR') { push('\n', null); continue; }
        const block = tag === 'DIV' || tag === 'P' || tag === 'LI';
        if (block && segs.length && !segs[segs.length - 1].t.endsWith('\n')) push('\n', null);
        walk(ch, colorOf(ch, c));
      }
    }
  };
  walk(root, null);
  let text = segs.map(s => s.t).join('');
  const trailing = text.length - text.replace(/\n+$/, '').length;
  let html = segs.map(s => { const t = esc(s.t).replace(/\n/g, '<br>'); return s.c && s.t.trim() ? `<mark data-c="${s.c}">${t}</mark>` : t; }).join('');
  if (trailing) { text = text.replace(/\n+$/, ''); html = html.replace(/(<br>)+$/, ''); }
  return { text, html: segs.some(s => s.c && s.t.trim()) ? html : '' };
}

/** HTML para exibir: a versão marcada só vale se ainda corresponde ao texto (pode ter mudado em outro aparelho). */
export function viewHtml(text, html) {
  text = text || '';
  if (html && typeof document !== 'undefined') {
    const d = document.createElement('div'); d.innerHTML = html;
    const s = sanitize(d);
    if (s.text === text) return s.html || esc(text).replace(/\n/g, '<br>');
  }
  return esc(text).replace(/\n/g, '<br>');
}

function sanitizeLen(range) { const d = document.createElement('div'); d.appendChild(range.cloneContents()); return sanitize(d).text.length + (/\n+$/.test(range.toString()) ? 0 : 0); }
function placeCaret(ed, pos) {
  const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n, left = pos;
  const sel = getSelection(), r = document.createRange();
  while ((n = w.nextNode())) {
    if (n.nodeType === 1) { if (n.tagName === 'BR') { if (left === 0) { r.setStartBefore(n); break; } left--; } continue; }
    if (left <= n.nodeValue.length) { r.setStart(n, left); break; }
    left -= n.nodeValue.length;
  }
  if (!r.startContainer || r.startContainer === document) r.selectNodeContents(ed);
  r.collapse(true); sel.removeAllRanges(); sel.addRange(r);
}

/** Editor com barra de marca-texto. */
export function richEditor({ id, input, attrs = '', text, html, placeholder = '', label, minHeight = 96 }) {
  return `<div class="rich-wrap">
    <div class="hl-bar" role="toolbar" aria-label="Marca-texto">${HL.map(([c, n]) => `<button type="button" class="hl-btn" data-hl="${c}" data-for="${esc(id)}" aria-label="Marcar em ${n.toLowerCase()}" title="${n}"><span class="sw" data-c="${c}"></span></button>`).join('')}
      <button type="button" class="hl-btn" data-hl="x" data-for="${esc(id)}" aria-label="Tirar marcação" title="Tirar marcação">${icon('x', 'sm')}</button><span class="hl-tip">Selecione o texto e escolha a cor</span></div>
    <div id="${esc(id)}" class="rich" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${esc(label || placeholder)}" data-ph="${esc(placeholder)}" data-input="${esc(input)}" ${attrs} style="min-height:${minHeight}px">${viewHtml(text, html)}</div></div>`;
}

// os botões não tiram o foco do editor (a seleção continua)
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', (e) => { if (e.target.closest('.hl-btn')) e.preventDefault(); });
  document.addEventListener('mousedown', (e) => { if (e.target.closest('.hl-btn')) e.preventDefault(); });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.hl-btn'); if (!b) return;
    const ed = document.getElementById(b.dataset.for); if (!ed) return;
    const sel = getSelection();
    if (!sel.rangeCount || sel.isCollapsed || !ed.contains(sel.anchorNode)) { ed.focus(); ed.closest('.rich-wrap').querySelector('.hl-tip').classList.add('show'); setTimeout(() => ed.closest('.rich-wrap')?.querySelector('.hl-tip')?.classList.remove('show'), 1800); return; }
    try { document.execCommand('styleWithCSS', false, true); } catch (er) { /* navegadores antigos */ }
    const hex = b.dataset.hl === 'x' ? ERASE : HL.find(h => h[0] === b.dataset.hl)[2];
    document.execCommand('hiliteColor', false, hex);
    // redesenha limpo (só <mark> e <br>) e devolve o cursor ao fim do trecho marcado
    const r = sel.getRangeAt(0), pre = document.createRange(); pre.selectNodeContents(ed); pre.setEnd(r.endContainer, r.endOffset);
    const pos = sanitizeLen(pre);
    ed.innerHTML = sanitize(ed).html || esc(sanitize(ed).text).replace(/\n/g, '<br>');
    placeCaret(ed, pos);
    ed.dispatchEvent(new Event('input', { bubbles: true }));
  });
  // colar sempre como texto puro (sem formatação de outros sites)
  document.addEventListener('paste', (e) => {
    const ed = e.target.closest && e.target.closest('.rich'); if (!ed) return;
    e.preventDefault();
    document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
  });
}
