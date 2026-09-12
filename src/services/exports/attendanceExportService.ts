import type { ExportSheet } from "@/services/exports/exportWorkbook";
import type { PdfMetaField, PdfTableSpec } from "@/components/pdf/GenericExportPDF";
import { formatExportDateKey, formatExportPercentage } from "@/services/exports/exportFormat";
import { ATTENDANCE_STATUS_LABEL, type AttendanceRecord, type AttendanceSession, type AttendanceSummary } from "@/types/attendance";
import { ASSESSMENT_TERM_LABEL, type AssessmentTerm } from "@/types/assessment";
import type { Student } from "@/types/student";
import type { AttendanceHistoryRow } from "@/components/attendance/AttendanceHistoryTable";

export interface AttendanceExportContext {
  yearFilter: string;
  className: string;
  disciplineName: string;
  term: AssessmentTerm | "";
}

function buildContextMeta(ctx: AttendanceExportContext): PdfMetaField[] {
  return [
    { label: "Ano letivo", value: ctx.yearFilter || "—" },
    { label: "Turma", value: ctx.className || "—" },
    { label: "Disciplina", value: ctx.disciplineName || "—" },
    { label: "Bimestre", value: ctx.term ? ASSESSMENT_TERM_LABEL[ctx.term] : "—" },
  ];
}

function statusLabel(summary: AttendanceSummary | undefined): string {
  return summary?.status ? ATTENDANCE_STATUS_LABEL[summary.status] : "—";
}

/**
 * Exportação da aba "Registro de presença" (item 20 do briefing):
 * resumo por aluno (presenças/faltas/frequência/situação) e, quando há
 * aulas registradas, a grade "por data" (aluno x aula) — os mesmos
 * dados exibidos nas visões "Resumo"/"Por data" da tela.
 */
export function buildAttendanceRegisterPdfData(
  students: Student[],
  summaryByStudent: Record<string, AttendanceSummary>,
  sessions: AttendanceSession[],
  recordsByStudentAndSession: Record<string, Record<string, AttendanceRecord | undefined>>,
  ctx: AttendanceExportContext,
  generatedAt: Date
) {
  const summaryTable: PdfTableSpec = {
    title: "Resumo por aluno",
    columns: [
      { label: "Aluno", width: 34 },
      { label: "Presenças", width: 16, align: "center" },
      { label: "Faltas", width: 16, align: "center" },
      { label: "Frequência", width: 17, align: "center" },
      { label: "Situação", width: 17, align: "center" },
    ],
    rows: students.map((student) => {
      const summary = summaryByStudent[student.id];
      return [
        student.name,
        String(summary?.present ?? 0),
        String(summary?.absent ?? 0),
        formatExportPercentage(summary?.rate ?? null),
        statusLabel(summary),
      ];
    }),
    emptyMessage: "Nenhum aluno vinculado a esta turma.",
  };

  const tables: PdfTableSpec[] = [summaryTable];

  if (sessions.length > 0) {
    const orderedSessions = [...sessions].sort((a, b) => a.order - b.order);
    const sessionColumnWidth = Math.min(9, 72 / orderedSessions.length);
    const byDateTable: PdfTableSpec = {
      title: "Registros por data",
      columns: [
        { label: "Aluno", width: 28 },
        ...orderedSessions.map((session) => ({
          label: session.label,
          width: sessionColumnWidth,
          align: "center" as const,
        })),
      ],
      rows: students.map((student) => [
        student.name,
        ...orderedSessions.map((session) => {
          const status = recordsByStudentAndSession[student.id]?.[session.id]?.status;
          return status === "present" ? "P" : status === "absent" ? "F" : "—";
        }),
      ]),
      emptyMessage: "Nenhum aluno vinculado a esta turma.",
    };
    tables.push(byDateTable);
  }

  return {
    documentTitle: "Relatório de Frequência — Tekidu",
    headerTitle: "Relatório de Frequência",
    meta: buildContextMeta(ctx),
    tables,
    generatedAt,
  };
}

