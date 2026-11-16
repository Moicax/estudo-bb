// Tela de entrada: Google, e-mail e senha, recuperação de senha, ou uso sem conta.
import { icon, esc, toast } from '../ui/dom.js';

let S = { mode: 'in', busy: false, error: null, info: null, email: '', name: '' };

export function render(ctx) {
  const off = !navigator.onLine;
  const up = S.mode === 'up', reset = S.mode === 'reset';
  return `<div class="brand"><span class="brand-mark">${icon('book-open')}</span>Meu Estudo</div>
  <div><h1>${reset ? 'Recuperar senha' : up ? 'Criar sua conta' : 'Entre para estudar em qualquer aparelho'}</h1>
  <p class="muted" style="margin-top:6px">${reset ? 'Enviaremos um link para você criar uma senha nova.' : 'Seus planos, anotações e progresso ficam na sua conta e também funcionam sem internet.'}</p></div>
  ${off ? `<div class="notice warn">${icon('wifi-off')}<div>Você está sem internet. Entrar pela primeira vez precisa de conexão.</div></div>` : ''}
  ${S.error ? `<div class="notice bad" role="alert">${icon('triangle-alert')}<div>${esc(S.error)}</div></div>` : ''}
  ${S.info ? `<div class="notice ok" role="status">${icon('mail')}<div>${esc(S.info)}</div></div>` : ''}
  ${reset ? '' : `<button class="btn lg block" data-act="google" ${S.busy ? 'disabled' : ''}>
    <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" stroke="none" d="M22.6 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2-1.9 3.2-4.7 3.2-8.2z"/><path fill="#34A853" stroke="none" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23z"/><path fill="#FBBC05" stroke="none" d="M5.7 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2V7.1H2A11 11 0 0 0 1 12c0 1.8.4 3.4 1.2 4.9L5.7 14z"/><path fill="#EA4335" stroke="none" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10c.9-2.7 3.4-4.6 6.3-4.6z"/></svg>
    Continuar com Google</button>
  <div class="divider">ou com e-mail</div>`}
  <form class="stack" data-form="auth" novalidate>
    ${up ? `<div class="field"><label class="f" for="au-name">Como quer ser chamado (opcional)</label><input id="au-name" type="text" autocomplete="nickname" value="${esc(S.name)}"></div>` : ''}
    <div class="field"><label class="f" for="au-email">E-mail</label><input id="au-email" type="email" autocomplete="email" inputmode="email" required value="${esc(S.email)}"></div>
    ${reset ? '' : `<div class="field"><label class="f" for="au-pass">Senha</label><input id="au-pass" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" minlength="8" required>${up ? '<p class="hint">Pelo menos 8 caracteres.</p>' : ''}</div>`}
    <button class="btn primary lg block" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? icon('refresh-cw', 'spin') : ''}${reset ? 'Enviar link' : up ? 'Criar conta' : 'Entrar'}</button>
  </form>
  <div class="row" style="justify-content:space-between">
    ${reset ? '<button class="link" data-act="mode" data-m="in">Voltar para entrar</button>' : up ? '<button class="link" data-act="mode" data-m="in">Já tenho conta</button>' : '<button class="link" data-act="mode" data-m="up">Criar conta</button><button class="link" data-act="mode" data-m="reset">Esqueci a senha</button>'}
  </div>
  <div class="divider"></div>
  <button class="btn ghost block" data-act="use-local">${icon('smartphone')}Usar sem conta, só neste aparelho</button>`;
}

export function after(ctx, root) {
  const em = root.querySelector('#au-email'), nm = root.querySelector('#au-name');
  if (em) em.addEventListener('input', () => { S.email = em.value; });
  if (nm) nm.addEventListener('input', () => { S.name = nm.value; });
  const f = root.querySelector('[data-form="auth"]');
  if (f) f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const api = ctx.authApi, email = root.querySelector('#au-email').value, passEl = root.querySelector('#au-pass');
    if (!email.trim()) { root.querySelector('#au-email').setAttribute('aria-invalid', 'true'); root.querySelector('#au-email').focus(); return; }
    S.busy = true; S.error = null; S.info = null; ctx.render();
    try {
      if (S.mode === 'reset') { await api.resetPassword(email); S.info = 'Se existir uma conta com esse e-mail, o link chega em alguns minutos. Confira também o spam.'; S.mode = 'in'; }
      else if (S.mode === 'up') { if ((passEl.value || '').length < 8) throw { code: 'auth/weak-password' }; await api.signUpEmail(email, passEl.value, (root.querySelector('#au-name') || {}).value); }
      else await api.signInEmail(email, passEl.value);
    } catch (err) { S.error = api.authMessage(err); }
    S.busy = false; ctx.render();
  });
}

export const actions = {
  async google(el, e, ctx) {
    S.error = null; S.busy = true; ctx.render();
    try { await ctx.authApi.signInGoogle(); } catch (err) { S.error = ctx.authApi.authMessage(err); }
    S.busy = false; ctx.render();
  },
  mode(el, e, ctx) { S.mode = el.dataset.m; S.error = null; S.info = null; ctx.render(); },
};
addEventListener('online', () => { if (location.hash === '#entrar') toast('Conexão de volta.', { icon: 'cloud-check' }); });
