import type { AssessmentTerm } from "@/types/assessment";
import type { AttendanceRecord } from "@/types/attendance";

/**
 * Situação de uma solicitação de justificativa de falta.
 * `pending` é sempre o estado inicial (ver `absenceJustificationService.
 * createAbsenceJustification`) — nunca criado diretamente como
 * `approved`/`rejected` pelo cliente (a Security Rule também nega
 * isso, ver `firestore.rules`).
 */
export type AbsenceJustificationStatus = "pending" | "approved" | "rejected";

export const ABSENCE_JUSTIFICATION_STATUS_LABEL: Record<AbsenceJustificationStatus, string> = {
  pending: "Em análise",
  approved: "Aprovada",
  rejected: "Recusada",
};

/** Tipo do documento comprobatório anexado — decide o ícone/preview exibido. */
export type AbsenceJustificationDocumentType = "image" | "pdf";

/**
 * Formatos aceitos para o documento comprobatório (seção 9 do prompt).
 * Reaproveitado pela validação de frontend
 * (`AbsenceJustificationDocumentUpload`/`absenceJustificationDocumentService`)
 * e pela Security Rule (`firestore.rules`, que precisa repetir esta
 * lista — Rules não importam TypeScript).
 */
export const ACCEPTED_DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type AcceptedDocumentMimeType = (typeof ACCEPTED_DOCUMENT_MIME_TYPES)[number];

/**
 * MUDANÇA DE ARQUITETURA (plano Spark/gratuito do Firebase):
 *
 * O Firebase Cloud Storage passou a exigir o plano Blaze (pay-as-you-go)
 * mesmo para uso dentro da cota gratuita — não é mais possível usá-lo
 * no plano Spark (100% gratuito, sem possibilidade de cobrança), que é
 * o plano deste projeto. O Cloud Firestore, por outro lado, continua
 * disponível integralmente no Spark. Por isso o documento comprobatório
 * passou a ser armazenado EMBUTIDO no próprio documento Firestore
 * (campo `documentData`, uma data URI em base64 — ver
 * `AbsenceJustification` abaixo), em vez de um arquivo no Storage.
 *
 * Isso implica um limite bem mais baixo que os 10 MB do prompt
 * original: cada documento do Firestore tem um teto RÍGIDO de 1 MiB
 * (1.048.576 bytes), e a codificação base64 infla o arquivo original
 * em ~33% (4/3). `MAX_DOCUMENT_SIZE_BYTES` abaixo é o tamanho do
 * ARQUIVO ORIGINAL (antes de codificar); o campo `documentData` já
 * codificado ocupa `MAX_DOCUMENT_DATA_FIELD_BYTES` (ver mais abaixo),
 * deixando folga de sobra para os demais campos do documento (motivo,
 * datas, ids) dentro do limite de 1 MiB.
 *
 * Para compensar o limite menor em fotos (o caso mais comum de
 * documento comprobatório), `absenceJustificationDocumentService.
 * prepareJustificationDocument` comprime automaticamente imagens que
 * excedam este tamanho antes do envio. PDFs não têm compressão
 * disponível no navegador sem uma biblioteca pesada — para PDFs o
 * limite é rígido (ver mensagem de erro em `validateJustificationDocument`).
 */
export const MAX_DOCUMENT_SIZE_BYTES = 650 * 1024;

/**
 * Tamanho máximo esperado do campo `documentData` já codificado em
 * base64 (arquivo de `MAX_DOCUMENT_SIZE_BYTES` codificado, arredondado
 * para cima em blocos de 3 bytes → 4 caracteres). Usado só como
 * referência/documentação — a Security Rule (`firestore.rules`)
 * repete este número (Rules não importam TypeScript), com uma margem
 * extra para não rejeitar por arredondamento.
 */
export const MAX_DOCUMENT_DATA_FIELD_BYTES = Math.ceil(MAX_DOCUMENT_SIZE_BYTES / 3) * 4;

