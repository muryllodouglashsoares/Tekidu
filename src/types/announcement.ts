/**
 * Formato do documento em: announcements/{announcementId}
 *
 * Portal de Avisos: canal central de comunicação institucional
 * (admin) e acadêmica (teacher), consultado em leitura por todas as
 * roles. Diferente de `notifications` (evento individual, "algo
 * aconteceu com você"), um aviso é uma comunicação que permanece
 * disponível para consulta — ver `services/announcements/announcementService.ts`.
 *
 * AUTORIA: `createdBy` é o UID do usuário autenticado no momento da
 * criação (nunca escolhido pelo cliente em nome de outra pessoa — ver
 * `firestore.rules`). É o campo usado por toda a regra de permissão de
 * edição/exclusão de um professor sobre o PRÓPRIO aviso
 * (`announcement.createdBy === currentUser.uid`). `createdByName` e
 * `authorRole` são um snapshot do autor no momento da criação — mesmo
 * padrão de denormalização já usado em `Discipline.teacherName`.
 */
export type AnnouncementCategory =
  | "general"
  | "academic"
  | "administrative"
  | "event"
  | "urgent";

export type AnnouncementPriority = "normal" | "important" | "urgent";

export type AnnouncementAudience = "all" | "students" | "teachers";

export type AnnouncementAuthorRole = "admin" | "teacher";

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  general: "Geral",
  academic: "Acadêmico",
  administrative: "Administrativo",
  event: "Evento",
  urgent: "Urgente",
};

export const ANNOUNCEMENT_PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  normal: "Normal",
  important: "Importante",
  urgent: "Urgente",
};

export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: "Todos",
  students: "Alunos",
  teachers: "Professores",
};

/**
 * Peso numérico da prioridade, usado apenas para ORDENAÇÃO (fixados >
 * urgentes > importantes > recentes — ver seção 16 do briefing). Não é
 * persistido: é derivado de `priority` em tempo de leitura pelo
 * service, então nunca pode ficar dessincronizado do valor real.
 */
export const ANNOUNCEMENT_PRIORITY_WEIGHT: Record<AnnouncementPriority, number> = {
  normal: 1,
  important: 2,
  urgent: 3,
};

/**
 * Categorias que um professor pode utilizar ao publicar um aviso
 * (seção 14 do briefing: "Teacher = comunicação acadêmica"). Um
 * professor nunca vê "administrative"/"urgent" no formulário — essas
 * permanecem exclusivas do admin, responsável pela comunicação
 * institucional. A mesma restrição é reforçada em `firestore.rules`.
 */
export const TEACHER_ALLOWED_CATEGORIES: AnnouncementCategory[] = ["academic", "general", "event"];

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  published: boolean;
  pinned: boolean;
  createdBy: string;
  createdByName: string;
  authorRole: AnnouncementAuthorRole;
  createdAt: unknown; // Firestore Timestamp
  updatedAt: unknown; // Firestore Timestamp
  publishedAt: unknown | null; // Firestore Timestamp | null
  expiresAt: unknown | null; // Firestore Timestamp | null
}

/** Payload aceito pelo formulário de criação/edição de aviso. */
export interface AnnouncementInput {
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  pinned: boolean;
  /** Data (YYYY-MM-DD) opcional. `null` = sem expiração. */
  expiresAt: string | null;
}
