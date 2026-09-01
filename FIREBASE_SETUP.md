# Configuração necessária no Firebase Console

Este arquivo documenta configurações que **não podem ser aplicadas só por código**
e precisam ser feitas manualmente (ou via Firebase CLI) no projeto Firebase
`tekidu-26c0f`.

## Índices compostos do Firestore (causa raiz de "Notas não conseguiram ser carregadas")

As telas de **Notas** e **Frequência** fazem consultas com vários `where()`
combinados com `orderBy()`:

- `assessments`: `where(disciplineId) + where(classId) + where(schoolYear) + where(term) + orderBy(order)`
- `attendanceSessions`: mesmo padrão

O Firestore **exige um índice composto** para esse tipo de consulta (múltiplas
igualdades + ordenação por um campo diferente). Sem esse índice, a consulta é
rejeitada com o erro `failed-precondition`, o que faz a tela mostrar "Notas não
conseguiram ser carregadas" / "Não foi possível carregar a frequência".

Os índices necessários já estão declarados em `firestore.indexes.json`, na raiz
do projeto. Para aplicá-los ao projeto real, escolha UMA das opções abaixo:

### Opção A — via Firebase CLI (recomendado)

```bash
npm install -g firebase-tools   # se ainda não tiver o CLI instalado
firebase login
firebase use tekidu-26c0f
firebase deploy --only firestore:indexes
```

### Opção B — manualmente pelo Console

