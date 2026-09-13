# Web Push (Notificações Reais) — Firebase Cloud Messaging

Esta é a documentação da implementação de Web Push da Tekidu (Service
Worker + FCM + Cloudflare Pages Functions). **Nenhuma peça deste
sistema usa um recurso pago** — tudo roda dentro do plano Firebase
Spark (gratuito) e do plano gratuito da Cloudflare Pages.

## 1. Como funciona (visão geral)

```
Evento acadêmico (nota, aviso, mensagem, ...)
        ↓
notificationService.createNotification()/createNotifications()
        ├── grava em Firestore: notifications/{id}      (sistema interno, já existia)
        └── POST /api/send-push { notificationIds }      (novo — dispara a entrega)
                ↓
functions/api/send-push.ts (Cloudflare Pages Function)
        ├── verifica o ID token do chamador (defesa em profundidade)
        ├── autentica como a Service Account (OAuth2 JWT Bearer)
        ├── relê notifications/{id} via Firestore REST (fonte da verdade)
        ├── busca users/{uid}/pushTokens (status == "active")
        └── envia via FCM HTTP v1, um token por vez
                ↓
src/sw.ts (Service Worker único: PWA + Push)
        ├── onBackgroundMessage → self.registration.showNotification()
        └── notificationclick → foca aba existente ou abre nova, na URL certa
```

O sistema de notificações **internas** (sino, `/notificacoes`) continua
funcionando exatamente como antes — o Push é um canal adicional, nunca
uma substituição.

## 2. Configuração no Firebase Console (obrigatória)

1. **Cloud Messaging → Web configuration → Web Push certificates**:
   clique em "Generate key pair". Isso gera o **par de chaves VAPID**.
   - Copie a chave pública para `VITE_FIREBASE_VAPID_KEY` (arquivo
     `.env.local`, e também nas variáveis de ambiente do Cloudflare
     Pages, com o prefixo `VITE_` — esta é pública, pode ir no bundle).

2. **IAM e administrador → Contas de serviço** (Google Cloud Console,
   mesmo projeto do Firebase): crie uma nova Service Account, por
   exemplo `tekidu-push-sender`.
   - Conceda a ela os papéis (roles):
     - **Cloud Datastore User** (`roles/datastore.user`) — permite ler
       `notifications` e `users/*/pushTokens` via API REST.
     - **Firebase Cloud Messaging API Admin** (`roles/firebasemessaging.admin`)
       — permite enviar mensagens via FCM HTTP v1.
   - Gere uma **chave JSON** para essa Service Account ("Chaves" →
     "Adicionar chave" → "Criar nova chave" → JSON). Baixe o arquivo —
     ele contém `client_email` e `private_key`, que vão para a
     Cloudflare (nunca para o repositório/frontend).

3. Confirme que a **Firebase Cloud Messaging API (V1)** está habilitada
   em "APIs e Serviços" do Google Cloud Console (normalmente já vem
   habilitada ao ativar o Cloud Messaging pelo Firebase Console).

Nada disso tem custo: Service Accounts, papéis de IAM e as chamadas
feitas por este projeto às APIs de Firestore/FCM permanecem nas cotas
gratuitas do plano Spark.

## 3. Variáveis de ambiente

### Frontend (`.env.local`, e Cloudflare Pages → Settings → Environment variables, aba "Build")

```
VITE_FIREBASE_VAPID_KEY=<chave pública do par VAPID, passo 1 acima>
```

(As demais `VITE_FIREBASE_*` já existiam — ver `.env.example`.)

### Backend — Cloudflare Pages Functions (Settings → Environment variables → Production **e** Preview, sem prefixo `VITE_`, para NUNCA irem ao bundle do cliente)

```
FCM_PROJECT_ID=<mesmo valor de VITE_FIREBASE_PROJECT_ID>
FCM_SERVICE_ACCOUNT_EMAIL=<client_email do JSON da Service Account>
FCM_SERVICE_ACCOUNT_PRIVATE_KEY=<private_key do JSON da Service Account, com as quebras de linha>
```

**Atenção ao colar `FCM_SERVICE_ACCOUNT_PRIVATE_KEY`**: o valor no JSON
vem com `\n` literais dentro de uma string (`"-----BEGIN PRIVATE
KEY-----\n..."`). O painel da Cloudflare aceita colar o valor como
está (com `\n` literais) — o código em
`functions/api/_lib/googleAuth.ts` já normaliza isso automaticamente.

### O que NUNCA deve ser commitado

- O arquivo JSON da Service Account.
- `FCM_SERVICE_ACCOUNT_PRIVATE_KEY` em qualquer arquivo versionado.
- `.env.local` (já está no `.gitignore` do projeto).

## 4. Firestore — coleções novas

`users/{uid}/pushTokens/{tokenId}` — um documento por
dispositivo/navegador com push ativo. `tokenId` é o próprio token FCM
(garante idempotência — ver `types/pushToken.ts`).

Campo novo em `notifications/{id}`: `pushSent: boolean` (setado só
pelo backend, via Service Account — o Firestore Rule de `update` do
cliente continua restrito a `hasOnly(['read'])`, então nenhum cliente
consegue forjar esse campo).

Nenhum índice composto novo é necessário: a única query nova
(`pushTokens where status == "active"`) é de campo único, dentro de um
único documento pai — não exige entrada em `firestore.indexes.json`.

## 5. Deploy das novas Firestore Rules

```
firebase deploy --only firestore:rules
```

(A extensão feita em `firestore.rules`, seção `users/{userId}/pushTokens/{tokenId}`, precisa ser publicada — o mesmo fluxo que já é usado para o resto do projeto.)

