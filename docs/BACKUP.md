# Formato do backup (versão 2)

Arquivo JSON gerado em **Ajustes → Dados e backup → Baixar backup completo**.

```json
{
  "format": "meu-estudo-backup",
  "version": 2,
  "exportedAt": "2026-11-16T18:00:00.000Z",
  "app": "2.0.0",
  "scope": "conta",
  "counts": { "activity": 79, "question": 10, "attempt": 14 },
  "records": [ { "id": "...", "kind": "...", "planId": "...", "data": {}, "deleted": false, "rev": 3, "updatedAt": 1794800000000, "updatedBy": "d...", "schema": 1 } ]
}
```

- `records` contém **todos** os registros, inclusive os excluídos (`deleted: true`). Assim, restaurar um backup não traz de volta
  o que foi apagado.
- Tipos (`kind`): `profile`, `plan`, `subject`, `activity`, `video`, `playlist`, `videoProgress`, `note`, `question`, `quizSet`,
  `attempt`, `errorEntry`, `simulation`, `doubt`, `session` e `version`. A descrição dos campos de cada tipo está em `js/data/schema.js`.
- Questões (`question`) guardam enunciado, 5 alternativas, índice da correta, explicação, matéria e origem. As respostas do aluno
  ficam separadas, em `attempt`, e nunca são sobrescritas.
- Datas do calendário são texto `AAAA-MM-DD`, sem fuso. Momentos (`updatedAt`, `at`) são milissegundos UTC.
- Não entram no backup: as chaves de IA (ficam só no aparelho) e as cópias de segurança locais.

## Restauração
**Ajustes → Restaurar ou importar backup** aceita:
1. backups da versão 2;
2. o texto "Copiar backup" do sistema anterior (versão 1);
3. a cópia de segurança feita antes da migração (`{ "legacy": ..., "sets": ... }`).

A importação é uma **conciliação**, não uma substituição:
- registros novos são adicionados;
- registros que já existem são juntados campo a campo, e edições mais novas são mantidas;
- quando o mesmo texto é diferente nos dois lados, o texto que estava valendo continua e o outro fica guardado como **versão** recuperável;
- registros excluídos continuam excluídos.

Antes de importar, o sistema guarda uma cópia do estado atual em **Cópias de segurança deste aparelho**.
A importação acontece em partes e anota o progresso. Se for interrompida, continua de onde parou. Importar o mesmo arquivo
de novo não duplica nada.
