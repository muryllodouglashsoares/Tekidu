import { getToken, getMessaging, onMessage, type Messaging } from "firebase/messaging";
import { app } from "@/lib/firebase";
import { savePushToken, deletePushToken } from "./pushTokenService";
import type { PushPermissionState } from "@/types/pushToken";

/**
 * Camada isolada de gerenciamento de Web Push (ETAPA 5 do prompt) —
 * não depende de nenhum componente React. `usePushNotifications`
 * (hook) é a única coisa que a UI deve importar; este módulo é
 * consumido só por aquele hook.
 */

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

let messagingInstance: Messaging | null = null;
let foregroundListenerAttached = false;

/** `true` quando o navegador/dispositivo tem o mínimo necessário para Web Push (Service Worker + Notification API + Push API). Nunca lança — só reporta. */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Estado ATUAL sem pedir nada ao usuário (ETAPA 15). `hasActiveToken` vem de fora — ver `usePushNotifications`, que cruza isso com o Firestore. */
export function getBrowserPermissionState(): "default" | "denied" | "granted" {
  if (!isPushSupported()) return "default";
  return Notification.permission;
}

function getMessagingInstance(): Messaging {
  if (!messagingInstance) messagingInstance = getMessaging(app);
  return messagingInstance;
}

/**
 * Notificação recebida com a Tekidu ABERTA em primeiro plano. O SDK
 * do Messaging não dispara `onBackgroundMessage` (do Service Worker)
 * nesse caso — quem recebe é este `onMessage`, no contexto da própria
 * página. Propositalmente NÃO mostra uma notificação do sistema
 * operacional aqui (o sino interno, em tempo real via
 * `subscribeToRecentNotifications`, já cobre esse cenário) — só serve
 * de log/observabilidade (ETAPA 27) hoje; pode ganhar um toast no
 * futuro sem mexer no Service Worker.
 */
function attachForegroundListener() {
  if (foregroundListenerAttached) return;
  foregroundListenerAttached = true;
  onMessage(getMessagingInstance(), (payload) => {
    // eslint-disable-next-line no-console
    console.info("[push] Mensagem recebida em primeiro plano", payload.data?.type);
  });
}

/**
 * Fluxo completo de ativação (ETAPA 5/29): registra o Service Worker
 * (reaproveita o já registrado pelo `vite-plugin-pwa` — nunca cria um
 * segundo), pede a permissão nativa do navegador (só deve ser chamado
 * a partir de uma ação explícita do usuário — ver ETAPA 14, nunca
 * automaticamente ao carregar a app) e, se concedida, obtém e salva o
 * token FCM.
 *
 * Lança um erro descritivo em cada etapa que pode falhar — a UI (hook)
 * decide como comunicar isso, nunca finge sucesso.
 */
export async function enablePushNotifications(uid: string): Promise<void> {
  if (!isPushSupported()) {
    throw new Error("Este navegador/dispositivo não tem suporte a notificações push.");
  }
  if (!VAPID_KEY) {
    throw new Error(
      "Chave VAPID não configurada (VITE_FIREBASE_VAPID_KEY). Veja docs/PUSH_NOTIFICATIONS.md."
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Permissão de notificações negada no navegador."
        : "Permissão de notificações não foi concedida."
    );
  }

  // O mesmo Service Worker único da Tekidu (`src/sw.ts`) — nunca
  // registramos um `firebase-messaging-sw.js` separado (ver
  // justificativa em `sw.ts`). `navigator.serviceWorker.ready` espera
  // o registro já feito por `useRegisterSW` (PWAUpdatePrompt, montado
  // globalmente no AppShell) ficar ativo.
  const registration = await navigator.serviceWorker.ready;

  const token = await getToken(getMessagingInstance(), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) {
    throw new Error("Não foi possível obter o token de notificações deste dispositivo.");
  }

  await savePushToken(uid, token);
  attachForegroundListener();
  // eslint-disable-next-line no-console
  console.info("[push] Notificações ativadas para este dispositivo");
}

/**
 * Desativa push SÓ NESTE dispositivo (ETAPA 19: multi-dispositivo —
 * desativar em um Chrome Desktop não mexe no token do celular).
 * Remove o registro em Firestore; o token do FCM em si permanece
 * válido no navegador (não há uma forma limpa e universalmente
 * suportada de "invalidar" via `deleteToken` em todos os browsers sem
 * também quebrar um futuro `enablePushNotifications` no mesmo
 * dispositivo) — sem o documento em Firestore, porém, o backend nunca
 * mais envia nada para ele, que é o efeito que importa para o usuário.
 */
export async function disablePushNotifications(uid: string): Promise<void> {
  if (!isPushSupported() || !VAPID_KEY) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(getMessagingInstance(), {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (token) await deletePushToken(uid, token);
  } catch (error) {
    // Mesmo se não conseguirmos recuperar o token atual (ex.: já
    // revogado pelo navegador), a intenção do usuário era desativar —
    // não deixar isso travado numa exceção não tratada.
    // eslint-disable-next-line no-console
    console.error("[push] Falha ao desativar notificações", error);
    throw new Error("Não foi possível desativar as notificações neste dispositivo.");
  }
}

/** Resolve o estado a ser exibido na UI (ETAPA 15), cruzando suporte + permissão do navegador com a preferência local do usuário. */
export function resolvePushStatus(hasStoredPreferenceEnabled: boolean): PushPermissionState {
  if (!isPushSupported()) return "unsupported";
  const permission = getBrowserPermissionState();
  if (permission === "denied") return "denied";
  if (permission === "granted" && hasStoredPreferenceEnabled) return "enabled";
  return "disabled";
}
