import type { ExportSheet } from "@/services/exports/exportWorkbook";
import type { PdfMetaField, PdfStat, PdfTableSpec } from "@/components/pdf/GenericExportPDF";
import { formatExportNumber, formatExportPercentage } from "@/services/exports/exportFormat";
import type { ReportOverview, ClassReportSummary, StudentReportSummary } from "@/services/reports/reportsService";
import type { StudentBoletim } from "@/services/boletim/boletimService";
import { ACADEMIC_SITUATION_LABEL } from "@/types/grade";
import { ASSESSMENT_TERM_LABEL, type AssessmentTerm } from "@/types/assessment";

/** Contexto/filtros atuais da tela de Relatórios (item 10 do briefing), já resolvidos pela página. */
export interface ReportsExportContext {
  yearFilter: string;
  className?: string;
  disciplineName?: string;
  term?: AssessmentTerm | "";
}

function buildContextMeta(ctx: ReportsExportContext): PdfMetaField[] {
  const meta: PdfMetaField[] = [{ label: "Ano letivo", value: ctx.yearFilter || "—" }];
  meta.push({ label: "Turma", value: ctx.className ?? "Todas" });
  meta.push({ label: "Disciplina", value: ctx.disciplineName ?? "Todas" });
  meta.push({ label: "Bimestre", value: ctx.term ? ASSESSMENT_TERM_LABEL[ctx.term] : "Todos" });
  return meta;
}

function overviewStats(overview: ReportOverview): PdfStat[] {
  return [
    { label: "Média global", value: formatExportNumber(overview.overallAverage) },
    {
      label: "Evolução",
      value:
        overview.evolution === null
          ? "—"
          : `${overview.evolution > 0 ? "+" : ""}${formatExportNumber(overview.evolution)}`,
    },
    { label: "Alunos", value: String(overview.studentCount) },
    { label: "Frequência média", value: formatExportPercentage(overview.averageAttendanceRate) },
  ];
}

/** Exportação do nível "visão geral" (indicadores + turmas) — a tela padrão de Relatórios. */
export function buildReportsOverviewPdfData(
  overview: ReportOverview,
  classSummaries: ClassReportSummary[],
  ctx: ReportsExportContext,
  generatedAt: Date
) {
  const table: PdfTableSpec = {
    title: "Turmas",
    columns: [
      { label: "Turma", width: 40 },
      { label: "Alunos", width: 15, align: "center" },
      { label: "Média", width: 20, align: "center" },
      { label: "Frequência", width: 25, align: "center" },
    ],
    rows: classSummaries.map((s) => [
      s.schoolClass.name,
      String(s.studentCount),
      formatExportNumber(s.average),
      formatExportPercentage(s.attendanceRate),
    ]),
    emptyMessage: "Nenhuma turma cadastrada para o ano letivo selecionado.",
  };

  return {
    documentTitle: "Relatório de Desenvolvimento — Tekidu",
    headerTitle: "Relatório de Desenvolvimento",
    meta: buildContextMeta(ctx),
    stats: overviewStats(overview),
    tables: [table],
    generatedAt,
  };
}

export function buildReportsOverviewExcelSheets(
  overview: ReportOverview,
  classSummaries: ClassReportSummary[],
  ctx: ReportsExportContext
): ExportSheet[] {
  const resumo: ExportSheet<{ label: string; value: string }> = {
    name: "Resumo",
    columns: [
      { header: "Indicador", width: 28, value: (r) => r.label },
      { header: "Valor", width: 20, value: (r) => r.value },
    ],
    rows: [
      { label: "Ano letivo", value: ctx.yearFilter || "—" },
      { label: "Turma", value: ctx.className ?? "Todas" },
      { label: "Disciplina", value: ctx.disciplineName ?? "Todas" },
      { label: "Bimestre", value: ctx.term ? ASSESSMENT_TERM_LABEL[ctx.term] : "Todos" },
      { label: "Média global", value: formatExportNumber(overview.overallAverage) },
      { label: "Alunos", value: String(overview.studentCount) },
      { label: "Frequência média", value: formatExportPercentage(overview.averageAttendanceRate) },
    ],
  };

  const turmas: ExportSheet<ClassReportSummary> = {
    name: "Turmas",
    columns: [
      { header: "Turma", width: 28, value: (r) => r.schoolClass.name },
      { header: "Alunos", width: 12, value: (r) => r.studentCount },
      { header: "Média", width: 12, numFmt: "0.0", value: (r) => r.average },
      { header: "Frequência (%)", width: 16, numFmt: "0.0", value: (r) => r.attendanceRate },
    ],
    rows: classSummaries,
  };

  return [resumo, turmas];
}

