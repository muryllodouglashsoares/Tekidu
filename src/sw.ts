/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

/**
 * Service Worker ÚNICO da Tekidu — PWA (precache) + Web Push (Firebase
 * Cloud Messaging).
 *
 * POR QUE UM SÓ ARQUIVO: o navegador permite apenas UM Service Worker
 * ativo por escopo ("/"). Um `firebase-messaging-sw.js` separado
 * registrado também em "/" substituiria (ou seria substituído por)
 * este SW de PWA — os dois nunca coexistiriam de verdade. Por isso a
 * mensageria do FCM foi integrada aqui dentro, no mesmo arquivo que já
 * cuidava do precache/instalação (ver `vite.config.ts`, estratégia
 * `injectManifest`).
 *
 * O QUE ESTE ARQUIVO REPRODUZ DO "generateSW" ANTERIOR (para não
 * perder nenhum comportamento ao migrar de estratégia):
 * - precache dos assets do build (`self.__WB_MANIFEST`);
 * - Firestore/Auth do Firebase NUNCA passam pelo cache do SW —
 *   simplesmente não interceptamos essas requisições em nenhum
 *   `fetch` handler, então elas seguem 100% pela rede, como antes;
 * - `skipWaiting: false` / `clientsClaim: false`: o SW novo fica em
 *   "waiting" até o usuário confirmar a atualização no
 *   `PWAUpdatePrompt` — não chamamos `self.skipWaiting()` nem
 *   `clients.claim()` automaticamente aqui.
 */

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getMessaging, onBackgroundMessage, isSupported } from "firebase/messaging/sw";

// Precache dos arquivos do build — injetado em build-time pelo plugin
// (`vite-plugin-pwa`, estratégia `injectManifest`). Em dev, o array
// fica vazio; a linha é inofensiva.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ---------------------------------------------------------------------
// Web Push (Firebase Cloud Messaging)
// ---------------------------------------------------------------------

// Mesmas variáveis PÚBLICAS já usadas em `src/lib/firebase.ts` — um
// Service Worker não tem acesso ao `.env.local` do jeito que o app
// principal tem, mas o Vite substitui `import.meta.env.VITE_*` em
// build-time também dentro do SW (a estratégia `injectManifest` passa
// este arquivo pelo mesmo pipeline). Nenhuma chave privada é usada
// aqui — só a config pública do Web SDK (ver justificativa em
// `lib/firebase.ts`).
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Formato do payload de dados enviado por `functions/api/send-push.ts` (ver `types/pushToken.ts`). */
interface TekiduPushData {
  notificationId?: string;
  type?: string;
  url?: string;
  entityId?: string;
  entityType?: string;
}

// FCM Web Push só é suportado em contextos com Service Worker + Push
// API (navegador/dispositivo compatíveis) — `isSupported()` evita
// quebrar o SW em navegadores que não implementam algo que o SDK do
// Messaging precisa internamente (ex.: alguns WebViews).
isSupported()
  .then((supported) => {
    if (!supported || !firebaseConfig.apiKey) return;

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    // Mensagens Push recebidas com a Tekidu em segundo plano/fechada.
    // (Se o app estiver em primeiro plano, quem recebe é o listener
    // `onMessage` no próprio contexto da página — não implementado de
    // propósito: notificação do SO enquanto o usuário já está OLHANDO
    // a tela seria redundante com o sino interno, que já atualiza em
    // tempo real via `subscribeToRecentNotifications`.)
    onBackgroundMessage(messaging, (payload) => {
      const data = (payload.data ?? {}) as TekiduPushData;
      const title = payload.notification?.title ?? "Tekidu";
      const body = payload.notification?.body ?? "";

      // ETAPA 17 do prompt (controle de duplicidade): agrupa pelo
      // `notificationId` quando existe — uma nova entrega do MESMO
      // evento (ex.: reconexão do navegador reenviando) substitui a
      // notificação do SO em vez de empilhar duas iguais.
      const tag = data.notificationId ?? data.type ?? undefined;

      self.registration.showNotification(title, {
        body,
        tag,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data,
      });
    });
  })
  .catch((error) => {
    // Nunca deixar uma falha ao inicializar o Messaging quebrar o
    // resto do Service Worker (precache/PWA continuam funcionando).
    // eslint-disable-next-line no-console
    console.error("[sw] Falha ao inicializar Firebase Messaging", error);
  });

// ---------------------------------------------------------------------
// Clique na notificação (ETAPA 13 do prompt)
// ---------------------------------------------------------------------
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const data = (event.notification.data ?? {}) as TekiduPushData;
  const targetPath = data.url && data.url.startsWith("/") ? data.url : "/";
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Reutiliza uma aba já aberta da Tekidu quando existir, só
      // navegando para o destino — em vez de abrir uma nova aba a
      // cada notificação clicada.
      for (const client of allClients) {
        if ("focus" in client) {
          const windowClient = client as WindowClient;
          if (new URL(windowClient.url).origin === self.location.origin) {
            await windowClient.focus();
            if ("navigate" in windowClient) {
              await windowClient.navigate(targetUrl).catch(() => {
                // Alguns navegadores restringem `navigate()` fora do
                // mesmo path — se falhar, ao menos a aba já foi
                // focada; o usuário ainda consegue navegar manualmente.
              });
            }
            return;
          }
        }
      }

      // Nenhuma aba aberta: abre a Tekidu já no destino correto.
      await self.clients.openWindow(targetUrl);
    })()
  );
});

// Payload inválido/corrompido não deve quebrar o Service Worker — o
// próprio `onBackgroundMessage` já roda dentro de um handler que o
// Firebase encapsula em try/catch internamente; o `.catch` acima cobre
// falha de inicialização. Nenhum outro estado global é mantido aqui,
// então uma mensagem malformada nunca deixa o SW em estado inconsistente
// para a próxima (ETAPA 4 do prompt).
