// Configuração PÚBLICA do Firebase (não é segredo: só identifica o projeto; quem protege os dados são as regras
// do Firestore). Cole aqui o objeto "firebaseConfig" do Console do Firebase > Configurações do projeto > Seus apps.
// Enquanto estiver null, o sistema funciona só neste aparelho (sem conta) e mostra isso na tela.
export const FIREBASE_CONFIG = null;

export const APP_VERSION = '2.0.0';

/** Em testes locais (localhost?emu=1) usa os emuladores do Firebase com um projeto de demonstração. */
export function emulatorMode() {
  try {
    const u = new URL(location.href);
    return (u.hostname === 'localhost' || u.hostname === '127.0.0.1') && u.searchParams.get('emu') === '1';
  } catch (e) { return false; }
}
export const EMULATOR_CONFIG = { projectId: 'demo-estudo', apiKey: 'demo-key', authDomain: 'localhost', appId: 'demo' };
