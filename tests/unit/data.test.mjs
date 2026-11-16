import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mergeRecord } from '../../js/data/merge.js';
import { openStore, deleteScope } from '../../js/data/store.js';
import { legacyToRecords } from '../../js/data/legacy.js';
import { BB_TEMPLATE } from '../../js/data/catalog-bb.js';
import { buildBackup, parseBackup, runImport, migrateLegacy } from '../../js/data/backup.js';
import { addDays, today, diffDays, fmtLong } from '../../js/core/util.js';

const legacyFixture = JSON.parse(fs.readFileSync(new URL('./fixtures/legacy-state.json', import.meta.url)));
const legacySets = JSON.parse(fs.readFileSync(new URL('./fixtures/legacy-sets.json', import.meta.url)));

test('datas civis não mudam de dia com fuso', () => {
  const saved = process.env.TZ;
  for (const tz of ['America/Maceio', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'UTC']) {
    process.env.TZ = tz;
    assert.equal(addDays('2026-11-16', 1), '2026-11-17');
    assert.equal(addDays('2027-02-28', 1), '2027-03-01');
    assert.equal(diffDays('2026-11-16', '2027-02-13'), 89);
    assert.equal(fmtLong('2026-11-16'), 'segunda-feira, 16 de novembro');
    assert.equal(today(new Date(2026, 10, 16, 23, 59)), '2026-11-16');
  }
  process.env.TZ = saved;
});

test('merge: campos diferentes alterados em aparelhos diferentes não se apagam', () => {
  const base = { status: 'todo', note: 'a', videoIds: ['v1'], reviews: [] };
  const L = { data: { ...base, status: 'done' }, updatedAt: 10 };
  const R = { data: { ...base, note: 'a + anotação do celular' }, updatedAt: 20 };
  const m = mergeRecord('activity', base, L, R);
  assert.equal(m.data.status, 'done');
  assert.equal(m.data.note, 'a + anotação do celular');
  assert.equal(m.versions.length, 0);
});

test('merge: texto editado nos dois lados guarda a outra versão', () => {
  const base = { note: 'original' };
  const m = mergeRecord('activity', base, { data: { note: 'versão do PC' }, updatedAt: 30 }, { data: { note: 'versão do celular' }, updatedAt: 20 });
  assert.equal(m.data.note, 'versão do PC');
  assert.deepEqual(m.versions.map(v => v.text), ['versão do celular']);
});

test('merge: listas somam adições e respeitam remoções', () => {
  const base = { videoIds: ['a', 'b'] };
  const m = mergeRecord('activity', base, { data: { videoIds: ['a', 'b', 'c'] }, updatedAt: 1 }, { data: { videoIds: ['a'] }, updatedAt: 2 });
  assert.deepEqual(m.data.videoIds, ['a', 'c']);
});

test('merge: exclusão vence e preserva texto novo como versão', () => {
  const m = mergeRecord('errorEntry', { rule: 'x' }, { data: { removedKind: 'errorEntry' }, deleted: true, updatedAt: 1 }, { data: { rule: 'x editado' }, deleted: false, updatedAt: 99 });
  assert.equal(m.deleted, true);
  assert.equal(m.versions[0].text, 'x editado');
});

test('legado: conversão completa, determinística, com questões e tentativas', () => {
  const a = legacyToRecords(legacyFixture, legacySets, BB_TEMPLATE);
  const b = legacyToRecords(legacyFixture, legacySets, BB_TEMPLATE);
  assert.deepEqual(a.map(r => r.id), b.map(r => r.id));
  const kinds = k => a.filter(r => r.kind === k);
  assert.equal(kinds('activity').length, legacyFixture.rows.length);
  assert.ok(kinds('question').length >= 3, 'questões da IA importadas');
  const q = kinds('question')[0];
  assert.ok(q.data.stem && q.data.options.length === 5 && Number.isInteger(q.data.answer) && q.data.explanation);
  assert.ok(kinds('attempt').length >= 2, 'tentativas separadas das questões');
  const err = kinds('errorEntry').find(e => e.data.questionId);
  assert.ok(err, 'erro da IA aponta para a questão completa');
  const done = kinds('activity').filter(r => r.data.status === 'done' && r.data.subjectId !== 'sub_bb2026_folga');
  assert.equal(done.length, legacyFixture.rows.filter(r => r.st === 'Feito' && r.mat !== 'Folga').length);
  assert.equal(kinds('videoProgress').length, legacyFixture.w.length);
});

