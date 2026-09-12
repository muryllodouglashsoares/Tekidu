/**
 * Formato do documento em: conversations/{conversationId}/messages/{messageId}
 *
 * Subcoleção de `conversations` (ver `types/conversation.ts`) — cada
 * mensagem pertence a exatamente uma conversa, nunca é lida/escrita
 * fora do contexto do `conversationId` do pai (ver `firestore.rules`:
 * a Rule de `messages` resolve o dono via `get()` do documento pai,
 * então uma consulta sem esse contexto — ex.: "todas as mensagens da
 * escola" — nunca é uma operação que este modelo suporta, por design).
 */
export interface Message {
  id: string;
  conversationId: string;
  senderUid: string;
  recipientUid: string;
  content: string;
  createdAt: unknown; // Firestore Timestamp
  /** `null` = ainda não lida pelo destinatário. */
  readAt: unknown | null;
}

/** Payload aceito por `chatService.sendMessage`. */
export interface MessageInput {
  senderUid: string;
  recipientUid: string;
  content: string;
}

/**
 * Limite de caracteres por mensagem (item "UX" do plano — "limite
 * razoável de caracteres"). Espelhado em `firestore.rules`
 * (`isValidMessageContent`) como as demais constantes de validação de
 * payload do projeto (ex.: GRADE_MIN/GRADE_MAX em `types/grade.ts`) —
 * se este valor mudar, a Rule precisa ser atualizada manualmente em
 * conjunto (mesma nota já registrada lá para nota/frequência).
 */
export const MESSAGE_MAX_LENGTH = 4000;
