import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AuditLogInput } from "@/types/auditLog";

const auditCollection = collection(db, "auditLogs");

/**
 * Registra um evento de auditoria (item 14 do plano V8). Deliberadamente
 * "fire-and-forget": falhas ao gravar o log NUNCA devem impedir a ação
 * principal do usuário (salvar uma nota, excluir uma avaliação) de ser
 * concluída — por isso o erro é apenas logado no console, nunca
 * propagado para quem chamou. Auditoria é um registro complementar,
 * não um requisito bloqueante desta fase.
 */
export function logAuditEvent(input: AuditLogInput): void {
  addDoc(auditCollection, {
    type: input.type,
    actorId: input.actorId,
    actorName: input.actorName,
    studentId: input.studentId ?? null,
    studentName: input.studentName ?? null,
    disciplineId: input.disciplineId ?? null,
    disciplineName: input.disciplineName ?? null,
    assessmentId: input.assessmentId ?? null,
    assessmentName: input.assessmentName ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
    createdAt: serverTimestamp(),
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error("[AuditService] Falha ao registrar log de auditoria", input.type, error);
  });
}
