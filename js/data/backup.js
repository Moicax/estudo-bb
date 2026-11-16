// Backup versionado, migração e importação retomável.
// Formato documentado em docs/BACKUP.md.
import { validRecord, publicRecord } from './schema.js';
import { isLegacyState, legacyToRecords, legacyFingerprint } from './legacy.js';
import { hash } from '../core/util.js';

export const BACKUP_FORMAT = 'meu-estudo-backup';
export const BACKUP_VERSION = 2;

export function buildBackup(store, { appVersion = '', scopeLabel = '' } = {}) {
  const records = store.allPublic({ includeDeleted: true }).sort((a, b) => a.id < b.id ? -1 : 1);
  const counts = {};
  for (const r of records) if (!r.deleted) counts[r.kind] = (counts[r.kind] || 0) + 1;
  return {
    format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(),
    app: appVersion, scope: scopeLabel, counts, records,
  };
}

/**
 * Lê um texto de backup e devolve o que foi reconhecido, sem gravar nada.
 * Aceita: backup v2; bloco da v1 (texto "Copiar backup" do sistema antigo); cópia de segurança da migração.
 */
export function parseBackup(text, tpl) {
  let o;
  try { o = typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { return { ok: false, error: 'O texto não é um backup válido (JSON ilegível).' }; }
  if (o && o.format === BACKUP_FORMAT) {
    if (o.version > BACKUP_VERSION) return { ok: false, error: 'Este backup foi feito por uma versão mais nova do sistema. Atualize a página e tente de novo.' };
    if (!Array.isArray(o.records)) return { ok: false, error: 'Backup sem registros.' };
    const good = [], bad = [];
    for (const r of o.records) (validRecord(r) ? good : bad).push(r);
    return { ok: true, type: 'v2', records: good.map(publicRecord), rejected: bad.length, exportedAt: o.exportedAt || null, jobKey: 'job:backup:' + hash(o.exportedAt + '|' + good.length) };
  }
  const legacyState = o && o.legacy && isLegacyState(o.legacy) ? o.legacy : (isLegacyState(o) ? o : null);
  if (legacyState) {
    const sets = (o && o.sets) || {};
    const records = legacyToRecords(legacyState, sets, tpl);
    return { ok: true, type: 'v1', records, rejected: 0, legacyState, sets, jobKey: 'job:legacy:' + legacyFingerprint(legacyState) };
  }
  return { ok: false, error: 'Não reconheci esse formato. Use um backup exportado por este sistema ou o texto "Copiar backup" do sistema antigo.' };
}

/**
 * Importa em partes, guardando o progresso. Se for interrompida (aba fechada, erro), recomeça de onde parou.
 * Reimportar é seguro: ids estáveis + conciliação (store.importRecords) não duplicam nada.
 */
export async function runImport(store, records, { jobKey, chunk = 100, onProgress, interruptAfter } = {}) {
  let job = store.getMeta(jobKey);
  if (job && job.status === 'done' && job.total === records.length) return { ...job, alreadyDone: true };
  if (!job || job.total !== records.length) job = { total: records.length, done: 0, status: 'running', startedAt: Date.now(), added: 0, merged: 0, unchanged: 0, versions: 0 };
  job.status = 'running';
  await store.setMeta(jobKey, job);
  for (let i = job.done; i < records.length; i += chunk) {
    if (interruptAfter != null && i >= interruptAfter) { job.status = 'interrupted'; await store.setMeta(jobKey, job); const e = new Error('interrompido'); e.code = 'interrupted'; throw e; }
    const res = await store.importRecords(records.slice(i, i + chunk));
    job.added += res.added; job.merged += res.merged; job.unchanged += res.unchanged; job.versions += res.versions;
    job.done = Math.min(records.length, i + chunk);
    await store.setMeta(jobKey, job);
    if (onProgress) onProgress(job.done, job.total);
  }
  job.status = 'done'; job.finishedAt = Date.now();
  await store.setMeta(jobKey, job);
  return job;
}

/** Migração dos dados da v1 para o escopo atual, com cópia de segurança antes. */
export async function migrateLegacy(store, legacy, tpl, opts = {}) {
  const fp = legacyFingerprint(legacy.state);
  const snapKey = 'snap:legacy:' + fp;
  if (!store.getMeta(snapKey)) {
    const id = await store.addSnapshot('Dados do sistema antigo, guardados antes da migração', { legacy: legacy.state, sets: legacy.sets || {} });
    await store.setMeta(snapKey, id);
  }
  const records = legacyToRecords(legacy.state, legacy.sets || {}, tpl);
  return runImport(store, records, { jobKey: 'job:legacy:' + fp, ...opts });
}
