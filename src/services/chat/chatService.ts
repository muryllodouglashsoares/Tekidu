import {
  collection,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createNotification } from "@/services/notifications/notificationService";
import type { Conversation, ConversationCreateInput } from "@/types/conversation";
import type { Message, MessageInput } from "@/types/message";
import { MESSAGE_MAX_LENGTH } from "@/types/message";

/**
 * PARTE 1 do plano de evolução — Mensageria/chat interno.
 *
 * Reaproveita a MESMA convenção de ID determinístico já usada em
 * `gradeService.buildGradeId`/`attendanceRecordService.
 * buildAttendanceRecordId`: `{teacherUid}_{studentId}` garante no
 * máximo uma conversa por par professor+aluno, sem precisar de uma
 * query para "encontrar se já existe" — apenas um `getDoc` por ID.
 */
export function buildConversationId(teacherUid: string, studentId: string): string {
  return `${teacherUid}_${studentId}`;
}

function toConversation(id: string, data: Record<string, unknown>): Conversation {
  return {
    id,
    participantUids: (data.participantUids as string[]) ?? [],
    studentId: (data.studentId as string) ?? "",
    studentUid: (data.studentUid as string) ?? "",
    studentName: (data.studentName as string) ?? "",
    teacherUid: (data.teacherUid as string) ?? "",
    teacherName: (data.teacherName as string) ?? "",
    classId: (data.classId as string) ?? "",
    disciplineId: (data.disciplineId as string | null) ?? null,
    disciplineName: (data.disciplineName as string | null) ?? null,
    lastMessage: (data.lastMessage as string | null) ?? null,
    lastMessageAt: data.lastMessageAt ?? null,
    lastMessageSenderUid: (data.lastMessageSenderUid as string | null) ?? null,
    unreadCount: (data.unreadCount as Record<string, number>) ?? {},
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function toMessage(conversationId: string, id: string, data: Record<string, unknown>): Message {
  return {
    id,
    conversationId,
    senderUid: (data.senderUid as string) ?? "",
    recipientUid: (data.recipientUid as string) ?? "",
    content: (data.content as string) ?? "",
    createdAt: data.createdAt,
    readAt: data.readAt ?? null,
  };
}

/**
 * Resolve (ou cria, se ainda não existir) a conversa entre um
 * professor e um aluno específicos. Chamada tanto pelo fluxo "aluno
 * inicia conversa com professor" quanto "professor inicia conversa
 * com aluno" (ver `NewConversationModal`) — o `getDoc` por ID
 * determinístico garante que os dois fluxos convergem para o MESMO
 * documento, nunca criam duplicatas.
 *
 * A validação real de elegibilidade (o professor de fato leciona uma
 * disciplina da turma do aluno) é feita pela Security Rule
 * (`isValidConversationPair`) — este serviço nunca deve ser tratado
 * como a barreira de segurança, apenas como o caminho feliz da UI
 * (mesmo princípio já documentado em `ProtectedRoute.tsx`).
 */
export async function getOrCreateConversation(input: ConversationCreateInput): Promise<Conversation> {
  const id = buildConversationId(input.teacherUid, input.studentId);
  const ref = doc(db, "conversations", id);

  const existing = await getDoc(ref);
  if (existing.exists()) {
    return toConversation(existing.id, existing.data());
  }

  const payload = {
    participantUids: [input.teacherUid, input.studentUid],
    studentId: input.studentId,
    studentUid: input.studentUid,
    studentName: input.studentName,
    teacherUid: input.teacherUid,
    teacherName: input.teacherName,
    classId: input.classId,
    disciplineId: input.disciplineId,
    disciplineName: input.disciplineName,
    lastMessage: null,
    lastMessageAt: null,
    lastMessageSenderUid: null,
    unreadCount: { [input.teacherUid]: 0, [input.studentUid]: 0 },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload);
  const created = await getDoc(ref);
  return toConversation(created.id, created.data() as Record<string, unknown>);
}

/**
 * Tempo real (item "Tempo real" do plano — `onSnapshot`, nunca
 * polling): lista de conversas do usuário logado, ordenada pela
 * atividade mais recente. A query já filtra por `participantUids
 * array-contains uid` — nunca busca "todas as conversas da escola"
 * (item de performance do plano). Requer o índice composto declarado
 * em `firestore.indexes.json` (array-contains + orderBy).
 *
 * Retorna a função de `unsubscribe` — o CHAMADOR cancela no cleanup
 * do `useEffect` (mesmo contrato de
 * `notificationService.subscribeToRecentNotifications`).
 */
export function subscribeToConversations(
  uid: string,
  onChange: (conversations: Conversation[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const q = query(
    collection(db, "conversations"),
    where("participantUids", "array-contains", uid),
    orderBy("updatedAt", "desc")
  );
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map((d) => toConversation(d.id, d.data()))),
    (error) => {
      console.error("[ChatService] Falha no listener de conversas", error);
      onError?.(error);
    }
  );
}

/**
 * Quantidade de mensagens recentes carregadas por conversa (item de
 * performance do plano — "não buscar todas as mensagens da escola"; a
 * mesma cautela se aplica dentro de UMA conversa: um histórico de anos
 * de troca de mensagens não precisa ser carregado inteiro só para abrir
 * a tela). Mesmo racional de `notificationService.RECENT_LIMIT`.
 * Mensagens mais antigas que isso não são exibidas nesta primeira
 * versão (ver "Pendências" no relatório final — paginação/"carregar
 * mais antigas" fica para uma evolução futura).
 */
const MESSAGE_PAGE_SIZE = 200;

/**
 * Tempo real das mensagens de UMA conversa — sempre escopada por
 * `conversationId` (nunca uma consulta ampla, ver nota em
 * `types/message.ts`). Busca as `MESSAGE_PAGE_SIZE` mais recentes em
 * ordem decrescente (para o `limit` cortar pelas MAIS NOVAS, não pelas
 * mais antigas) e devolve já em ordem crescente (mais antiga primeiro),
 * que é a ordem de exibição natural do chat.
 */
export function subscribeToMessages(
  conversationId: string,
  onChange: (messages: Message[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "desc"),
    limit(MESSAGE_PAGE_SIZE)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((d) => toMessage(conversationId, d.id, d.data()));
      onChange(messages.reverse());
    },
    (error) => {
      console.error("[ChatService] Falha no listener de mensagens", error);
      onError?.(error);
    }
  );
}

/**
 * Envia uma mensagem. Grava a mensagem E atualiza o resumo da
 * conversa (`lastMessage`/`lastMessageAt`/`lastMessageSenderUid`/
 * `updatedAt`/`unreadCount` do destinatário) em um ÚNICO
 * `writeBatch` — as duas escritas são atômicas (ou as duas acontecem,
 * ou nenhuma), evitando o estado inconsistente de "mensagem gravada
 * mas lista de conversas não reflete o último envio".
 *
 * Ao final, cria a notificação interna existente (`notificationService`
 * — nunca um sistema de notificação paralelo, ver Parte 1 do plano) e
 * prepara o "envio de Web Push" (Parte 5 do plano, ainda não
 * implementada nesta etapa): a notificação interna é a garantia de
 * entrega — o Push é uma camada adicional que será acoplada aqui
 * quando `pushNotificationService` existir, sem precisar alterar este
 * fluxo.
 */
export async function sendMessage(conversationId: string, input: MessageInput): Promise<void> {
  const trimmed = input.content.trim();
  if (!trimmed) {
    throw new Error("Não é possível enviar uma mensagem vazia.");
  }
  if (trimmed.length > MESSAGE_MAX_LENGTH) {
    throw new Error(`A mensagem excede o limite de ${MESSAGE_MAX_LENGTH} caracteres.`);
  }

  const conversationRef = doc(db, "conversations", conversationId);
  const messageRef = doc(collection(db, "conversations", conversationId, "messages"));

  const batch = writeBatch(db);
  batch.set(messageRef, {
    senderUid: input.senderUid,
    recipientUid: input.recipientUid,
    content: trimmed,
    createdAt: serverTimestamp(),
    readAt: null,
  });
  batch.update(conversationRef, {
    lastMessage: trimmed,
    lastMessageAt: serverTimestamp(),
    lastMessageSenderUid: input.senderUid,
    updatedAt: serverTimestamp(),
    [`unreadCount.${input.recipientUid}`]: increment(1),
  });
  await batch.commit();

  // Fire-and-forget (mesmo racional de `notificationService.
  // createNotification`): a mensagem já foi entregue com sucesso no
  // Firestore no momento em que chegamos aqui; uma falha ao criar a
  // notificação nunca deve aparecer como "falha ao enviar mensagem"
  // para quem está digitando.
  createNotification({
    recipientUid: input.recipientUid,
    type: "message_received",
    title: "Nova mensagem",
    message: trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed,
    link: "/mensagens",
  });
}

/**
 * Zera o contador de não lidas do usuário logado ao abrir a conversa.
 * Separado de `markMessagesAsRead` (que marca cada MENSAGEM
 * individual) porque o contador do badge na lista de conversas não
 * precisa esperar o `writeBatch` de mensagens individuais — abrir a
 * conversa já deve "apagar" o badge imediatamente.
 */
export async function markConversationRead(conversationId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, "conversations", conversationId), {
    [`unreadCount.${uid}`]: 0,
  });
}

/**
 * Marca como lidas as mensagens ainda não lidas, destinadas ao
 * usuário logado, dentre as já carregadas na tela (nunca todas as
 * mensagens da escola/conversa — apenas o lote atual, ver
 * `MESSAGE_PAGE_SIZE`). Um único `writeBatch` (até `MESSAGE_PAGE_SIZE`
 * updates, bem abaixo do limite de 500 operações por batch do
 * Firestore).
 */
export async function markMessagesAsRead(
  conversationId: string,
  messages: Message[],
  uid: string
): Promise<void> {
  const unread = messages.filter((m) => m.recipientUid === uid && m.readAt === null);
  if (unread.length === 0) return;

  const batch = writeBatch(db);
  for (const message of unread) {
    batch.update(doc(db, "conversations", conversationId, "messages", message.id), {
      readAt: serverTimestamp(),
    });
  }
  await batch.commit();
}
