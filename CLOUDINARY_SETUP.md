# Configuração do Cloudinary (substitui o Firebase Storage)

Este arquivo documenta o setup manual necessário para a foto de perfil de
aluno funcionar após a migração para o Cloudinary. Sem isso, o upload/remoção
de foto retorna erro (variáveis ausentes) mesmo com o código já no
repositório.

Pré-requisito: o projeto já precisa estar publicado como **Cloudflare Pages**
(é o que expõe `functions/api/*`). Se ainda não estiver, crie o projeto no
Pages primeiro e conecte ao seu repositório Git — nada nesta etapa pede
cartão, é o mesmo Cloudflare Pages gratuito que vocês já usam hoje.

## 1. Criar a conta Cloudinary

1. Acesse [cloudinary.com](https://cloudinary.com/users/register_free) →
   **Sign up free**.
2. Cadastre com e-mail, Google ou GitHub — **não pede cartão de crédito nem
   qualquer dado financeiro**. Confirmado na documentação oficial do
   Cloudinary.
3. Após confirmar o e-mail, você cai direto no **Dashboard** do Cloudinary.

## 2. Pegar as credenciais

No topo do Dashboard (Console Settings → ou a própria home já mostra),
copie três valores:

- **Cloud name**
- **API Key**
- **API Secret** (clique no ícone de olho pra revelar)

Vamos usar os três no passo 4.

## 3. Nenhuma configuração de bucket/pasta é necessária

Diferente do R2/Firebase Storage, o Cloudinary não exige criar bucket com
antecedência — a pasta `tekidu/student-photos/` é criada automaticamente no
primeiro upload, porque o `public_id` já vem com a pasta embutida (ver
`functions/api/student-photo/[studentId].ts`).

## 4. Variáveis de ambiente da Pages Function

**Workers & Pages** → seu projeto → **Settings** → **Environment variables**
(são variáveis só da Function, do lado servidor — não confundir com as
`VITE_*` do build do frontend):

| Nome | Valor |
|---|---|
| `FIREBASE_PROJECT_ID` | o mesmo valor de `VITE_FIREBASE_PROJECT_ID` no seu `.env.local` (ex.: `tekidu-26c0f`) |
| `CLOUDINARY_CLOUD_NAME` | o "Cloud name" copiado no passo 2 |
| `CLOUDINARY_API_KEY` | a "API Key" copiada no passo 2 |
| `CLOUDINARY_API_SECRET` | a "API Secret" copiada no passo 2 — marque como **Secret/Encrypt** se o painel oferecer essa opção, já que ela dá poder de assinar uploads |

Adicione as quatro em **Production** e também em **Preview**, se você usa
deploy previews.

## 5. Redeploy

Variáveis de ambiente só entram em vigor no **próximo deploy** — se o
projeto já estava publicado, force um novo deploy (um novo commit, ou o
botão **Retry deployment** no dashboard do Cloudflare Pages).

## 6. Testar

1. Faça login como admin no app.
2. Abra o Perfil 360° de um aluno → "Adicionar foto" → escolha uma imagem →
   Confirmar.
3. Se aparecer erro, confira em dois lugares:
   - **Cloudflare** → Workers & Pages → projeto → **Logs**/**Real-time
     Logs** (erros de autenticação/assinatura aparecem aqui).
   - **Cloudinary** → Dashboard → **Media Library**, pasta
     `tekidu/student-photos/` (confirma se o arquivo realmente chegou lá).

## Sobre custo (por que isso é gratuito e sem cartão)

O plano Free do Cloudinary é permanente, confirmado sem cartão de crédito na
documentação oficial:
- **25 créditos por mês**, renovados todo mês, sem trial nem prazo de
  expiração.
- 1 crédito cobre **1.000 transformações**, **1GB de armazenamento** ou
  **1GB de banda** — qualquer combinação entre os três.
- Fotos de aluno comprimidas pra 640px/JPEG ficam em torno de 30–150KB cada:
  isso cobre facilmente milhares de alunos dentro dos 25 créditos.
- Se algum dia o uso ultrapassar o limite mensal, o Cloudinary **não cobra
  automaticamente** — ele pausa novas operações até o próximo ciclo (a menos
  que você mesmo decida fazer upgrade manual pra um plano pago).
