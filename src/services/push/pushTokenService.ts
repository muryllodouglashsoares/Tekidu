import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PushToken } from "@/types/pushToken";

function pushTokensCollection(uid: string) {
  return collection(db, "users", uid, "pushTokens");
}

function detectPlatform(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios-safari";
  if (/android/i.test(ua)) return /chrome/i.test(ua) ? "android-chrome" : "android";
  if (/edg\//i.test(ua)) return "desktop-edge";
  if (/chrome/i.test(ua)) return "desktop-chrome";
  if (/firefox/i.test(ua)) return "desktop-firefox";
  if (/safari/i.test(ua)) return "desktop-safari";
  return "desktop";
}

/**
 * Registra/atualiza o token FCM deste dispositivo/navegador.
 *
 * Usar o TOKEN como ID do documento (em vez de `addDoc`) é o que torna
 * a operação idempotente (ETAPA 17 do prompt): chamar de novo com o
 * mesmo token (reload, reabrir aba) apenas atualiza `updatedAt`/
 * `lastUsedAt`, nunca cria um segundo registro para o mesmo
 * dispositivo. Multi-dispositivo (ETAPA 19) continua funcionando
 * porque cada navegador/aparelho recebe um token DIFERENTE do FCM.
 */
export async function savePushToken(uid: string, token: string): Promise<void> {
  const ref = doc(pushTokensCollection(uid), token);
  await setDoc(
    ref,
    {
      uid,
      token,
      platform: detectPlatform(),
      status: "active",
      updatedAt: serverTimestamp(),
      lastUsedAt: serverTimestamp(),
      // `createdAt` só é setado se o documento ainda não existir —
      // `merge: true` abaixo preserva o valor original em updates.
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** Remove o token deste dispositivo (ETAPA 5: "desativar quando necessário"). Não afeta os tokens de OUTROS dispositivos do mesmo usuário (ETAPA 19). */
export async function deletePushToken(uid: string, token: string): Promise<void> {
  await deleteDoc(doc(pushTokensCollection(uid), token));
}

/** Lista os tokens registrados do usuário logado (usado pela UI de status/depuração — nunca para envio, que é sempre server-side). */
export async function getOwnPushTokens(uid: string): Promise<PushToken[]> {
  const snapshot = await getDocs(pushTokensCollection(uid));
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PushToken, "id">) }));
}