1. Acesse [Firebase Console](https://console.firebase.google.com/) → projeto
   `tekidu-26c0f` → **Firestore Database** → aba **Índices** → **Índices compostos**.
2. Clique em **Criar índice** e cadastre dois índices, ambos com escopo de
   **Coleção** (não "Grupo de coleções"):

   **Índice 1 — coleção `assessments`**
   | Campo | Ordem |
   |---|---|
   | disciplineId | Crescente |
   | classId | Crescente |
   | schoolYear | Crescente |
   | term | Crescente |
   | order | Crescente |

   **Índice 2 — coleção `attendanceSessions`**
   | Campo | Ordem |
   |---|---|
   | disciplineId | Crescente |
   | classId | Crescente |
   | schoolYear | Crescente |
   | term | Crescente |
   | order | Crescente |

3. Aguarde o status mudar de "Compilando" para "Ativado" (geralmente poucos
   minutos, pode levar mais tempo se já houver muitos documentos).

### Alternativa rápida (por ambiente)

Se o erro `failed-precondition` ocorrer em produção, a própria mensagem do
Firestore (visível no console do navegador, já que agora logamos o erro
técnico completo — ver `src/utils/firebaseError.ts`) inclui um **link direto**
que cria o índice exato exigido por aquela consulta, com um clique. Essa é a
forma mais rápida de resolver caso os passos acima não sejam suficientes.

## Firestore Security Rules

`firestore.rules` já está correto e não precisa de nenhuma mudança para o
problema de Notas/Frequência. Ainda assim, garanta que as regras publicadas no
Console são as mesmas deste arquivo:

```bash
firebase deploy --only firestore:rules
```

## Variáveis de ambiente

`.env.local` já está preenchido com as credenciais do projeto
`tekidu-26c0f` — nenhuma ação adicional é necessária aqui para
Firebase.

## Ciclo de vida de conta estilo SUAP (Etapa 9)

Substitui o fluxo antigo (admin digitava a senha do professor/aluno no
formulário) por: conta nasce com senha temporária + matrícula/chave
gerada pelo sistema → usuário faz o primeiro acesso com elas → define
sua senha definitiva. Ver comentários em `userService.createTeacher`,
`studentService.createStudent`, `LoginPage.tsx`, `FirstAccessPage.tsx`
e `firestore.rules` (coleções `users` e `loginKeys`) para o desenho
completo.

**Decisão 2 (arquitetura de e-mail) escolhida: Opção B(i) — 100%
client-side, sem Cloud Functions.** A senha temporária e a chave de
primeiro acesso são geradas no navegador do admin
(`src/lib/credentials.ts`) e o e-mail é enviado por uma chamada direta
do navegador à API REST da **EmailJS**
(`src/services/email/emailService.ts`) — trocado da Resend (usada numa
versão anterior desta mesma etapa) porque a Resend exige um domínio
próprio verificado por DNS para enviar a destinatários reais, e o
projeto não tem um.

### Requisito de infraestrutura: conta EmailJS

1. Crie uma conta gratuita em [emailjs.com](https://www.emailjs.com).
2. Em **Email Services**, clique em "Add New Service" e conecte uma
   conta de e-mail pessoal (Gmail, Outlook, Yahoo, ou SMTP genérico) —
   essa conta é quem vai aparecer como remetente dos e-mails. Anote o
   **Service ID** gerado.
3. Em **Email Templates**, crie um template novo com este conteúdo
   sugerido (pode ajustar o texto, mas mantenha os nomes das variáveis
   `{{...}}` exatamente assim, porque `emailService.ts` envia os dados
   com esses nomes):

   - **To Email** (campo de configuração do template, não do corpo):
     `{{to_email}}`
   - **Subject**: `Seu acesso ao {{app_name}} — credenciais de primeiro acesso`
   - **Content** (corpo do e-mail):
     ```
     Olá, {{to_name}}!

     Sua conta de {{role_label}} foi criada no {{app_name}}. Use as
     credenciais abaixo para o seu primeiro acesso:

     {{login_label}}: {{login_value}}
     Senha temporária: {{temp_password}}

     Essa credencial é válida até {{expires_at}}. No primeiro acesso,
     você será solicitado a definir sua própria senha definitiva.

     Se você não esperava este e-mail, ignore-o ou avise a administração
     da escola.
     ```
   Anote o **Template ID** gerado.
4. Em **Account → General**, copie a **Public Key**.
5. (Recomendado) Em **Account → Security**, copie a **Private Key** e
   habilite o modo **Strict** — sem isso, qualquer pessoa que descubra
   sua Public Key (que fica visível no código do navegador — isso é
   esperado no modelo da EmailJS) consegue disparar e-mails pelo seu
   template.
6. Preencha em `.env.local`:
   ```
   VITE_EMAILJS_SERVICE_ID=...
   VITE_EMAILJS_TEMPLATE_ID=...
   VITE_EMAILJS_PUBLIC_KEY=...
   VITE_EMAILJS_PRIVATE_KEY=...
   ```
7. **Pendência registrada nesta etapa**: nenhuma conta EmailJS foi
   configurada durante o desenvolvimento — sem essas variáveis
   preenchidas, `createTeacher`/`createStudent` falham de forma
   explícita e limpa (nada é criado no Firebase — ver ordem de
   execução em `userService.createTeacher`/
   `studentService.createStudent`). Configure a conta acima antes do
   primeiro cadastro real.

### ⚠️ Limite do plano gratuito da EmailJS

200 requisições de e-mail por mês, 2 templates (confirmado em 2026).
Cada professor/aluno cadastrado consome 1 dessas 200. Se o limite for
excedido, a API recusa a chamada (normalmente HTTP 429) e
`sendFirstAccessEmail` propaga o erro — o cadastro falha de forma
explícita, sem fingir que o e-mail foi enviado. Se isso se tornar um
problema recorrente, os planos pagos da EmailJS começam em ~US$9/mês
com limites bem maiores.

### CORS: por que a EmailJS resolve o que a Resend não resolvia

Diferente da Resend (cuja API é pensada para uso em servidor), a API
da EmailJS foi desenhada desde o início para ser chamada direto do
navegador — é a proposta central do produto ("sem servidor"). Por
isso, ao contrário da versão anterior desta etapa (que usava Resend),
não se espera bloqueio de CORS aqui. Ainda assim, só é possível
confirmar com 100% de certeza testando com uma conta EmailJS real.

### ⚠️ Limitação conhecida: expiração da credencial temporária (Decisão 3)

`tempCredentialsExpireAt` (48h) é checado no cliente, em
`resolveLoginKey`/`LoginPage`, e bloqueia a TELA de login por
matrícula/chave depois desse prazo. **Isso não é uma invalidação real
da senha no Firebase Authentication**: sem Cloud Functions/Admin SDK,
não existe forma de expirar uma senha do lado do servidor pelo SDK do
cliente. Um agente que chamasse a API do Firebase diretamente (fora da
UI do Tekidu) ainda conseguiria autenticar com a senha temporária
mesmo depois das 48h, até o primeiro acesso ser concluído (o que troca
a senha de verdade). Documentado aqui para não passar a falsa
impressão de que a expiração é uma barreira de segurança — é apenas
uma barreira de UX/processo, igual reconhecido na Decisão 2 quando a
Opção B foi descrita como tendo "trade-offs de segurança a aceitar
explicitamente".

## Firestore Security Rules — nova coleção `loginKeys`

Além de `users/{userId}` (que ganhou os campos `mustSetPassword`,
`loginKey`, `tempPasswordSetAt`, `tempCredentialsExpireAt`), esta etapa
adiciona a coleção `loginKeys/{loginKey}` — ver bloco de comentários
correspondente em `firestore.rules`. Republique as regras:

```bash
firebase deploy --only firestore:rules
```

## Foto de perfil oficial do aluno — Firebase Storage

Este recurso introduz o primeiro uso de **Firebase Storage** no projeto
(até aqui, só Firestore era usado). São necessários dois passos manuais
que não podem ser aplicados só por código:

### 1. Ativar o Storage no projeto

No [Firebase Console](https://console.firebase.google.com/) → projeto
`tekidu-26c0f` → **Storage** → **Vamos começar**, se ainda não tiver sido
ativado. Isso cria o bucket referenciado por `VITE_FIREBASE_STORAGE_BUCKET`
(já presente em `.env.local`).

### 2. Publicar `storage.rules`

As regras vivem em `storage.rules` (raiz do projeto) e restringem a
foto do aluno (`student-photos/{studentId}/photo.jpg`) a: leitura por
staff ou pelo próprio aluno; escrita/exclusão só por admin. Publique com:

```bash
firebase deploy --only storage
```

Sem este passo, o bucket fica com a regra padrão do Firebase (nega
tudo), e o upload/leitura da foto falha com `storage/unauthorized`
mesmo para o admin.