export function buildAttendanceRegisterExcelSheets(
  students: Student[],
  summaryByStudent: Record<string, AttendanceSummary>,
  sessions: AttendanceSession[],
  recordsByStudentAndSession: Record<string, Record<string, AttendanceRecord | undefined>>,
  ctx: AttendanceExportContext
): ExportSheet[] {
  interface SummaryRow {
    student: Student;
    summary: AttendanceSummary | undefined;
  }
  const summaryRows: SummaryRow[] = students.map((student) => ({ student, summary: summaryByStudent[student.id] }));

  const resumo: ExportSheet<SummaryRow> = {
    name: "Resumo",
    columns: [
      { header: "Aluno", width: 30, value: (r) => r.student.name },
      { header: "Presenças", width: 12, value: (r) => r.summary?.present ?? 0 },
      { header: "Faltas", width: 12, value: (r) => r.summary?.absent ?? 0 },
      { header: "Frequência (%)", width: 16, numFmt: "0.0", value: (r) => r.summary?.rate ?? null },
      { header: "Situação", width: 16, value: (r) => statusLabel(r.summary) },
    ],
    rows: summaryRows,
  };

  const sheets: ExportSheet[] = [resumo];

  if (sessions.length > 0) {
    const orderedSessions = [...sessions].sort((a, b) => a.order - b.order);
    interface RegistroRow {
      session: AttendanceSession;
      student: Student;
    }
    const rows: RegistroRow[] = [];
    for (const session of orderedSessions) {
      for (const student of students) {
        rows.push({ session, student });
      }
    }
    const registros: ExportSheet<RegistroRow> = {
      name: "Registros",
      columns: [
        { header: "Data", width: 14, value: (r) => formatExportDateKey(r.session.date) },
        { header: "Aula", width: 14, value: (r) => r.session.label },
        { header: "Aluno", width: 30, value: (r) => r.student.name },
        {
          header: "Status",
          width: 14,
          value: (r) => {
            const status = recordsByStudentAndSession[r.student.id]?.[r.session.id]?.status;
            return status === "present" ? "Presente" : status === "absent" ? "Ausente" : "—";
          },
        },
      ],
      rows,
    };
    sheets.push(registros);
  }

  const contextSheet: ExportSheet<{ label: string; value: string }> = {
    name: "Filtros",
    columns: [
      { header: "Filtro", width: 20, value: (r) => r.label },
      { header: "Valor", width: 24, value: (r) => r.value },
    ],
    rows: [
      { label: "Ano letivo", value: ctx.yearFilter || "—" },
      { label: "Turma", value: ctx.className || "—" },
      { label: "Disciplina", value: ctx.disciplineName || "—" },
      { label: "Bimestre", value: ctx.term ? ASSESSMENT_TERM_LABEL[ctx.term] : "—" },
    ],
  };
  sheets.push(contextSheet);

  return sheets;
}

/** Exportação da aba "Histórico" (item 20/24 do briefing): uma linha por aula, com o filtro de turma/disciplina já aplicado. */
export function buildAttendanceHistoryPdfData(
  rows: AttendanceHistoryRow[],
  classFilterName: string,
  disciplineFilterName: string,
  generatedAt: Date
) {
  const table: PdfTableSpec = {
    title: "Histórico de aulas",
    columns: [
      { label: "Data", width: 14 },
      { label: "Aula", width: 14 },
      { label: "Turma", width: 20 },
      { label: "Disciplina", width: 20 },
      { label: "Presentes", width: 11, align: "center" },
      { label: "Ausentes", width: 10, align: "center" },
      { label: "Freq.", width: 11, align: "center" },
    ],
    rows: rows.map((r) => [
      formatExportDateKey(r.session.date),
      r.session.label,
      r.className,
      r.disciplineName,
      String(r.present),
      String(r.absent),
      formatExportPercentage(r.rate),
    ]),
    emptyMessage: "Nenhuma aula registrada ainda.",
  };

  return {
    documentTitle: "Histórico de Frequência — Tekidu",
    headerTitle: "Histórico de Frequência",
    meta: [
      { label: "Turma", value: classFilterName },
      { label: "Disciplina", value: disciplineFilterName },
    ] as PdfMetaField[],
    tables: [table],
    generatedAt,
  };
}

export function buildAttendanceHistoryExcelSheets(
  rows: AttendanceHistoryRow[],
  classFilterName: string,
  disciplineFilterName: string
): ExportSheet[] {
  const historico: ExportSheet<AttendanceHistoryRow> = {
    name: "Histórico",
    columns: [
      { header: "Data", width: 14, value: (r) => formatExportDateKey(r.session.date) },
      { header: "Aula", width: 14, value: (r) => r.session.label },
      { header: "Turma", width: 22, value: (r) => r.className },
      { header: "Disciplina", width: 22, value: (r) => r.disciplineName },
      { header: "Presentes", width: 12, value: (r) => r.present },
      { header: "Ausentes", width: 12, value: (r) => r.absent },
      { header: "Frequência (%)", width: 16, numFmt: "0.0", value: (r) => r.rate },
    ],
    rows,
  };

  const filtros: ExportSheet<{ label: string; value: string }> = {
    name: "Filtros",
    columns: [
      { header: "Filtro", width: 20, value: (r) => r.label },
      { header: "Valor", width: 24, value: (r) => r.value },
    ],
    rows: [
      { label: "Turma", value: classFilterName },
      { label: "Disciplina", value: disciplineFilterName },
      { label: "Total de aulas", value: String(rows.length) },
    ],
  };

  return [historico, filtros];
}
