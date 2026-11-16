// Sincronização entre "dois aparelhos" (duas instâncias do app com bancos locais separados), no emulador.
import 'fake-indexeddb/auto';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import * as F from 'firebase/firestore';
import { openStore, deleteScope } from '../../js/data/store.js';
import { createSyncEngine } from '../../js/sync/engine.js';

const wait = (ms) => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 10000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await wait(100); } throw new Error('tempo esgotado'); }

const EMAIL = 'aluno' + Date.now() + '@teste.dev', PASS = 'senha-forte-123';
let A, B, C;

async function device(name, email = EMAIL) {
  const app = initializeApp({ projectId: 'demo-estudo', apiKey: 'demo-key', authDomain: 'localhost' }, name);
  const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  let cred;
  try { cred = await createUserWithEmailAndPassword(auth, email, PASS); } catch (e) { cred = await signInWithEmailAndPassword(auth, email, PASS); }
  const db = F.getFirestore(app); F.connectFirestoreEmulator(db, '127.0.0.1', 8080);
  await deleteScope('dev-' + name);
  const store = await openStore('dev-' + name);
  let online = true;
  const status = [];
  const engine = createSyncEngine({ fs: F, db, uid: cred.user.uid, store, isOnline: () => online, onStatus: s => status.push(s.phase) });
  await engine.start();
  return { app, db, store, engine, uid: cred.user.uid, status,
    async goOffline() { online = false; await F.disableNetwork(db); engine.offline(); },
    async goOnline() { online = true; await F.enableNetwork(db); engine.online(); },
    async close() { engine.stop(); store.close(); await deleteApp(app); } };
}

before(async () => { A = await device('A'); B = await device('B'); });
after(async () => { await A.close(); await B.close(); if (C) await C.close(); });

test('registro criado no aparelho A aparece no B', async () => {
  await A.store.put('activity', 'act1', 'p1', { title: 'Crase', status: 'todo', note: '', videoIds: [] });
  await until(() => B.store.get('act1'));
  assert.equal(B.store.get('act1').data.title, 'Crase');
  await until(() => A.store.dirtyCount() === 0);
  assert.ok(A.status.includes('synced'));
});

test('edições em registros diferentes não se apagam', async () => {
  await A.store.put('note', 'n1', 'p1', { text: 'nota A' });
  await B.store.put('note', 'n2', 'p1', { text: 'nota B' });
  await until(() => A.store.get('n2') && B.store.get('n1'));
  assert.equal(A.store.get('n1').data.text, 'nota A');
  assert.equal(B.store.get('n2').data.text, 'nota B');
});

test('mesmo registro, campos diferentes, ao mesmo tempo (offline): os dois valem', async () => {
  await until(() => B.store.get('act1') && B.store.dirtyCount() === 0 && A.store.dirtyCount() === 0);
  await A.goOffline(); await B.goOffline();
  await A.store.patch('act1', { status: 'done' });
  await B.store.patch('act1', { note: 'anotado no celular' });
  await A.goOnline(); await until(() => A.store.dirtyCount() === 0);
  await B.goOnline(); await until(() => B.store.dirtyCount() === 0);
  await until(() => A.store.get('act1').data.note === 'anotado no celular');
  for (const d of [A, B]) {
    assert.equal(d.store.get('act1').data.status, 'done');
    assert.equal(d.store.get('act1').data.note, 'anotado no celular');
  }
});

test('mesmo texto editado nos dois aparelhos: uma vence e a outra fica como versão', async () => {
  await A.goOffline(); await B.goOffline();
  await A.store.patch('n1', { text: 'reescrita no PC' });
  await wait(20);
  await B.store.patch('n1', { text: 'reescrita no celular' });
  await A.goOnline(); await until(() => A.store.dirtyCount() === 0);
  await B.goOnline(); await until(() => B.store.dirtyCount() === 0);
  await until(() => A.store.get('n1').data.text === B.store.get('n1').data.text && A.store.list('version').length > 0);
  const final = A.store.get('n1').data.text;
  const other = final === 'reescrita no PC' ? 'reescrita no celular' : 'reescrita no PC';
  assert.equal(final, 'reescrita no celular', 'a edição mais recente fica como principal');
  assert.ok(A.store.list('version').some(v => v.data.targetId === 'n1' && v.data.text === other), 'versão recuperável guardada');
});

test('alterações feitas offline sobem quando a internet volta', async () => {
  await A.goOffline();
  for (let i = 0; i < 25; i++) await A.store.put('attempt', 'att' + i, 'p1', { questionId: 'q1', chosen: i % 5, correct: false, at: Date.now() });
  assert.equal(A.store.dirtyCount(), 25);
  assert.equal(A.engine.status().phase, 'offline');
  await A.goOnline();
  await until(() => B.store.list('attempt').length === 25);
  assert.equal(A.store.dirtyCount(), 0);
});

test('exclusão não volta quando um aparelho desatualizado reconecta', async () => {
  await until(() => B.store.get('n2') && A.store.get('n2'));
  await B.goOffline();
  await A.store.remove('n2');
  await until(() => A.store.dirtyCount() === 0);
  await B.store.patch('n2', { text: 'editei sem saber que foi excluída' });
  await B.goOnline();
  await until(() => B.store.dirtyCount() === 0 && B.store.getRaw('n2').deleted);
  await wait(500);
  assert.equal(A.store.get('n2'), null);
  assert.equal(B.store.get('n2'), null);
  assert.ok(B.store.list('version').some(v => v.data.targetId === 'n2'), 'o texto editado não se perdeu: virou versão');
});

test('outra conta não recebe dados deste usuário', async () => {
  C = await device('C', 'outra' + Date.now() + '@teste.dev');
  await wait(1500);
  assert.equal(C.store.count(), 0);
  await C.store.put('note', 'n1', 'p1', { text: 'nota da outra pessoa' });
  await until(() => C.store.dirtyCount() === 0);
  await wait(800);
  assert.notEqual(A.store.get('n1').data.text, 'nota da outra pessoa');
});

test('aparelho novo baixa tudo da conta (primeiro acesso)', async () => {
  const D = await device('D');
  await until(() => D.store.list('attempt').length === 25 && D.store.get('act1'));
  assert.equal(D.store.get('n2'), null);
  await D.close();
});
