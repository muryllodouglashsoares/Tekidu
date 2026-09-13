import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { prepareJustificationDocument } from "@/services/justifications/absenceJustificationDocumentService";
import { createNotification } from "@/services/notifications/notificationService";
import { JUSTIFICATION_WINDOW_DAYS, isValidJustificationReason } from "@/types/absenceJustification";
import type {
  AbsenceJustification,
  AbsenceJustificationStatus,
} from "@/types/absenceJustification";
import type { AttendanceRecord } from "@/types/attendance";

const justificationsCollection = collection(db, "absenceJustifications");

function toJustification(id: string, data: Record<string, unknown>): AbsenceJustification {
  return {
    id,
    studentId: (data.studentId as string) ?? "",
    attendanceRecordId: (data.attendanceRecordId as string) ?? id,
    sessionId: (data.sessionId as string) ?? "",
    disciplineId: (data.disciplineId as string) ?? "",
    classId: (data.classId as string) ?? "",
    schoolYear: (data.schoolYear as number) ?? new Date().getFullYear(),
    term: (data.term as AbsenceJustification["term"]) ?? "1",
    absenceDate: (data.absenceDate as string) ?? "",
    sessionLabel: (data.sessionLabel as string) ?? "",
    reason: (data.reason as string) ?? "",
    documentData: (data.documentData as string) ?? "",
    documentName: (data.documentName as string) ?? "",
    documentType: (data.documentType as AbsenceJustification["documentType"]) ?? "image",
    documentSize: (data.documentSize as number) ?? 0,
    status: (data.status as AbsenceJustificationStatus) ?? "pending",
    submittedAt: data.submittedAt,
    updatedAt: data.updatedAt,
    expiresAt: data.expiresAt,
    reviewedAt: data.reviewedAt,
    reviewedBy: (data.reviewedBy as string | null) ?? null,
    reviewedByName: (data.reviewedByName as string | null) ?? null,
    reviewComment: (data.reviewComment as string | null) ?? null,
  };
}

/**
 * ID determinístico do documento: o PRÓPRIO `attendanceRecordId` da
 * falta sendo justificada (mesmo racional de
 * `attendanceRecordService.buildAttendanceRecordId` — "1 falta = no
 * máximo 1 justificativa" garantido pela ESTRUTURA do banco, não só
 * por uma checagem em memória no cliente).
 *
 * ISSO É O QUE IMPEDE, ESTRUTURALMENTE (seção 4/11/12 do prompt):
 * - duas solicitações ativas para a mesma falta;
 * - reenvio depois de uma recusa (o documento já existe; a Security
 *   Rule só libera `create` quando o documento AINDA NÃO EXISTE —
 *   uma segunda tentativa de `setDoc` no mesmo caminho é avaliada
 *   como `update`, que a Rule reserva exclusivamente para a ANÁLISE
 *   do staff, nunca para o aluno).
 */
export function buildAbsenceJustificationId(attendanceRecordId: string): string {
  return attendanceRecordId;
}

/** Lista as justificativas do PRÓPRIO aluno — consulta de campo único, aceita pela Security Rule (`isOwnStudentRecord`). */
export async function getMyAbsenceJustifications(studentId: string): Promise<AbsenceJustification[]> {
  const q = query(justificationsCollection, where("studentId", "==", studentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toJustification(d.id, d.data()));
}

/** Justificativa (de qualquer status) já existente para uma falta específica do próprio aluno, ou `null`. */
export async function getAbsenceJustificationByAttendanceRecord(
  attendanceRecordId: string
): Promise<AbsenceJustification | null> {
  const snapshot = await getDoc(doc(db, "absenceJustifications", buildAbsenceJustificationId(attendanceRecordId)));
  if (!snapshot.exists()) return null;
  return toJustification(snapshot.id, snapshot.data());
}

export interface SubmitAbsenceJustificationParams {
  studentId: string;
  studentUid: string;
  /** Registro de presença (falta) sendo justificado — já lido pela tela, nunca buscado de novo aqui. */
  attendanceRecord: AttendanceRecord;
  reason: string;
  file: File;
}

/**
 * Orquestra o fluxo completo de envio (seção 11 do prompt, adaptado
 * ao armazenamento em Firestore — ver nota de arquitetura em
 * `types/absenceJustification.ts`): valida → prepara o documento
 * (compressão + base64, só no cliente, sem I/O de rede) → grava TUDO
 * em uma ÚNICA escrita no Firestore → notifica o aluno. Como não há
 * mais um upload prévio para um serviço externo, não existe o cenário
 * de "arquivo enviado, mas justificativa não gravada" — a escrita é
 * atômica por natureza (documento único), o que é mais simples e mais
 * seguro que o fluxo de duas etapas que o Storage exigiria.
 */
export async function submitAbsenceJustification({
  studentId,
  studentUid,
  attendanceRecord,
  reason,
  file,
}: SubmitAbsenceJustificationParams): Promise<AbsenceJustification> {
  if (attendanceRecord.status !== "absent") {
    throw new Error("Apenas faltas registradas podem ser justificadas.");
  }
  if (!isValidJustificationReason(reason)) {
    throw new Error("Informe um motivo com entre 10 e 1000 caracteres.");
  }

  const justificationId = buildAbsenceJustificationId(attendanceRecord.id);

  const existing = await getAbsenceJustificationByAttendanceRecord(attendanceRecord.id);
  if (existing) {
    throw new Error("Já existe uma solicitação de justificativa para esta falta.");
  }

  const document = await prepareJustificationDocument(file);

  // `expiresAt` = agora + JUSTIFICATION_WINDOW_DAYS dias — usado pela
  // Firestore TTL Policy (configuração externa, ver entrega) para
  // apagar automaticamente o registro (e o documento pesado embutido
  // nele) depois do prazo, e também tratado como "já expirado" no
  // próprio cliente antes disso (`isJustificationExpired`). Como a
  // janela para SOLICITAR (seção acima) já fecha `JUSTIFICATION_WINDOW_DAYS`
  // dias depois da FALTA, e este envio só pode acontecer dentro dessa
  // mesma janela, este `expiresAt` nunca fica "no passado" antes mesmo
  // de a janela de solicitação fechar.
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + JUSTIFICATION_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  );

  const payload = {
    studentId,
    attendanceRecordId: attendanceRecord.id,
    sessionId: attendanceRecord.sessionId,
    disciplineId: attendanceRecord.disciplineId,
    classId: attendanceRecord.classId,
    schoolYear: attendanceRecord.schoolYear,
    term: attendanceRecord.term,
    absenceDate: attendanceRecord.date ?? "",
    sessionLabel: attendanceRecord.label ?? "",
    reason: reason.trim(),
    documentData: document.documentData,
    documentName: document.documentName,
    documentType: document.documentType,
    documentSize: document.documentSize,
    status: "pending" as const,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt,
  };

  await setDoc(doc(db, "absenceJustifications", justificationId), payload);

  createNotification({
    recipientUid: studentUid,
    type: "absence_justification_submitted",
    title: "Justificativa enviada",
    message: "Sua justificativa de falta foi enviada e está aguardando análise.",
    link: "/justificativas",
  });

  const created = await getAbsenceJustificationByAttendanceRecord(attendanceRecord.id);
  return created ?? toJustification(justificationId, payload);
}

