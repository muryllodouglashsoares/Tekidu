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
 */
export type AuditEventType = "grade_updated" | "assessment_deleted" | "attendance_updated";

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
