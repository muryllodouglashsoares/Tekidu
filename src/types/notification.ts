/**
 * Formato do documento em: notifications/{notificationId}
 *
 * Fase 5 do plano de evolução ("Sistema de notificações"). Segue a
 * MESMA estrutura de decisão já usada em `types/auditLog.ts`: um tipo
 * enumerado curto, específico de cada evento, em vez de um campo de
 * texto livre — isso é o que permite à Command Palette/centro de
 * notificações decidir o ÍCONE e o LINK de destino sem precisar
 * interpretar texto.
 *
 * ESCOPO DESTA ETAPA: implementar a estrutura completa (tipo, service,
 * regras, índice, UI no Header com todos os estados) e ligá-la a um
 * subconjunto representativo de eventos reais — um por perfil citado
 * no prompt (aluno: nota lançada; professor: disciplina vinculada;
 * admin: novo usuário) — em vez de instrumentar TODAS as ações
 * possíveis do sistema de uma vez, o que arriscaria notificações
 * inconsistentes/duplicadas em fluxos ainda não revisados. Novos tipos
 * de evento podem ser adicionados a este union e a
 * `notificationService.createNotification` sem alterar a estrutura.
 */
export type NotificationType =
  | "grade_posted"
  | "discipline_assigned"
  | "teacher_created";

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  grade_posted: "Nota lançada",
  discipline_assigned: "Disciplina vinculada",
  teacher_created: "Novo usuário",
};

export interface Notification {
  id: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Caminho interno (ex.: "/notas") para navegar ao clicar. `null` = sem destino específico. */
  link: string | null;
  read: boolean;
  createdAt: unknown; // Firestore Timestamp
}

export interface NotificationInput {
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
}