test('migração: cópia antes, interrupção, retomada sem duplicar', async () => {
  await deleteScope('t-mig');
  const s = await openStore('t-mig');
  const legacy = { state: legacyFixture, sets: legacySets };
  await assert.rejects(migrateLegacy(s, legacy, BB_TEMPLATE, { chunk: 40, interruptAfter: 80 }), /interrompido/);
  const partial = s.count();
  assert.ok(partial >= 80 && partial < 400, 'parou no meio: ' + partial);
  assert.equal((await s.listSnapshots()).length, 1, 'cópia de segurança feita antes');
  const job = await migrateLegacy(s, legacy, BB_TEMPLATE, { chunk: 40 });
  assert.equal(job.status, 'done');
  const total = s.count();
  const again = await migrateLegacy(s, legacy, BB_TEMPLATE, { chunk: 40 });
  assert.ok(again.alreadyDone);
  // força reimportação completa (como restaurar o mesmo backup): nada duplica nem muda
  await s.delMeta(Object.keys(Object.fromEntries(s.meta)).find(k => k.startsWith('job:legacy:')));
  const job2 = await migrateLegacy(s, legacy, BB_TEMPLATE, { chunk: 40 });
  assert.equal(s.count(), total);
  assert.equal(job2.added, 0);
  assert.equal(job2.versions, 0);
  assert.equal((await s.listSnapshots()).length, 1);
  s.close();
});

test('importação não sobrescreve edições mais novas e guarda versão de texto diferente', async () => {
  await deleteScope('t-imp');
  const s = await openStore('t-imp');
  const recs = legacyToRecords(legacyFixture, legacySets, BB_TEMPLATE);
  await runImport(s, recs, { jobKey: 'j1' });
  const act = s.list('activity').find(r => r.data.note);
  await s.patch(act.id, { note: 'anotação reescrita depois', status: 'done' });
  await runImport(s, recs, { jobKey: 'j2' });
  const after = s.get(act.id);
  assert.equal(after.data.note, 'anotação reescrita depois');
  assert.equal(after.data.status, 'done');
  const ver = s.list('version').find(v => v.data.targetId === act.id);
  assert.ok(ver, 'texto antigo diferente ficou recuperável');
  s.close();
});

test('backup v2: inclui questões, tentativas e exclusões; restauração confere', async () => {
  await deleteScope('t-bk1'); await deleteScope('t-bk2');
  const s = await openStore('t-bk1');
  await runImport(s, legacyToRecords(legacyFixture, legacySets, BB_TEMPLATE), { jobKey: 'j' });
  const sim = s.list('simulation')[0];
  await s.remove(sim.id);
  const bk = buildBackup(s, { appVersion: 'teste' });
  const text = JSON.stringify(bk);
  const parsed = parseBackup(text, BB_TEMPLATE);
  assert.equal(parsed.ok, true); assert.equal(parsed.type, 'v2');
  const t = await openStore('t-bk2');
  await runImport(t, parsed.records, { jobKey: parsed.jobKey });
  for (const k of ['question', 'attempt', 'activity', 'errorEntry', 'note', 'videoProgress', 'doubt']) {
    assert.equal(t.list(k).length, s.list(k).length, 'mesma quantidade de ' + k);
  }
  assert.equal(t.get(sim.id), null, 'excluído continua excluído');
  assert.equal(t.getRaw(sim.id).deleted, true);
  const q1 = s.list('question')[0], q2 = t.get(q1.id);
  assert.deepEqual(q2.data, q1.data);
  s.close(); t.close();
});

test('backup do sistema antigo (texto colado) é reconhecido', () => {
  const p = parseBackup(JSON.stringify(legacyFixture), BB_TEMPLATE);
  assert.equal(p.ok, true); assert.equal(p.type, 'v1');
  assert.ok(p.records.length > 300);
  assert.equal(parseBackup('{"x":1}', BB_TEMPLATE).ok, false);
  assert.equal(parseBackup('não é json', BB_TEMPLATE).ok, false);
});