export function isAcceptedDocumentMimeType(mimeType: string): mimeType is AcceptedDocumentMimeType {
  return (ACCEPTED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function documentTypeFromMimeType(mimeType: string): AbsenceJustificationDocumentType {
  return mimeType === "application/pdf" ? "pdf" : "image";
}

/**
 * Formato do documento em: absenceJustifications/{attendanceRecordId}
 *
 * Complementar à falta original (`AttendanceRecord`), nunca a
 * substitui: `attendanceRecordId`/`sessionId` apontam para o registro
 * de presença sendo justificado, e sua aprovação NUNCA altera
 * `AttendanceRecord.status` (ver seção 20 do prompt) — só marca esta
 * solicitação como `approved`, preservando o histórico de que a falta
 * ocorreu. `studentId`/`disciplineId`/`classId`/`schoolYear`/`term`
 * são desnormalizados do `AttendanceRecord` de origem, mesmo padrão já
 * usado em todo o módulo de frequência/notas (evita joins extras para
 * listar/filtrar).
 */
export interface AbsenceJustification {
  id: string;

  studentId: string;
  attendanceRecordId: string;
  sessionId: string;

  disciplineId: string;
  classId: string;
  schoolYear: number;
  term: AssessmentTerm;

  /** Data ("yyyy-mm-dd") da aula, denormalizada de `AttendanceRecord.date`. */
  absenceDate: string;
  /** Rótulo da aula ("Aula 03"), denormalizado de `AttendanceRecord.label`. */
  sessionLabel: string;

  reason: string;

  /**
   * Data URI do documento comprobatório (`data:<mime>;base64,<...>`),
   * embutida diretamente no documento Firestore — ver nota de
   * arquitetura em `MAX_DOCUMENT_SIZE_BYTES` acima. Usada tanto para
   * exibir/baixar o documento (`<a href={documentData} download>`)
   * quanto como fonte da verdade do conteúdo enviado.
   */
  documentData: string;
  documentName: string;
  documentType: AbsenceJustificationDocumentType;
  /** Tamanho do arquivo ORIGINAL em bytes (após eventual compressão de imagem, antes da codificação base64) — só informativo/exibição. */
  documentSize: number;

  status: AbsenceJustificationStatus;

  submittedAt: unknown; // Firestore Timestamp
  updatedAt: unknown; // Firestore Timestamp
  /**
   * Timestamp de expiração usado pela Firestore TTL Policy (ver
   * `JUSTIFICATION_WINDOW_DAYS`) — quando passa, o registro inteiro
   * (incluindo o documento em base64) é apagado automaticamente para
   * não pesar o banco. Definido na criação, nunca alterado depois.
   */
  expiresAt?: unknown; // Firestore Timestamp

  reviewedAt?: unknown; // Firestore Timestamp
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewComment?: string | null;
}

/** Payload aceito por `createAbsenceJustification` — nunca inclui `status`/campos de revisão. */
export interface AbsenceJustificationInput {
  studentId: string;
  attendanceRecordId: string;
  sessionId: string;
  disciplineId: string;
  classId: string;
  schoolYear: number;
  term: AssessmentTerm;
  absenceDate: string;
  sessionLabel: string;
  reason: string;
  documentData: string;
  documentName: string;
  documentType: AbsenceJustificationDocumentType;
  documentSize: number;
}

export const JUSTIFICATION_REASON_MIN_LENGTH = 10;
export const JUSTIFICATION_REASON_MAX_LENGTH = 1000;

export function isValidJustificationReason(reason: string): boolean {
  const trimmed = reason.trim();
  return trimmed.length >= JUSTIFICATION_REASON_MIN_LENGTH && trimmed.length <= JUSTIFICATION_REASON_MAX_LENGTH;
}

/**
 * PRAZO DE 2 DIAS (retenção/peso no banco).
 *
 * Dois usos distintos do mesmo prazo, propositalmente derivados desta
 * ÚNICA constante:
 *
 * 1. Janela para SOLICITAR: o aluno só pode pedir justificativa até
 *    `JUSTIFICATION_WINDOW_DAYS` dias depois da própria falta
 *    (`isWithinJustificationWindow`, usada por `isEligibleForJustification`)
 *    — faltas mais antigas somem da lista de elegíveis.
 * 2. Prazo de vida do REGISTRO já enviado: toda solicitação recebe um
 *    `expiresAt` = envio + `JUSTIFICATION_WINDOW_DAYS` dias (ver
 *    `absenceJustificationService.submitAbsenceJustification`). Uma
 *    Firestore TTL Policy sobre o campo `expiresAt` (configuração
 *    externa no Console/gcloud — não faz parte do código, ver entrega)
 *    apaga o documento inteiro automaticamente quando esse prazo
 *    passa, liberando o espaço ocupado pelo documento comprobatório
 *    em base64 (a parte pesada do registro). Como a TTL do Firestore é
 *    "best effort" (pode levar até ~24h a mais para rodar de fato) e
 *    depende de uma configuração externa, `isJustificationExpired`
 *    trata como expirado no PRÓPRIO CLIENTE assim que `expiresAt`
 *    passa — a funcionalidade fica correta mesmo antes/sem a TTL
 *    física ter rodado; a TTL só recupera o espaço em disco depois.
 *
 * Como o prazo de solicitação (1) sempre fecha antes ou junto do
 * prazo de vida do registro (2) — ver conta no comentário de
 * `submitAbsenceJustification` — não existe brecha para reenviar uma
 * justificativa "reaproveitando" o ID liberado pela limpeza automática
 * de um registro antigo da mesma falta.
 */
export const JUSTIFICATION_WINDOW_DAYS = 2;

/** Início do dia (00:00) de uma data "yyyy-mm-dd", no fuso local — evita comparações sensíveis a hora do dia. */
function startOfDay(isoDate: string): Date | null {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

/**
 * `true` enquanto ainda está dentro da janela de `JUSTIFICATION_WINDOW_DAYS`
 * dias corridos contados a partir do dia da falta (o próprio dia da
 * falta conta como dia 0) — ex.: falta em 10/08, prazo `2`, o aluno
 * pode solicitar até o fim do dia 12/08.
 */
export function isWithinJustificationWindow(absenceDate: string, now: Date = new Date()): boolean {
  const day0 = startOfDay(absenceDate);
  if (!day0) return false;
  const deadlineExclusive = new Date(day0);
  deadlineExclusive.setDate(deadlineExclusive.getDate() + JUSTIFICATION_WINDOW_DAYS + 1);
  return now < deadlineExclusive;
}

/** Última data (yyyy-mm-dd) em que ainda é possível solicitar justificativa para uma falta — só para exibição na UI. */
export function justificationDeadlineDate(absenceDate: string): string {
  const day0 = startOfDay(absenceDate);
  if (!day0) return absenceDate;
  const deadline = new Date(day0);
  deadline.setDate(deadline.getDate() + JUSTIFICATION_WINDOW_DAYS);
  const y = deadline.getFullYear();
  const m = String(deadline.getMonth() + 1).padStart(2, "0");
  const d = String(deadline.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Converte o `expiresAt` (Firestore Timestamp) de uma justificativa para `Date`, tolerando o campo ausente em registros sem prazo definido ainda. */
function expiresAtToDate(expiresAt: unknown): Date | null {
  if (!expiresAt) return null;
  if (expiresAt instanceof Date) return expiresAt;
  if (typeof expiresAt === "object" && expiresAt !== null && "toDate" in expiresAt) {
    return (expiresAt as { toDate: () => Date }).toDate();
  }
  return null;
}

/**
 * `true` quando o prazo de retenção do registro (`expiresAt`) já
 * passou — tratado como "já apagado" na interface mesmo que a
 * Firestore TTL Policy ainda não tenha fisicamente removido o
 * documento (ver nota em `JUSTIFICATION_WINDOW_DAYS`).
 */
export function isJustificationExpired(
  justification: Pick<AbsenceJustification, "submittedAt" | "reviewedAt"> & { expiresAt?: unknown },
  now: Date = new Date()
): boolean {
  const expiresAt = expiresAtToDate(justification.expiresAt);
  if (!expiresAt) return false;
  return now >= expiresAt;
}

/**
 * Um `AttendanceRecord` é elegível para justificativa quando: é uma
 * falta (`status === "absent"`), ainda está dentro do prazo de
 * `JUSTIFICATION_WINDOW_DAYS` dias para solicitar (ver
 * `isWithinJustificationWindow`), e não existe nenhuma justificativa
 * ativa (pendente OU aprovada) já criada para ele — ver seção 4 do
 * prompt ("não permitir múltiplas solicitações ativas para a mesma
 * falta" / "não permitir nova solicitação para uma falta já aprovada").
 * Uma justificativa `rejected` NÃO bloqueia reenvio nesta primeira
 * versão só quando `allowResubmitAfterRejection` for true — mantido
 * `false` por padrão (seção 12: "solicitação recusada não pode ser
 * reenviada pelo aluno sem uma ação administrativa explícita").
 */
export function isEligibleForJustification(
  absenceDate: string,
  existingStatus: AbsenceJustificationStatus | undefined,
  allowResubmitAfterRejection = false,
  now: Date = new Date()
): boolean {
  if (!isWithinJustificationWindow(absenceDate, now)) return false;
  if (!existingStatus) return true;
  if (existingStatus === "rejected") return allowResubmitAfterRejection;
  return false;
}

/**
 * Cruza os registros de presença do aluno (só interessam os
 * `status === "absent"`) com as justificativas já existentes,
 * separando as faltas que ainda podem ser justificadas das que já
 * possuem uma solicitação (qualquer status). Pura e sem I/O — a
 * página/hook busca os dois arrays via `attendanceRecordService`/
 * `absenceJustificationService` e só então chama esta função.
 */
export interface AbsenceJustificationOverview {
  /** Faltas sem nenhuma justificativa ativa — elegíveis para "Solicitar justificativa". */
  eligibleRecords: AttendanceRecord[];
  /** Todas as solicitações do aluno, mais recentes primeiro. */
  justifications: AbsenceJustification[];
}

export function buildAbsenceJustificationOverview(
  absentRecords: AttendanceRecord[],
  justifications: AbsenceJustification[],
  now: Date = new Date()
): AbsenceJustificationOverview {
  // Registros cujo prazo de retenção já passou (ver `JUSTIFICATION_WINDOW_DAYS`)
  // são tratados como já removidos, mesmo que a Firestore TTL Policy
  // ainda não os tenha apagado fisicamente — nunca aparecem na
  // interface do aluno.
  const activeJustifications = justifications.filter((j) => !isJustificationExpired(j, now));

  const justificationByRecordId = new Map(activeJustifications.map((j) => [j.attendanceRecordId, j]));

  const eligibleRecords = absentRecords.filter((record) =>
    isEligibleForJustification(record.date ?? "", justificationByRecordId.get(record.id)?.status, false, now)
  );

  const sortedJustifications = [...activeJustifications].sort((a, b) =>
    b.absenceDate.localeCompare(a.absenceDate)
  );

  return { eligibleRecords, justifications: sortedJustifications };
}
