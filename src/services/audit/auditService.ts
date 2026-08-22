import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AuditLog, AuditLogInput } from "@/types/auditLog";

const auditCollection = collection(db, "auditLogs");

function toAuditLog(id: string, data: Record<string, unknown>): AuditLog {
  return {
    id,
    type: (data.type as AuditLog["type"]) ?? "grade_updated",
    actorId: (data.actorId as string) ?? "",
    actorName: (data.actorName as string) ?? "",
    studentId: (data.studentId as string | null) ?? null,
    studentName: (data.studentName as string | null) ?? null,
    disciplineId: (data.disciplineId as string | null) ?? null,
    disciplineName: (data.disciplineName as string | null) ?? null,
    assessmentId: (data.assessmentId as string | null) ?? null,
    assessmentName: (data.assessmentName as string | null) ?? null,
    before: (data.before as string | null) ?? null,
    after: (data.after as string | null) ?? null,
    createdAt: data.createdAt,
  };
}

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

const HISTORY_LIMIT = 50;

/**
 * Histórico de eventos de auditoria relacionados a UM aluno (Fase 8 —
 * aba "Histórico" do Perfil 360°): alterações de nota, exclusão de
 * avaliação, alteração de frequência. Restrito a admin pela mesma
 * regra de leitura de `auditLogs` (ver `firestore.rules`) — a UI só
 * deve exibir esta aba para esse perfil, mas a proteção real está na
 * regra, não na tela.
 */
export async function getAuditLogsForStudent(studentId: string): Promise<AuditLog[]> {
  const q = query(
    auditCollection,
    where("studentId", "==", studentId),
    orderBy("createdAt", "desc"),
    limit(HISTORY_LIMIT)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toAuditLog(d.id, d.data()));
}