// ---------------------------------------------------------------------
// Análise (staff): admin vê tudo; professor só as SUAS disciplinas —
// mesmo padrão de "uma consulta por disciplina" já usado em
// `attendanceRecordService.getAttendanceRecordsByDisciplineIds`, que é
// o que permite a Security Rule (`isOwnDiscipline`) validar cada
// consulta sem precisar de uma regra ampla "professor lê tudo".
// ---------------------------------------------------------------------

/** Todas as justificativas do sistema, com filtro opcional de status — uso exclusivo de admin (ver `firestore.rules`). */
export async function getAllAbsenceJustifications(
  status?: AbsenceJustificationStatus
): Promise<AbsenceJustification[]> {
  const clauses = status ? [where("status", "==", status)] : [];
  const q = query(justificationsCollection, ...clauses);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toJustification(d.id, d.data()));
}

/** Justificativas das disciplinas informadas (professor: suas próprias `disciplineIds`), com filtro opcional de status. */
export async function getAbsenceJustificationsByDisciplineIds(
  disciplineIds: string[],
  status?: AbsenceJustificationStatus
): Promise<AbsenceJustification[]> {
  if (disciplineIds.length === 0) return [];
  const results = await Promise.all(
    disciplineIds.map(async (disciplineId) => {
      const clauses = [where("disciplineId", "==", disciplineId)];
      if (status) clauses.push(where("status", "==", status));
      const q = query(justificationsCollection, ...clauses);
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => toJustification(d.id, d.data()));
    })
  );
  return results.flat();
}

export interface ReviewAbsenceJustificationParams {
  justificationId: string;
  decision: Extract<AbsenceJustificationStatus, "approved" | "rejected">;
  reviewerUid: string;
  reviewerName: string;
  comment?: string;
  /** Aluno a notificar da decisão (`studentUid`, nunca `studentId` — ver `types/notification.ts`). */
  studentUid: string;
}

/**
 * Aprova ou recusa uma solicitação (seção 16 do prompt). NUNCA altera
 * `AttendanceRecord.status` (seção 20 — a falta original permanece
 * `absent` mesmo quando a justificativa é aprovada; é a PRÓPRIA
 * justificativa que passa a carregar `status: "approved"`, e é isso
 * que relatórios futuros devem consultar para distinguir "falta
 * justificada" de "falta comum").
 */
export async function reviewAbsenceJustification({
  justificationId,
  decision,
  reviewerUid,
  reviewerName,
  comment,
  studentUid,
}: ReviewAbsenceJustificationParams): Promise<void> {
  await updateDoc(doc(db, "absenceJustifications", justificationId), {
    status: decision,
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewerUid,
    reviewedByName: reviewerName,
    reviewComment: comment?.trim() || null,
    updatedAt: serverTimestamp(),
  });

  createNotification({
    recipientUid: studentUid,
    type: decision === "approved" ? "absence_justification_approved" : "absence_justification_rejected",
    title: decision === "approved" ? "Justificativa aprovada" : "Justificativa recusada",
    message:
      decision === "approved"
        ? "Sua justificativa de falta foi aprovada."
        : "Sua justificativa de falta foi recusada. Consulte os detalhes para mais informações.",
    link: "/justificativas",
  });
}
