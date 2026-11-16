// Componentes de interface reutilizáveis (sem framework): ícones, avisos, diálogos, celebração.
import { esc } from '../core/util.js';

export { esc };
export const icon = (name, cls = '') => `<svg class="ico ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function chip(sub) {
  if (!sub) return '<span class="chip">Sem matéria</span>';
  return `<span class="chip subj" style="--h:${+sub.data.hue || 160}">${esc(sub.data.name)}</span>`;
}
export function bar(p, cls = '', key = '') { const v = Math.max(0, Math.min(1, p || 0)); return `<div class="bar ${cls}" role="presentation"${key ? ` data-k="${esc(key)}"` : ''}><i style="--p:${v.toFixed(4)}"></i></div>`; }
export function empty(ico, title, text, action = '') { return `<div class="empty">${icon(ico)}<h3>${esc(title)}</h3><p>${text}</p>${action}</div>`; }

/* ---------- avisos (toast) ---------- */
let toastRoot;
export function toast(msg, { icon: ic = 'check', action, onAction, ms = 4200 } = {}) {
  toastRoot = toastRoot || document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status');
  el.innerHTML = icon(ic) + `<span>${esc(msg)}</span>` + (action ? `<button type="button">${esc(action)}</button>` : '');
  toastRoot.appendChild(el);
  let done = false;
  const close = () => { if (done) return; done = true; el.classList.add('leaving'); setTimeout(() => el.remove(), 180); };
  if (action) el.querySelector('button').onclick = () => { close(); onAction && onAction(); };
  setTimeout(close, ms);
  return close;
}

/* ---------- diálogos acessíveis (foco preso, Esc fecha, foco volta ao botão de origem) ---------- */
const stack = [];
export function openDialog(html, { wide = false, label = 'Diálogo', onClose } = {}) {
  const prev = document.activeElement;
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.innerHTML = `<div class="dialog${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1">${html}</div>`;
  document.getElementById('layers').appendChild(scrim);
  const dlg = scrim.firstElementChild;
  const api = {
    el: dlg,
    close(result) {
      if (api.closed) return; api.closed = true;
      stack.splice(stack.indexOf(api), 1);
      scrim.classList.add('closing');
      setTimeout(() => scrim.remove(), 160);
      document.body.style.overflow = stack.length ? 'hidden' : '';
      if (prev && prev.focus && document.contains(prev)) prev.focus();
      onClose && onClose(result);
    },
    set(html2) { dlg.innerHTML = html2; focusFirst(); },
  };
  function focusFirst() { const f = dlg.querySelector('[autofocus], input, select, textarea, button:not([disabled]), a[href]'); (f || dlg).focus(); }
  scrim.addEventListener('mousedown', (e) => { if (e.target === scrim) api.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); api.close(); }
    if (e.key === 'Tab') {
      const f = [...dlg.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  dlg.addEventListener('click', (e) => { const b = e.target.closest('[data-close]'); if (b) api.close(b.dataset.close || undefined); });
  stack.push(api); document.body.style.overflow = 'hidden';
  requestAnimationFrame(focusFirst);
  return api;
}
export function confirmDialog({ title, text, ok = 'Confirmar', cancel = 'Cancelar', danger = false }) {
  return new Promise((res) => {
    const d = openDialog(`<h2>${esc(title)}</h2><p class="muted" style="margin-top:6px">${text}</p>
      <div class="dialog-actions"><button class="btn" data-close="no">${esc(cancel)}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-close="yes" autofocus>${esc(ok)}</button></div>`,
    { label: title, onClose: (r) => res(r === 'yes') });
    return d;
  });
}
export function closeAllDialogs() { while (stack.length) stack[stack.length - 1].close(); }

/* ---------- celebração breve e opcional ---------- */
export function celebrate(enabled) {
  if (!enabled) return;
  if (document.documentElement.dataset.motion === 'reduce') return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.motion !== 'full') return;
  const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  const colors = ['var(--primary)', 'var(--info)', 'var(--warn)', '#e879a6', '#a78bfa'];
  for (let i = 0; i < 28; i++) {
    const a = (Math.PI * 2 * i) / 28, d = 120 + Math.random() * 120;
    const el = document.createElement('i');
    el.style.cssText = `--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d - 40}px;--r:${Math.random() * 540 - 270}deg;background:${colors[i % colors.length]};animation-delay:${Math.random() * 60}ms`;
    box.appendChild(el);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 1100);
}

/* ---------- som curto opcional (fim do foco) ---------- */
export function chime() {
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = new C(); const now = ctx.currentTime;
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, now + i * 0.18); g.gain.exponentialRampToValueAtTime(0.18, now + i * 0.18 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.5);
      o.start(now + i * 0.18); o.stop(now + i * 0.18 + 0.55);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch (e) { /* sem áudio */ }
}

/** Debounce simples para salvar texto enquanto a pessoa digita. */
export function debounce(fn, ms) {
  let t = null, last = null;
  const f = (...a) => { last = a; clearTimeout(t); t = setTimeout(() => { t = null; fn(...last); }, ms); };
  f.flush = () => { if (t) { clearTimeout(t); t = null; fn(...last); } };
  return f;
}

/** Linha discreta com o uso de IA de hoje neste aparelho. */
export function aiUsageLine(ai) {
  if (!ai) return '';
  if (!ai.hasAny()) return `<span>${icon('sparkles', 'sm')} IA não configurada · <a href="#ajustes">configurar</a></span>`;
  const by = ai.usageBy(), parts = ai.providers().filter(p => p.ok).map(p => `${esc(p.name)} ${by[p.name] || 0}`);
  for (const k of Object.keys(by)) if (!ai.providers().some(p => p.ok && p.name === k)) parts.push(`${esc(k)} ${by[k]}`);
  return `<span title="Pedidos respondidos hoje por cada IA, neste aparelho. Limite diário ajustável em Ajustes.">${icon('sparkles', 'sm')} IA hoje: ${parts.join(' · ')} <span class="muted">(${ai.usage()} de ${ai.limit()} pedidos)</span></span>`;
}
