// Firebase no navegador: carrega o SDK (cópia local em vendor/, para funcionar offline) só quando há configuração.
// Auth: Google (popup) e e-mail/senha. Firestore: cache em memória — o armazenamento offline é o nosso
// IndexedDB (js/data/store.js), que dá controle de conflitos, exclusões e do estado "salvo neste aparelho".
const V = '../../vendor/firebase/13.1.0/';

let fb = null;

export async function loadFirebase(config, { emulator = false } = {}) {
  if (fb) return fb;
  const [appM, A, F] = await Promise.all([import(V + 'firebase-app.js'), import(V + 'firebase-auth.js'), import(V + 'firebase-firestore.js')]);
  const app = appM.initializeApp(config);
  const auth = A.initializeAuth(app, { persistence: [A.indexedDBLocalPersistence, A.browserLocalPersistence], popupRedirectResolver: A.browserPopupRedirectResolver });
  auth.languageCode = 'pt';
  const db = F.initializeFirestore(app, { localCache: F.memoryLocalCache() });
  if (emulator) {
    A.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    F.connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  fb = { app, auth, db, A, F };
  return fb;
}

export function onUser(cb) { return fb.A.onAuthStateChanged(fb.auth, cb); }
export function currentUser() { return fb ? fb.auth.currentUser : null; }

/** Aguarda o Firebase dizer quem está logado (inclusive offline, a partir do que ficou salvo no aparelho). */
export function waitAuthReady() { return fb.auth.authStateReady ? fb.auth.authStateReady() : new Promise(r => { const u = fb.A.onAuthStateChanged(fb.auth, () => { u(); r(); }); }); }

function isStandaloneIOS() {
  try { return /iPhone|iPad|iPod/.test(navigator.userAgent) && (navigator.standalone === true || matchMedia('(display-mode: standalone)').matches); } catch (e) { return false; }
}

export async function signInGoogle() {
  if (!navigator.onLine) throw { code: 'app/offline' };
  const provider = new fb.A.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try { return await fb.A.signInWithPopup(fb.auth, provider); }
  catch (e) { if (isStandaloneIOS() && e && e.code !== 'auth/popup-closed-by-user') throw { code: 'app/ios-standalone' }; throw e; }
}
export function isIOSApp() { return isStandaloneIOS(); }
/** Senha para a mesma conta (útil no app do iPhone, onde o login com Google não abre). */
let pwAdded = false;
export function hasPassword() { const u = fb && fb.auth.currentUser; return pwAdded || !!(u && u.providerData.some(p => p.providerId === 'password')); }
export async function addPassword(pass) {
  if (!navigator.onLine) throw { code: 'app/offline' };
  const u = fb.auth.currentUser; if (!u || !u.email) throw { code: 'auth/no-email' };
  const cred = fb.A.EmailAuthProvider.credential(u.email, pass);
  try { const r = await fb.A.linkWithCredential(u, cred); pwAdded = true; return r; }
  catch (e) {
    // em alguns casos o Firebase recusa o vínculo pelo próprio e-mail da conta; definir a senha direto resolve
    if (e && (e.code === 'auth/email-already-in-use' || e.code === 'auth/credential-already-in-use')) { await fb.A.updatePassword(u, pass); pwAdded = true; try { await u.reload(); } catch (er) { /* ok */ } return; }
    throw e;
  }
}
export async function signInEmail(email, pass) { if (!navigator.onLine) throw { code: 'app/offline' }; return fb.A.signInWithEmailAndPassword(fb.auth, email.trim(), pass); }
export async function signUpEmail(email, pass, name) {
  if (!navigator.onLine) throw { code: 'app/offline' };
  const cred = await fb.A.createUserWithEmailAndPassword(fb.auth, email.trim(), pass);
  if (name) { try { await fb.A.updateProfile(cred.user, { displayName: name }); } catch (e) { /* nome é opcional */ } }
  return cred;
}
export async function resetPassword(email) { if (!navigator.onLine) throw { code: 'app/offline' }; return fb.A.sendPasswordResetEmail(fb.auth, email.trim()); }
export async function signOut() { return fb.A.signOut(fb.auth); }

export function authMessage(e) {
  const c = (e && e.code) || '';
  const M = {
    'app/offline': 'Entrar precisa de internet. Conecte-se e tente de novo. Seus dados deste aparelho continuam disponíveis.',
    'app/ios-standalone': 'No app instalado do iPhone, o iOS bloqueia a janela do Google. Entre com e-mail e senha: no computador, já logado com o Google, vá em Ajustes > Conta e crie uma senha para a sua conta.',
    'auth/provider-already-linked': 'Esta conta já tem senha.',
    'auth/credential-already-in-use': 'Já existe outra conta com esse e-mail e senha.',
    'auth/requires-recent-login': 'Por segurança, saia e entre de novo com o Google antes de criar a senha.',
    'auth/no-email': 'Esta conta não tem e-mail.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita pop-ups para este site ou use e-mail e senha.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de terminar.',
    'auth/cancelled-popup-request': 'Login cancelado.',
    'auth/operation-not-supported-in-this-environment': 'Este navegador não permite o login com Google aqui. Use e-mail e senha.',
    'auth/unauthorized-domain': 'Este endereço ainda não está autorizado no Firebase (Authentication > Configurações > Domínios autorizados).',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/missing-password': 'Digite a senha.',
    'auth/weak-password': 'Use uma senha com pelo menos 8 caracteres.',
    'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Use "Entrar".',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/too-many-requests': 'Muitas tentativas. Espere alguns minutos e tente de novo.',
    'auth/network-request-failed': 'Sem conexão com o servidor de login. Verifique a internet.',
    'auth/account-exists-with-different-credential': 'Esse e-mail já entrou de outro jeito (Google ou senha). Use o mesmo método da primeira vez.',
    'auth/operation-not-allowed': 'Esse método de login não está ativado no Firebase (Authentication > Método de login).',
  };
  return M[c] || 'Não foi possível entrar agora. Tente de novo.';
}
