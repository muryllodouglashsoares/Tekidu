import { describe, expect, it } from "vitest";
import {
  buildReportsOverviewExcelSheets,
  buildReportsOverviewPdfData,
  buildReportsStudentListExcelSheets,
  buildReportsStudentListPdfData,
  buildStudentBoletimExcelSheets,
  type ReportsExportContext,
} from "@/services/exports/reportsExportService";
import type { ClassReportSummary, ReportOverview, StudentReportSummary } from "@/services/reports/reportsService";
import type { StudentBoletim } from "@/services/boletim/boletimService";
import type { SchoolClass } from "@/types/schoolClass";
import type { Student } from "@/types/student";
import type { Discipline } from "@/types/discipline";

const schoolClass: SchoolClass = {
  id: "class-1",
  name: "2º Ano A",
  grade: "2º ano",
  schoolYear: 2026,
  shift: "manha",
  status: "active",
  createdAt: null,
  updatedAt: null,
};

const discipline: Discipline = {
  id: "disc-1",
  name: "Informática",
  code: "INF",
  workload: 80,
  schoolYear: 2026,
  status: "active",
  teacherId: "teacher-1",
  teacherName: "Prof. Ana",
  classIds: [schoolClass.id],
  createdAt: null,
  updatedAt: null,
};

const student: Student = {
  id: "student-1",
  name: "João da Silva",
  email: "joao@example.com",
  registrationNumber: "2026001",
  classId: schoolClass.id,
  status: "active",
  average: null,
  uid: null,
  guardianUids: [],
  createdAt: null,
  updatedAt: null,
};

const overview: ReportOverview = {
  series: [],
  overallAverage: 8.5,
  evolution: 0.5,
  studentCount: 1,
  averageAttendanceRate: 92.5,
};

const emptyOverview: ReportOverview = {
  series: [],
  overallAverage: null,
  evolution: null,
  studentCount: 0,
  averageAttendanceRate: null,
};

const classSummary: ClassReportSummary = {
  schoolClass,
  studentCount: 1,
  average: 8.5,
  attendanceRate: 92.5,
};

const studentSummary: StudentReportSummary = {
  student,
  average: 8.5,
  attendanceRate: 92.5,
};

const ctx: ReportsExportContext = {
  yearFilter: "2026",
  className: schoolClass.name,
  disciplineName: discipline.name,
  term: "2",
};

describe("buildReportsOverviewPdfData", () => {
  it("reflete exatamente os filtros e os dados já calculados", () => {
    const data = buildReportsOverviewPdfData(overview, [classSummary], ctx, new Date());
    expect(data.meta).toEqual([
      { label: "Ano letivo", value: "2026" },
      { label: "Turma", value: "2º Ano A" },
      { label: "Disciplina", value: "Informática" },
      { label: "Bimestre", value: "2º Bimestre" },
    ]);
    expect(data.stats?.[0]).toEqual({ label: "Média global", value: "8,5" });
    expect(data.tables[0].rows).toEqual([["2º Ano A", "1", "8,5", "92,5%"]]);
  });

  it("usa a mensagem de tabela vazia quando não há turmas (relatório vazio)", () => {
    const data = buildReportsOverviewPdfData(emptyOverview, [], ctx, new Date());
    expect(data.tables[0].rows).toEqual([]);
    expect(data.tables[0].emptyMessage).toMatch(/nenhuma turma/i);
  });
});

describe("buildReportsOverviewExcelSheets", () => {
  it("gera as abas Resumo e Turmas com os valores numéricos preservados (não strings)", () => {
    const sheets = buildReportsOverviewExcelSheets(overview, [classSummary], ctx);
    expect(sheets.map((s) => s.name)).toEqual(["Resumo", "Turmas"]);
    const turmasSheet = sheets[1];
    const row = turmasSheet.rows[0] as ClassReportSummary;
    expect(turmasSheet.columns[2].value(row)).toBe(8.5);
    expect(turmasSheet.columns[3].value(row)).toBe(92.5);
  });
});

describe("buildReportsStudentListPdfData / ExcelSheets", () => {
  it("exporta a lista de alunos da turma selecionada", () => {
    const pdfData = buildReportsStudentListPdfData([studentSummary], ctx, new Date());
    expect(pdfData.tables[0].rows).toEqual([["João da Silva", "2026001", "8,5", "92,5%"]]);

    const sheets = buildReportsStudentListExcelSheets([studentSummary], ctx);
    expect(sheets.map((s) => s.name)).toEqual(["Resumo", "Alunos"]);
  });

  it("não inventa dados quando não há alunos na turma", () => {
    const pdfData = buildReportsStudentListPdfData([], ctx, new Date());
    expect(pdfData.tables[0].rows).toEqual([]);
  });
});

describe("buildStudentBoletimExcelSheets", () => {
  it("reaproveita o boletim já carregado, sem recalcular nada", () => {
    const boletim: StudentBoletim = {
      disciplines: [
        {
          discipline,
          average: 9,
          situation: "approved",
          attendanceRate: 95,
          attendanceStatus: "regular",
        },
      ],
      overallAverage: 9,
      overallAttendanceRate: 95,
      overallStatus: "regular",
    };

    const sheets = buildStudentBoletimExcelSheets(boletim, student.name, schoolClass.name, schoolClass.schoolYear);
    expect(sheets.map((s) => s.name)).toEqual(["Resumo", "Disciplinas"]);
    const disciplinasSheet = sheets[1];
    expect(disciplinasSheet.columns[0].value(boletim.disciplines[0])).toBe("Informática");
    expect(disciplinasSheet.columns[3].value(boletim.disciplines[0])).toBe("Aprovado");
  });
});
