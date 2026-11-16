import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionStart, sessionPause, sessionResume, sessionStop, sessionElapsed, sessionAutoFinish, reviewsAfter } from '../../js/domain/study.js';
import { validQuestions, parseLoose, isAdvanced } from '../../js/ai/ai.js';

test('cronômetro: pausa, retomada e recarga calculam pelo registro', () => {
  const t0 = 1_000_000;
  let d = sessionStart('a1', 25 * 60, 'dev', t0);
  d = sessionPause(d, t0 + 10 * 60e3);             // 10 min
  assert.equal(sessionElapsed({ data: d }, t0 + 60 * 60e3), 600); // pausado: não conta
  d = sessionResume(d, t0 + 30 * 60e3);
  // "recarregar a página": o estado é o mesmo objeto salvo; o tempo continua certo
  const saved = JSON.parse(JSON.stringify(d));
  assert.equal(sessionElapsed({ data: saved }, t0 + 35 * 60e3), 900);
  const fin = sessionAutoFinish(saved, t0 + 90 * 60e3);   // app fechado e reaberto bem depois
  assert.equal(fin.state, 'ended'); assert.equal(fin.completed, true);
  assert.equal(sessionElapsed({ data: fin }), 25 * 60, 'encerra no minuto exato, sem contar o tempo fechado');
  assert.equal(fin.endedAt, t0 + 45 * 60e3);
  const stopped = sessionStop(sessionResume(sessionPause(sessionStart('a', 600, 'd', 0), 100e3), 200e3), 250e3);
  assert.equal(sessionElapsed({ data: stopped }), 150);
});

test('revisões: marcar a de 7 dias também marca a de 1', () => {
  assert.deepEqual(reviewsAfter([], 7), [1, 7]);
  assert.deepEqual(reviewsAfter([1], 30), [1, 7, 30]);
});

test('IA: validação de questões rejeita formatos ruins', () => {
  const good = { e: 'Enunciado', a: ['A) um', 'dois', 'três', 'quatro', 'cinco'], c: '2', x: 'porque' };
  const out = validQuestions({ questoes: [good, { e: 'x', a: ['1', '2'], c: 0, x: '' }, { ...good, c: 7 }] });
  assert.equal(out.length, 1);
  assert.equal(out[0].options[0], 'um'); assert.equal(out[0].answer, 2);
  assert.deepEqual(parseLoose('```json\n[1,2]\n```'), [1, 2]);
  assert.equal(parseLoose('lixo'), null);
  assert.equal(isAdvanced('qual a diferença entre CMN e Bacen?', 'Bancários'), true);
  assert.equal(isAdvanced('o que é crase?', 'Português'), false);
});
