// Testes das regras de acesso (rodam no emulador do Firestore).
import test, { before, after } from 'node:test';
import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-estudo', firestore: { rules: fs.readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
  await env.clearFirestore();
});
after(async () => { await env.cleanup(); });

const rec = (id, rev, extra = {}) => ({ id, kind: 'activity', planId: 'bb2026', data: { title: 'x' }, deleted: false, rev, updatedAt: Date.now(), updatedBy: 'd1', schema: 1, serverAt: serverTimestamp(), ...extra });

test('dono lê e grava os próprios registros', async () => {
  const a = env.authenticatedContext('alice').firestore();
  await assertSucceeds(setDoc(doc(a, 'users/alice/records/r1'), rec('r1', 1)));
  await assertSucceeds(getDoc(doc(a, 'users/alice/records/r1')));
  await assertSucceeds(setDoc(doc(a, 'users/alice/records/r1'), rec('r1', 2, { data: { title: 'y' } })));
});

test('outra conta não lê nem grava dados de alice', async () => {
  const b = env.authenticatedContext('bob').firestore();
  await assertFails(getDoc(doc(b, 'users/alice/records/r1')));
  await assertFails(getDocs(collection(b, 'users/alice/records')));
  await assertFails(setDoc(doc(b, 'users/alice/records/r2'), rec('r2', 1)));
});

test('sem login não acessa nada', async () => {
  const u = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(u, 'users/alice/records/r1')));
  await assertFails(setDoc(doc(u, 'users/alice/records/r9'), rec('r9', 1)));
});

test('revisão precisa ser sequencial (aparelho desatualizado não sobrescreve)', async () => {
  const a = env.authenticatedContext('alice').firestore();
  await assertFails(setDoc(doc(a, 'users/alice/records/r1'), rec('r1', 2)));   // atual é 2, precisa ser 3
  await assertFails(setDoc(doc(a, 'users/alice/records/r1'), rec('r1', 7)));
  await assertFails(setDoc(doc(a, 'users/alice/records/r3'), rec('r3', 5)));   // criação começa em 1
});

test('exclusão não pode ser desfeita nem o documento apagado', async () => {
  const a = env.authenticatedContext('alice').firestore();
  await assertSucceeds(setDoc(doc(a, 'users/alice/records/r1'), rec('r1', 3, { deleted: true, data: {} })));
  await assertFails(setDoc(doc(a, 'users/alice/records/r1'), rec('r1', 4, { deleted: false })));
  await assertFails(deleteDoc(doc(a, 'users/alice/records/r1')));
});

test('formato inválido é recusado', async () => {
  const a = env.authenticatedContext('alice').firestore();
  await assertFails(setDoc(doc(a, 'users/alice/records/r4'), { ...rec('r4', 1), kind: 'hacker' }));
  await assertFails(setDoc(doc(a, 'users/alice/records/r5'), { ...rec('r5', 1), id: 'outro' }));
  await assertFails(setDoc(doc(a, 'users/alice/records/r6'), { ...rec('r6', 1), extra: true }));
  await assertFails(setDoc(doc(a, 'users/alice/records/r7'), { ...rec('r7', 1), serverAt: new Date(0) }));
  await assertFails(setDoc(doc(a, 'users/alice/outra/x'), { a: 1 }));
  await assertFails(setDoc(doc(a, 'publico/x'), { a: 1 }));
});

test('não muda o tipo de um registro existente', async () => {
  const a = env.authenticatedContext('alice').firestore();
  await assertSucceeds(setDoc(doc(a, 'users/alice/records/k1'), rec('k1', 1)));
  await assertFails(setDoc(doc(a, 'users/alice/records/k1'), { ...rec('k1', 2), kind: 'note' }));
  await assertFails(updateDoc(doc(a, 'users/alice/records/k1'), { rev: 2 })); // serverAt precisa ser atualizado
});
