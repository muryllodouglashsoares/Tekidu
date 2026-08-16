import { calculateAverage } from "@/types/grade";
import { calculateAttendanceRate } from "@/types/attendance";
import { ALL_ASSESSMENT_TERMS } from "@/types/boletim";
import type { AssessmentTerm } from "@/types/assessment";
import type { Grade } from "@/types/grade";
import type { AttendanceRecord } from "@/types/attendance";
import type { Student } from "@/types/student";
import type { SchoolClass } from "@/types/schoolClass";

/**
 * Recorte progressivo do gráfico de Relatórios (item 10 do briefing):
 * TODOS → TURMA → DISCIPLINA → PERÍODO. Cada campo omitido significa
 * "sem filtro nesse nível".
 */
export interface ReportScope {
  classId?: string;
  disciplineId?: string;
  term?: AssessmentTerm;
}

function matchesGradeScope(grade: Grade, scope: ReportScope): boolean {
  if (scope.classId && grade.classId !== scope.classId) return false;
  if (scope.disciplineId && grade.disciplineId !== scope.disciplineId) return false;
  if (scope.term && grade.term !== scope.term) return false;
  return true;
}

function matchesRecordScope(record: AttendanceRecord, scope: ReportScope): boolean {
  if (scope.classId && record.classId !== scope.classId) return false;
  if (scope.disciplineId && record.disciplineId !== scope.disciplineId) return false;
  if (scope.term && record.term !== scope.term) return false;
  return true;
}

/** Um ponto do gráfico de linhas: média das notas lançadas naquele bimestre. */
export interface ReportSeriesPoint {
  term: AssessmentTerm;
  average: number | null;
}

/**
 * Série de médias por bimestre (item 9 do briefing), sempre com os 4
 * pontos do ano letivo — o filtro de `term` do escopo NÃO é aplicado
 * aqui (ele afeta os indicadores, não o eixo do gráfico); só
 * turma/disciplina restringem quais notas entram na média de cada
 * ponto.
 */
export function computeDevelopmentSeries(grades: Grade[], scope: Omit<ReportScope, "term">): ReportSeriesPoint[] {
  return ALL_ASSESSMENT_TERMS.map((term) => {
    const termGrades = grades.filter((g) => matchesGradeScope(g, { ...scope, term }));
    return { term, average: calculateAverage(termGrades.map((g) => g.score)) };
  });
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Evolução "vs período anterior" (item 12 do briefing): compara os dois
 * últimos bimestres com dados na série — respeitando o bimestre
 * selecionado no filtro, se houver.
 */
export function computeEvolution(series: ReportSeriesPoint[], selectedTerm?: AssessmentTerm): number | null {
  const withData = series.filter((p): p is { term: AssessmentTerm; average: number } => p.average !== null);
  if (withData.length < 2) return null;

  if (selectedTerm) {
    const idx = withData.findIndex((p) => p.term === selectedTerm);
    if (idx <= 0) return null;
    return round1(withData[idx].average - withData[idx - 1].average);
  }

  const last = withData[withData.length - 1];
  const secondLast = withData[withData.length - 2];
  return round1(last.average - secondLast.average);
}

/** Indicadores consolidados do topo da tela de Relatórios (itens 12 e 13). */
export interface ReportOverview {
  series: ReportSeriesPoint[];
  overallAverage: number | null;
  evolution: number | null;
  studentCount: number;
  averageAttendanceRate: number | null;
}

export function computeReportOverview(
  students: Student[],
  grades: Grade[],
  records: AttendanceRecord[],
  scope: ReportScope
): ReportOverview {
  const series = computeDevelopmentSeries(grades, scope);
  const evolution = computeEvolution(series, scope.term);

  const scopedGrades = grades.filter((g) => matchesGradeScope(g, scope));
  const overallAverage = calculateAverage(scopedGrades.map((g) => g.score));

  const scopedStudents = scope.classId ? students.filter((s) => s.classId === scope.classId) : students;

  const scopedRecords = records.filter((r) => matchesRecordScope(r, scope));
  const present = scopedRecords.filter((r) => r.status === "present").length;
  const averageAttendanceRate = calculateAttendanceRate(present, scopedRecords.length);

  return {
    series,
    overallAverage,
    evolution,
    studentCount: scopedStudents.length,
    averageAttendanceRate,
  };
}

/** Resumo de uma turma, exibido nos cards abaixo do gráfico (item 14). */
export interface ClassReportSummary {
  schoolClass: SchoolClass;
  studentCount: number;
  average: number | null;
  attendanceRate: number | null;
}

/**
 * Calcula o resumo de cada turma (média/frequência/qtd. de alunos),
 * já considerando o recorte de disciplina/período selecionado no topo
 * da tela — mas sempre para TODAS as turmas do ano letivo, já que essa
 * seção é o ponto de entrada do fluxo Turma → Alunos → Relatório
 * (item 15), independente da turma escolhida no filtro do gráfico.
 */
export function computeClassSummaries(
  classes: SchoolClass[],
  students: Student[],
  grades: Grade[],
  records: AttendanceRecord[],
  scope: Omit<ReportScope, "classId">
): ClassReportSummary[] {
  return classes.map((schoolClass) => {
    const classScope: ReportScope = { ...scope, classId: schoolClass.id };
    const studentCount = students.filter((s) => s.classId === schoolClass.id).length;

    const scopedGrades = grades.filter((g) => matchesGradeScope(g, classScope));
    const average = calculateAverage(scopedGrades.map((g) => g.score));

    const scopedRecords = records.filter((r) => matchesRecordScope(r, classScope));
    const present = scopedRecords.filter((r) => r.status === "present").length;
    const attendanceRate = calculateAttendanceRate(present, scopedRecords.length);

    return { schoolClass, studentCount, average, attendanceRate };
  });
}

/** Resumo por aluno, exibido na listagem "Turma → Alunos" (item 15). */
export interface StudentReportSummary {
  student: Student;
  average: number | null;
  attendanceRate: number | null;
}

export function computeStudentSummaries(
  students: Student[],
  grades: Grade[],
  records: AttendanceRecord[],
  classId: string
): StudentReportSummary[] {
  const classStudents = students.filter((s) => s.classId === classId);
  return classStudents.map((student) => {
    const studentGrades = grades.filter((g) => g.classId === classId && g.studentId === student.id);
    const average = calculateAverage(studentGrades.map((g) => g.score));

    const studentRecords = records.filter((r) => r.classId === classId && r.studentId === student.id);
    const present = studentRecords.filter((r) => r.status === "present").length;
    const attendanceRate = calculateAttendanceRate(present, studentRecords.length);

    return { student, average, attendanceRate };
  });
}
