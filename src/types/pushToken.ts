/**
 * Formato do documento em: users/{uid}/pushTokens/{tokenId}
 *
 * IMPLEMENTAÇÃO — WEB PUSH (ver ETAPA 5/6 do prompt de Push).
 *
 * Por que subcoleção de `users/{uid}` e não uma coleção plana
 * `pushTokens/{tokenId}` com `uid` como campo: o mesmo padrão de
 * "isolamento por dono" já usado no resto do projeto (ex.: os
 * subrecursos de `students`), e permite regras do Firestore simples
 * (`users/{userId}/pushTokens/{tokenId}` herda `userId` do próprio
 * caminho, sem precisar comparar um campo `uid` dentro do documento).
 *
 * `tokenId` é o próprio token FCM (sanitizado/hash não é necessário —
 * o token em si não é secreto, ele só permite RECEBER push, nunca
 * enviar; quem envia precisa do server-side com a Service Account).
 * Usar o token como ID do documento é o que garante idempotência:
 * registrar o mesmo token duas vezes (ex.: reload da página)
 * atualiza o mesmo documento em vez de criar duplicata (ETAPA 17).
 */
export type PushTokenStatus = "active" | "invalid";

export interface PushToken {
  id: string;
  /** Redundante com o caminho (`users/{uid}/pushTokens`), mas mantido no documento para as Firestore Rules e para o backend (que lê via Admin/REST, sem navegar a árvore). */
  uid: string;
  token: string;
  platform: string;
  status: PushTokenStatus;
  createdAt: unknown; // Firestore Timestamp
  updatedAt: unknown; // Firestore Timestamp
  lastUsedAt: unknown; // Firestore Timestamp
}

/** Estado exposto pela UI (ETAPA 15 do prompt). */
export type PushPermissionState =
  | "unsupported"
  | "default"
  | "denied"
  | "enabled"
  | "disabled";
