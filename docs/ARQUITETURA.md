# Arquitetura

Site estático (GitHub Pages), sem etapa de build: os arquivos do repositório são o app. Módulos ES nativos.

```
index.html, css/app.css         interface (identidade visual, componentes, animações)
js/app.js                       moldura, rotas (#hoje, #agenda, #estudo/<id>…), conta, eventos
js/views/*.js                   telas
js/ui/                          componentes reutilizáveis (diálogo, aviso, ícones Lucide)
js/domain/study.js              regras de estudo: hoje, revisões 1/7/30, progresso, raio-x, cronômetro
js/data/schema.js               formato dos registros e ids estáveis
js/data/store.js                armazenamento no aparelho (IndexedDB), um banco por conta
js/data/merge.js                junção de alterações concorrentes no mesmo registro
js/data/legacy.js, backup.js    migração da versão 1, backup v2, importação retomável
js/data/catalog-bb.js           conteúdo do plano Banco do Brasil 2026 (modelo)
js/sync/engine.js               sincronização aparelho ↔ Firestore
js/sync/firebase.js             login (Google, e-mail/senha) e carga do SDK (vendor/)
js/ai/ai.js                     integrações de IA centralizadas
firestore.rules                 regras de acesso
sw.js                           cache do app para abrir sem internet (gerado por tools/build-sw.mjs)
```

## Dados: local primeiro
- Tudo é gravado primeiro no **IndexedDB do aparelho** (`meu-estudo:<uid>` ou `meu-estudo:local` sem conta). O app funciona
  inteiro sem internet; só login, IA, vídeos e sincronização precisam de conexão.
- Cada coisa é um **registro com id estável** (`act_bb2026_20261116_portugues`, `vp_<vídeo>`, `q_…`). Nunca há um documento único
  com o estado inteiro.
- Na conta: `users/{uid}/records/{id}` no Cloud Firestore, um documento por registro. O SDK do Firestore usa cache em
  memória (a persistência offline do Firestore vem desligada por padrão na web). O armazenamento offline é o nosso
  IndexedDB, para mostrar estados reais ("Salvo neste aparelho", "Sincronizando", "Sincronizado", "Falha ao sincronizar")
  e controlar conflitos e exclusões.

## Sincronização e conflitos
- Cada registro tem `rev` (revisão no servidor). Uma edição local guarda a base (`rev` e dados da última versão sincronizada).
- No envio, uma transação lê a revisão atual de cada registro:
  - se ela é igual à base, grava `rev + 1`;
  - se é diferente (outro aparelho mudou), faz a **junção de três vias campo a campo** (`merge.js`):
    - campos diferentes: valem os dois;
    - listas (aulas do dia, revisões feitas): somam adições e respeitam remoções;
    - o mesmo texto editado nos dois lados: vale o mais recente e o outro vira um registro `version` recuperável, mostrado na tela da atividade.
- As regras do Firestore exigem `rev = anterior + 1`. Assim, um aparelho desatualizado não sobrescreve às cegas.
- **Exclusão** é um marcador (`deleted: true`) que as regras não deixam desfazer. Um aparelho com dados antigos não ressuscita o
  item. Se ele tinha texto novo no item excluído, esse texto vira `version`.
- O recebimento escuta documentos com `serverAt` maior que o último recebido.

## Conta e segurança
- Login com Google (janela de login) ou e-mail e senha, recuperação de senha e saída. Ao sair, há a opção de apagar o banco local daquela conta.
  Contas diferentes usam bancos locais diferentes, então uma pessoa nunca vê os dados de outra no mesmo aparelho.
- O cache do service worker guarda só os arquivos do site, nunca dados do usuário.
- Regras testadas: dono lê e grava; outra conta e visitante não; formato, tipo e revisão validados; nada fora de `users/{uid}/records`.
- A configuração do Firebase em `js/config.js` é pública por natureza. As **chaves de IA** ficam só no aparelho, no banco local da
  conta. Não vão para o Firestore, para o backup nem para o repositório.

## Datas
- Datas do calendário são texto `AAAA-MM-DD`, e as contas usam meio-dia UTC, então não mudam de dia por causa do fuso.
- "Hoje" é a data local do aparelho. Momentos (sessões, conclusão) são milissegundos UTC.

## Cronômetro
- Uma sessão guarda trechos `{s: início, e: fim}`. O tempo é calculado pelos registros, então recarregar ou fechar o app não
  muda nada. Se o tempo acabar com o app fechado, a sessão termina no minuto exato quando ele reabre. Uma sessão é um único
  registro, atualizado ao pausar e encerrar, então não duplica.

## IA
- Uma rota única (`ai.js`): perguntas simples vão para Gemini ou GPT e compatíveis; as avançadas vão para o Claude (com chave de API).
  Se uma falha, tenta a próxima.
- Proteções:
  - pedidos idênticos em andamento não se repetem;
  - há um limite diário de pedidos por aparelho, ajustável;
  - as respostas são validadas (as questões precisam de 5 alternativas, índice válido e explicação);
  - textos do aluno entram delimitados como **dados**, nunca como instruções.

## Testes
```
npm install
npm run test:unit     # datas, junção, migração interrompida e retomada, backup e restauração, cronômetro, validação da IA
npm run test:rules    # regras de acesso + dois aparelhos sincronizando no emulador (offline, conflito, exclusão, outra conta)
```
Os testes de interface (`tests/e2e/*.cjs`) rodam com os emuladores ligados (`npm run emulators`) e um servidor local na
porta 8765, abrindo `http://127.0.0.1:8765/?emu=1`.
