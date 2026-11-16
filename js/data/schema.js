// Formato dos registros. Cada coisa importante é um registro com identidade própria.
//
// {
//   id:        texto estável (não muda entre aparelhos; ver ids.* abaixo)
//   kind:      tipo do registro (KINDS)
//   planId:    plano a que pertence (null para dados do usuário, como o perfil)
//   data:      conteúdo, específico de cada tipo
//   deleted:   true = excluído (marcador de exclusão; nunca volta a existir com o mesmo id)
//   rev:       revisão no servidor (0 = ainda não enviado). Cresce de 1 em 1 a cada gravação aceita.
//   updatedAt: momento da última alteração (ms UTC, relógio do aparelho que alterou)
//   updatedBy: id do aparelho que alterou por último
//   schema:    versão do formato do registro
// }
//
// Datas de calendário (data.date, data.doneAt, plan.start, plan.examDate) são 'AAAA-MM-DD' sem fuso.
import { slug, safeId, hash } from '../core/util.js';

export const SCHEMA = 1;

export const KINDS = [
  'profile',       // nome e preferências do usuário (id fixo 'profile')
  'plan',          // plano de estudos (concurso/assunto)
  'subject',       // matéria de um plano (peso, cor, ordem)
  'activity',      // atividade agendada num dia (tema, vídeos, situação, anotações, revisões 1/7/30)
  'video',         // vídeo da biblioteca do plano
  'playlist',      // playlist/curso completo
  'videoProgress', // vídeo assistido (separado do vídeo: marcar em dois aparelhos não conflita)
  'note',          // anotação de uma aula (vídeo)
  'question',      // questão completa: enunciado, alternativas, resposta, explicação, origem
  'quizSet',       // conjunto de questões praticadas numa atividade
  'attempt',       // tentativa de resposta (nunca é sobrescrita)
  'errorEntry',    // caderno de erros (aponta para a questão, quando houver)
  'simulation',    // simulado e resultado
  'doubt',         // dúvida respondida pela IA
  'session',       // sessão de estudo cronometrada (trechos de início/pausa)
  'version',       // versão de texto guardada após conflito, recuperável
];

export const ids = {
  plan: (planId) => 'plan_' + planId,
  subject: (planId, name) => `sub_${planId}_${slug(name)}`,
  activity: (planId, date, subjectName, n = 0) => `act_${planId}_${date.replace(/-/g, '')}_${slug(subjectName)}` + (n > 0 ? '_' + (n + 1) : ''),
  video: (planId, key) => `vid_${planId}_${safeId(key)}`,
  userVideo: (planId, url) => `vid_${planId}_u${hash(url)}`,
  playlist: (planId, url) => `pl_${planId}_${hash(url)}`,
  videoProgress: (videoId) => 'vp_' + videoId,
  videoNote: (videoId) => 'note_' + videoId,
  customField: (name) => 'cf_' + slug(name),
};

export function makeRecord(kind, id, planId, data, { updatedAt = Date.now(), device = 'sistema' } = {}) {
  return { id, kind, planId: planId || null, data, deleted: false, rev: 0, updatedAt, updatedBy: device, schema: SCHEMA };
}

/** Campos que vão para o servidor e para o backup (sem os metadados locais de sincronização). */
export function publicRecord(r) {
  return { id: r.id, kind: r.kind, planId: r.planId || null, data: r.data || {}, deleted: !!r.deleted, rev: r.rev || 0, updatedAt: r.updatedAt || 0, updatedBy: r.updatedBy || '', schema: r.schema || SCHEMA };
}

export function validRecord(r) {
  return r && typeof r === 'object' && typeof r.id === 'string' && r.id.length > 0 && r.id.length <= 300 && !/[/]/.test(r.id)
    && KINDS.includes(r.kind) && (r.planId == null || typeof r.planId === 'string')
    && r.data && typeof r.data === 'object' && !Array.isArray(r.data);
}

export const STATUS = { todo: 'A fazer', doing: 'Estudando', done: 'Concluída' };
export const ERROR_REASONS = ['Não sabia o conteúdo', 'Confundi regras', 'Falta de atenção', 'Faltou tempo', 'Chutei'];