## 6. Onde está cada parte do código

| O quê | Onde |
| --- | --- |
| Service Worker (PWA + FCM) | `src/sw.ts` |
| Build do Service Worker | `vite.config.ts` (estratégia `injectManifest`) |
| Registro/permissão/token (cliente) | `src/services/push/pushNotificationService.ts` |
| CRUD de tokens no Firestore | `src/services/push/pushTokenService.ts` |
| Hook de UI | `src/hooks/usePushNotifications.ts` |
| Card de ativação (Configurações) | `src/components/notifications/PushNotificationSettings.tsx` |
| Funil central (Notification Service) | `src/services/notifications/notificationService.ts` (função `triggerPushDelivery`) |
| Integração com Avisos | `src/services/announcements/announcementService.ts` (função `notifyAnnouncementAudience`) |
| Envio real (backend) | `functions/api/send-push.ts` |
| Autenticação Google (Service Account + verificação de ID token) | `functions/api/_lib/googleAuth.ts` |
| Cliente REST do Firestore (server-side) | `functions/api/_lib/firestoreRest.ts` |
| Regras do Firestore para `pushTokens` | `firestore.rules` |

### Como adicionar um novo tipo de Push no futuro

1. Adicione o novo valor em `NotificationType` (`src/types/notification.ts`) e um ícone em `NotificationCenter.tsx`.
2. No local onde o evento acontece, chame `createNotification`/`createNotifications` (já existe centenas de exemplos — `gradeService`, `AttendancePage`, `chatService`, etc.).
3. **Não precisa mexer em mais nada** — `notificationService.ts` já aciona o Push automaticamente para qualquer tipo.

## 7. Eventos já conectados nesta implementação

Como o Push foi conectado ao Notification Service **central**, todo
evento que já criava uma notificação interna passou a também gerar
Push automaticamente, sem código extra por evento:

- Aluno: nota lançada, avaliação criada/atualizada, alerta de
  frequência, disciplina vinculada (quando relevante), nova mensagem,
  decisão de justificativa de falta, **novo aviso publicado** (item
  novo desta implementação — ver `announcementService.ts`).
- Professor: novo aviso publicado, nova mensagem de aluno.
- Admin: novo professor/responsável cadastrado (`teacher_created`).

## 8. Limitações conhecidas

- **iOS/Safari**: Web Push só funciona com a Tekidu **instalada** na
  tela de início (PWA), a partir do iOS 16.4+. Em uma aba comum do
  Safari no iPhone/iPad, o navegador não oferece a API de Push — o
  card de Configurações mostra "não suportado" nesse caso, e o usuário
  continua recebendo tudo pelo sino interno.
- Navegadores/dispositivos sem suporte a Service Worker + Push API
  (ex.: alguns WebViews embutidos) também caem no estado "não
  suportado" — nunca quebram a aplicação.
- O envio é por token individual (sem `sendMulticast`, que na API v1
  do FCM exige uma chamada por mensagem mesmo em lote) — para o volume
  de uma plataforma acadêmica isso é suficiente; se o número de
  destinatários por evento crescer muito (milhares), vale revisitar
  com filas/paralelismo controlado.
- Sem Cloud Functions (não usadas, de propósito, para evitar o plano
  Blaze), o disparo do Push depende do CLIENTE que criou a notificação
  chamar `/api/send-push` logo em seguida — a notificação INTERNA já
  fica gravada de qualquer forma; se a chamada de Push falhar (ex.:
  usuário fechou a aba no meio do caminho, antes do `fetch` completar),
  a notificação continua existindo, só sem `pushSent: true`. Como não
  há um cron/job para "varrer pendências" nesta primeira implementação,
  o Push nesse caso raro não é reenviado depois automaticamente — fica
  como limitação conhecida, documentada aqui de propósito.

## 9. Como testar

```
Login
→ Configurações → "Ativar notificações"
→ Permitir (prompt nativo do navegador)
→ Em outra conta/aba (professor/admin), lançar uma nota,
  publicar um aviso, ou enviar uma mensagem
→ Minimizar ou trocar de aba a Tekidu (ou fechar, se instalada como PWA)
→ Notificação real do sistema operacional deve aparecer
→ Clicar na notificação
→ Validar que a Tekidu abre/foca na página correta (ex.: /avisos)
```

Testes automatizados relevantes (`npm test`) cobrem a lógica pura dos
serviços (não cobrem a permissão nativa do navegador nem o envio real
via FCM, que exigem ambiente de navegador/rede reais — ver seção 20 do
prompt original: "criar uma maneira segura de testar", cumprida aqui
pelo fluxo manual acima, já que simular a API de Push do navegador em
um ambiente de CI teria valor limitado para este projeto).

## 10. Checklist de aceitação (mapeada às etapas do prompt original)

- [x] Ativação sob demanda (nunca automática) — `PushNotificationSettings.tsx`.
- [x] Multi-dispositivo, um token por navegador/aparelho — `pushTokenService.ts` (ID = token).
- [x] Token inválido nunca bloqueia os demais — `send-push.ts`, `Promise.allSettled`.
- [x] Idempotência (`pushSent`, token como ID de documento).
- [x] Clique leva à página relacionada, reaproveitando aba existente — `src/sw.ts`.
- [x] Nenhuma credencial privada no frontend.
- [x] Frontend nunca decide "para quem enviar" — o backend relê o Firestore.
- [x] Convive com o Service Worker de PWA já existente (mesmo arquivo, mesmo escopo).
- [x] Sistema de notificações internas preservado e não duplicado.
