import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notification, NotificationInput } from "@/types/notification";

const notificationsCollection = collection(db, "notifications");

function toNotification(id: string, data: Record<string, unknown>): Notification {
  return {
    id,
    recipientUid: (data.recipientUid as string) ?? "",
    type: (data.type as Notification["type"]) ?? "grade_posted",
    title: (data.title as string) ?? "",
    message: (data.message as string) ?? "",
    link: (data.link as string | null) ?? null,
    read: (data.read as boolean) ?? false,
    createdAt: data.createdAt,
  };
}

/**
 * Cria uma notificação. Deliberadamente "fire-and-forget" — mesmo
 * racional de `auditService.logAuditEvent`: notificar alguém é um
 * efeito colateral de uma ação principal (lançar nota, vincular
 * disciplina, cadastrar professor); se a gravação da notificação
 * falhar, isso NUNCA deve impedir nem reverter a ação principal, que
 * já foi concluída com sucesso no momento em que esta função é
 * chamada.
 */
export function createNotification(input: NotificationInput): void {
  addDoc(notificationsCollection, {
    recipientUid: input.recipientUid,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
    read: false,
    createdAt: serverTimestamp(),
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error("[NotificationService] Falha ao criar notificação", input.type, error);
  });
}

/** Atalho para notificar vários destinatários com o mesmo conteúdo (ex.: todos os admins). */
export function createNotifications(inputs: NotificationInput[]): void {
  for (const input of inputs) createNotification(input);
}

const RECENT_LIMIT = 30;

/**
 * Notificações mais recentes de um usuário (lidas e não lidas),
 * usadas para preencher o painel do sino. Limitado a `RECENT_LIMIT`
 * de propósito — o painel é uma prévia recente, não um histórico
 * completo (evita carregar centenas de documentos antigos só para
 * mostrar os últimos 20-30).
 */
export async function getRecentNotifications(uid: string): Promise<Notification[]> {
  const q = query(
    notificationsCollection,
    where("recipientUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(RECENT_LIMIT)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toNotification(d.id, d.data()));
}

/**
 * Contagem de não lidas — consulta separada (filtra `read == false`
 * além de `recipientUid`) em vez de derivar de `getRecentNotifications`,
 * para o contador do sino ficar correto mesmo que existam mais de
 * `RECENT_LIMIT` notificações não lidas acumuladas.
 */
export async function getUnreadCount(uid: string): Promise<number> {
  const q = query(
    notificationsCollection,
    where("recipientUid", "==", uid),
    where("read", "==", false)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
}

/**
 * Etapa 6 — versão em tempo real de `getRecentNotifications`, usada
 * pelo painel do sino enquanto ele está aberto. `onSnapshot` mantém a
 * lista sincronizada sem precisar de um botão "atualizar" nem de
 * polling: uma nota lançada por um professor em outra aba aparece no
 * sino do aluno sem recarregar a página.
 *
 * Retorna a função de `unsubscribe` — o CHAMADOR é responsável por
 * invocá-la no cleanup do `useEffect` (ver `NotificationCenter.tsx`);
 * não fazer isso vazaria um listener por montagem/desmontagem do
 * painel, cobrando leituras do Firestore para sempre.
 */
export function subscribeToRecentNotifications(
  uid: string,
  onChange: (notifications: Notification[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const q = query(
    notificationsCollection,
    where("recipientUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(RECENT_LIMIT)
  );
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map((d) => toNotification(d.id, d.data()))),
    (error) => {
      console.error("[NotificationService] Falha no listener de notificações", error);
      onError?.(error);
    }
  );
}

/**
 * Etapa 6 — versão em tempo real de `getUnreadCount`. Assinada
 * IMEDIATAMENTE ao entrar no app (não só quando o painel abre), para
 * o contador do sino já nascer certo e se manter certo mesmo com o
 * painel fechado — é o que faz o sino "acender" sozinho quando uma
 * notificação nova chega, sem o usuário precisar clicar em nada.
 *
 * Consulta separada de `subscribeToRecentNotifications` (mesmo
 * racional de `getUnreadCount`): garante a contagem certa mesmo além
 * de `RECENT_LIMIT` notificações não lidas acumuladas.
 */
export function subscribeToUnreadCount(
  uid: string,
  onChange: (count: number) => void,
  onError?: (error: unknown) => void
): () => void {
  const q = query(
    notificationsCollection,
    where("recipientUid", "==", uid),
    where("read", "==", false)
  );
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.size),
    (error) => {
      console.error("[NotificationService] Falha no listener de contagem", error);
      onError?.(error);
    }
  );
}

export async function markAsRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
}

/**
 * Marca todas as notificações não lidas de um usuário como lidas em um
 * único `writeBatch` — evita N chamadas sequenciais de `updateDoc`
 * (uma por notificação) ao clicar em "marcar todas como lidas".
 */
export async function markAllAsRead(uid: string): Promise<void> {
  const q = query(
    notificationsCollection,
    where("recipientUid", "==", uid),
    where("read", "==", false)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  for (const docSnap of snapshot.docs) {
    batch.update(docSnap.ref, { read: true });
  }
  await batch.commit();
}
