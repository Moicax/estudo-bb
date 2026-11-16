# Meu Estudo

App web de estudos: agenda, aulas, revisões espaçadas (1, 7 e 30 dias), questões com IA, caderno de erros, simulados e progresso.
**Funciona sem internet**, pode ser instalado no celular ou no computador e, com conta, **sincroniza entre aparelhos**.

Site: https://moicax.github.io/estudo-bb/

- Primeiro plano: **Banco do Brasil 2026 (Escriturário)**, com 13 semanas e 192 aulas gratuitas organizadas por dia. Os pesos das matérias são estimados a partir do edital de 2023.
- Dados do sistema anterior são importados no primeiro acesso, com cópia de segurança antes e sem apagar nada.
- Conta: login com Google ou e-mail e senha (Firebase). Para ativar, siga [docs/FIREBASE.md](docs/FIREBASE.md).
- Backup completo e documentado: [docs/BACKUP.md](docs/BACKUP.md). Arquitetura e testes: [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

Depois de mudar arquivos, gere o cache offline com `node tools/build-sw.mjs`.