/** Exportação do nível "Turma → Alunos" (lista de alunos de uma turma selecionada). */
export function buildReportsStudentListPdfData(
  summaries: StudentReportSummary[],
  ctx: ReportsExportContext,
  generatedAt: Date
) {
  const table: PdfTableSpec = {
    title: "Alunos",
    columns: [
      { label: "Aluno", width: 40 },
      { label: "Matrícula", width: 20 },
      { label: "Média", width: 20, align: "center" },
      { label: "Frequência", width: 20, align: "center" },
    ],
    rows: summaries.map((s) => [
      s.student.name,
      s.student.registrationNumber || "—",
      formatExportNumber(s.average),
      formatExportPercentage(s.attendanceRate),
    ]),
    emptyMessage: "Esta turma ainda não possui alunos cadastrados.",
  };

  return {
    documentTitle: "Relatório de Desenvolvimento — Tekidu",
    headerTitle: "Relatório de Desenvolvimento",
    meta: buildContextMeta(ctx),
    tables: [table],
    generatedAt,
  };
}

export function buildReportsStudentListExcelSheets(
  summaries: StudentReportSummary[],
  ctx: ReportsExportContext
): ExportSheet[] {
  const alunos: ExportSheet<StudentReportSummary> = {
    name: "Alunos",
    columns: [
      { header: "Aluno", width: 30, value: (r) => r.student.name },
      { header: "Matrícula", width: 16, value: (r) => r.student.registrationNumber || "—" },
      { header: "Média", width: 12, numFmt: "0.0", value: (r) => r.average },
      { header: "Frequência (%)", width: 16, numFmt: "0.0", value: (r) => r.attendanceRate },
    ],
    rows: summaries,
  };

  const resumo: ExportSheet<{ label: string; value: string }> = {
    name: "Resumo",
    columns: [
      { header: "Indicador", width: 28, value: (r) => r.label },
      { header: "Valor", width: 20, value: (r) => r.value },
    ],
    rows: [
      { label: "Ano letivo", value: ctx.yearFilter || "—" },
      { label: "Turma", value: ctx.className ?? "—" },
      { label: "Disciplina", value: ctx.disciplineName ?? "Todas" },
      { label: "Bimestre", value: ctx.term ? ASSESSMENT_TERM_LABEL[ctx.term] : "Todos" },
      { label: "Alunos", value: String(summaries.length) },
    ],
  };

  return [resumo, alunos];
}

/**
 * Exportação Excel do relatório individual do aluno (nível "Relatório
 * de Desenvolvimento" de um aluno específico). O PDF deste nível já é
 * coberto pela infraestrutura existente de boletim
 * (`BoletimPdfDownloadButton`/`BoletimPDF`) — reaproveitada tal como
 * está, sem duplicação — então aqui só é necessário o adaptador Excel,
 * a partir do MESMO `StudentBoletim` já carregado pela página.
 */
export function buildStudentBoletimExcelSheets(
  boletim: StudentBoletim,
  studentName: string,
  className: string | null,
  schoolYear: number
): ExportSheet[] {
  const resumo: ExportSheet<{ label: string; value: string }> = {
    name: "Resumo",
    columns: [
      { header: "Indicador", width: 24, value: (r) => r.label },
      { header: "Valor", width: 20, value: (r) => r.value },
    ],
    rows: [
      { label: "Aluno", value: studentName },
      { label: "Turma", value: className ?? "—" },
      { label: "Ano letivo", value: String(schoolYear) },
      { label: "Média geral", value: formatExportNumber(boletim.overallAverage) },
      { label: "Frequência geral", value: formatExportPercentage(boletim.overallAttendanceRate) },
    ],
  };

  const disciplinas: ExportSheet<StudentBoletim["disciplines"][number]> = {
    name: "Disciplinas",
    columns: [
      { header: "Disciplina", width: 26, value: (r) => r.discipline.name },
      { header: "Média", width: 12, numFmt: "0.0", value: (r) => r.average },
      { header: "Frequência (%)", width: 16, numFmt: "0.0", value: (r) => r.attendanceRate },
      { header: "Situação", width: 16, value: (r) => ACADEMIC_SITUATION_LABEL[r.situation] },
    ],
    rows: boletim.disciplines,
  };

  return [resumo, disciplinas];
}
