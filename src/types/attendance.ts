import type { AssessmentTerm } from "@/types/assessment";

/**
 * Presença de um aluno em uma aula específica.
 * Mantido como union simples (mesmo padrão de `ClassShift`/`DisciplineStatus`)
 * — se a instituição precisar de um terceiro estado ("Justificada"), este é
 * o único lugar a ajustar, além do rótulo em `ATTENDANCE_RECORD_LABEL`.
 */
export type AttendanceRecordStatus = "present" | "absent";

export const ATTENDANCE_RECORD_LABEL: Record<AttendanceRecordStatus, string> = {
  present: "Presente",
  absent: "Ausente",
};

/**
 * Situação de frequência do aluno, derivada do percentual de presença.
 * Os limiares abaixo são o padrão do sistema (a LDB nº 9.394/96 usa
 * 75% como frequência mínima oficial; 90% aqui marca a faixa
 * "Regular" mais estrita usada no protótipo do Figma), usado somente
 * quando a instituição ainda não configurou uma frequência mínima
 * própria para o ano letivo — ver `types/academicSettings.ts` (item 6
 * do plano de consolidação V8). `calculateAttendanceStatus` aceita um
 * limiar explícito; não hardcode estes valores em páginas/componentes.
 */
export type AttendanceStatus = "regular" | "attention" | "critical";

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  regular: "Regular",
  attention: "Atenção",
  critical: "Crítica",
};

export const ATTENDANCE_REGULAR_THRESHOLD = 90;
export const ATTENDANCE_ATTENTION_THRESHOLD = 75;

/**
 * Formato do documento em: attendanceSessions/{sessionId}
 *
 * Representa uma aula (uma data letiva) de uma disciplina lecionada em
 * uma turma, dentro de um bimestre — a mesma granularidade de
 * `Assessment` (ver `types/assessment.ts`), reaproveitando o modelo já
 * usado por Notas de "evento dentro de um contexto disciplina + turma +
 * bimestre" em vez de inventar uma estrutura paralela.
 *
 * `order` define a ordem de exibição (colunas "Por data", seleção de
 * aula) e a numeração do rótulo "Aula NN" — não depende de `date`, para
 * permitir lançar uma aula com data retroativa sem reordenar as demais.
 */
export interface AttendanceSession {
  id: string;
  disciplineId: string;
  classId: string;
  schoolYear: number;
  term: AssessmentTerm;
  date: string; // "yyyy-mm-dd"
  label: string; // "Aula 01", "Aula 02"...
  order: number;
  createdAt: unknown; // Firestore Timestamp
  updatedAt: unknown; // Firestore Timestamp
}

export interface AttendanceSessionInput {
  disciplineId: string;
  classId: string;
  schoolYear: number;
  term: AssessmentTerm;
  date: string;
  label: string;
  order: number;
}

/**
 * Formato do documento em: attendanceRecords/{recordId}
 *
 * Espelha `Grade` (ver `types/grade.ts`): denormaliza
 * disciplineId/classId/schoolYear/term do `AttendanceSession`
 * referenciado por `sessionId`, pelo mesmo motivo — consultar todos os
 * registros de um contexto (turma + disciplina + bimestre) com uma
 * única query, sem precisar buscar as aulas primeiro.
 */
export interface AttendanceRecord {
  id: string;
  studentId: string;
  sessionId: string;
  disciplineId: string;
  classId: string;
  schoolYear: number;
  term: AssessmentTerm;
  status: AttendanceRecordStatus;
  createdAt: unknown; // Firestore Timestamp
  updatedAt: unknown; // Firestore Timestamp
}

export interface AttendanceRecordInput {
  studentId: string;
  sessionId: string;
  disciplineId: string;
  classId: string;
  schoolYear: number;
  term: AssessmentTerm;
  status: AttendanceRecordStatus;
}

/** Estatísticas de frequência calculadas para um aluno em um contexto. */
export interface AttendanceSummary {
  studentId: string;
  present: number;
  absent: number;
  total: number;
  rate: number | null; // percentual 0–100 (1 casa decimal); null = sem registros
  status: AttendanceStatus | null;
}

/** Percentual de presença. `null` quando não há nenhum registro ainda. */
export function calculateAttendanceRate(present: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((present / total) * 1000) / 10;
}

/**
 * Situação derivada do percentual — ver nota sobre os limiares acima.
 * `minRate` é a frequência mínima configurada para o ano letivo (item
 * 6 do plano V8); quando omitido, cai para `ATTENDANCE_ATTENTION_THRESHOLD`.
 * O limiar "Regular" (faixa mais estrita, sem risco algum) continua
 * fixo em `ATTENDANCE_REGULAR_THRESHOLD` — só o piso de reprovação por
 * falta é configurável, pois é o único valor com significado
 * regulatório (LDB) que a instituição pode precisar ajustar.
 */
export function calculateAttendanceStatus(
  rate: number | null,
  minRate: number = ATTENDANCE_ATTENTION_THRESHOLD
): AttendanceStatus | null {
  if (rate === null) return null;
  if (rate >= ATTENDANCE_REGULAR_THRESHOLD) return "regular";
  if (rate >= minRate) return "attention";
  return "critical";
}

/** Resume os registros de um aluno em um contexto (todas as aulas já lançadas). */
export function summarizeAttendance(
  studentId: string,
  records: AttendanceRecord[],
  minRate?: number
): AttendanceSummary {
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const total = present + absent;
  const rate = calculateAttendanceRate(present, total);
  return { studentId, present, absent, total, rate, status: calculateAttendanceStatus(rate, minRate) };
}
