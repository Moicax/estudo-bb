# Ligar a conta (Firebase): passo a passo

Enquanto o Firebase não é configurado, o sistema funciona **só no aparelho** (aparece "Salvo neste aparelho").
Para usar a mesma conta no computador, no Android e no iPhone, faça isto uma vez (uns 15 minutos):

## 1. Criar o projeto
1. Acesse https://console.firebase.google.com e entre com sua conta Google.
2. **Criar projeto** → nome: `meu-estudo` (qualquer nome) → pode desativar o Google Analytics → **Criar**.
3. O plano gratuito (Spark) é suficiente para uso pessoal. Não precisa cadastrar cartão.

## 2. Ativar o login
1. Menu **Criação → Authentication → Vamos começar**.
2. Aba **Método de login**: ative **E-mail/senha** e **Google** (no Google, escolha seu e-mail de suporte e salve).
3. Aba **Configurações → Domínios autorizados → Adicionar domínio**: `moicax.github.io`.

## 3. Criar o banco de dados
1. Menu **Criação → Firestore Database → Criar banco de dados**.
2. Local: `southamerica-east1 (São Paulo)`. Modo: **produção**.
3. Aba **Regras**: apague o conteúdo, cole o arquivo [`firestore.rules`](../firestore.rules) deste repositório e clique em **Publicar**.

## 4. Registrar o app web e me mandar a configuração
1. Engrenagem ⚙ → **Configurações do projeto** → em "Seus apps", clique no ícone **</>** (Web).
2. Apelido: `meu-estudo-web` → **Registrar app** (não marque Hosting).
3. Copie o bloco `const firebaseConfig = { ... }` e mande para mim (ou cole em `js/config.js`, no lugar de `null`).

> Essa configuração **não é senha**: ela só diz qual projeto usar e fica visível no site. Quem protege os dados são as
> regras do passo 3 (cada pessoa só lê e grava os próprios dados). As chaves de IA nunca vão para o Firebase.

## Limites e custos (plano Spark, gratuito)
Valores conferidos na documentação do Firebase em novembro de 2026; confira em https://firebase.google.com/pricing.
- Firestore: 1 GiB armazenado, 50 mil leituras, 20 mil gravações e 20 mil exclusões **por dia**.
- Se um limite diário acabar, a sincronização para até o dia seguinte. Os dados continuam salvos no aparelho e sobem depois. Não há cobrança no plano Spark.
- Uso pessoal típico: algumas centenas de gravações por dia. O primeiro acesso de um aparelho novo lê todos os registros uma vez (cerca de 400 a 1.000 leituras).

## Login no iPhone
- No Safari, o "Continuar com Google" abre uma janela de login. No **app instalado na tela de início** do iPhone, essa
  janela pode não abrir (limitação do iOS com apps instalados). Lá, use **e-mail e senha**, ou entre uma vez pelo Safari.
