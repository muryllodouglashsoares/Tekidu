/**
 * Formato do documento em: auditLogs/{logId}
 *
 * Item 14 do plano de consolidação V8 ("Auditoria de alterações").
 * Nesta etapa a prioridade é PREPARAR A ESTRUTURA (não construir uma
 * tela completa de auditoria) para as três operações citadas
 * explicitamente no plano: alteração de nota, exclusão de avaliação e
 * alteração de frequência.
 *
 * `before`/`after` guardam apenas o campo que realmente muda em cada
 * tipo de evento (ex.: `score` para nota, `status` para frequência) —
 * não um snapshot do documento inteiro, para manter os registros
 * pequenos e fáceis de exibir depois ("Antes: 7,0 / Depois: 8,0").
 *
 * TAREFA 4 (Fase 1 pós-auditoria V8 — "Ampliar a cobertura do log de
 * auditoria"): estende a lista de eventos cobertos além das três
 * operações originais. Segue a MESMA convenção de nomenclatura já
 * usada (`<entidade>_<verbo no particípio>`):
 * - `academic_settings_updated`: alteração da régua de aprovação de um
 *   ano letivo (`academicSettingsService.saveAcademicSettings`).
 *   `before`/`after` guardam os três limiares juntos numa única
 *   string (não haveria como usar três pares before/after nesta
 *   estrutura sem estendê-la além do necessário para esta fase).
 * - `teacher_created`: cadastro de um novo professor
 *   (`userService.createTeacher`). Não há "antes" (documento não
 *   existia) — `before` fica `null`.
 * - `teacher_status_changed`: ativação/desativação de um professor
 *   (`userService.updateTeacherProfile`, quando `active` muda) — um
 *   único tipo para os dois sentidos (like `attendance_updated`),
 *   distinguido pelo texto em `before`/`after` ("Ativo"/"Inativo").
 * - `class_deleted`: exclusão de turma (`classService.deleteClass`).
 * - `discipline_deleted`: exclusão de disciplina
 *   (`disciplineService.deleteDiscipline`).
 */
export type AuditEventType =
  | "grade_updated"
  | "assessment_deleted"
  | "attendance_updated"
  | "academic_settings_updated"
  | "teacher_created"
  | "teacher_status_changed"
  | "class_deleted"
  | "discipline_deleted";

export interface AuditLog {
  id: string;
  type: AuditEventType;
  actorId: string;
  actorName: string;
  studentId: string | null;
  studentName: string | null;
  disciplineId: string | null;
  disciplineName: string | null;
  assessmentId: string | null;
  assessmentName: string | null;
  before: string | null;
  after: string | null;
  createdAt: unknown; // Firestore Timestamp
}

export interface AuditLogInput {
  type: AuditEventType;
  actorId: string;
  actorName: string;
  studentId?: string | null;
  studentName?: string | null;
  disciplineId?: string | null;
  disciplineName?: string | null;
  assessmentId?: string | null;
  assessmentName?: string | null;
  before?: string | null;
  after?: string | null;
}
