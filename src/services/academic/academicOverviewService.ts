import { getStudents } from "@/services/students/studentService";
import { getClasses } from "@/services/classes/classService";
import { getDisciplines } from "@/services/disciplines/disciplineService";
import { getAssessmentsBySchoolYear } from "@/services/assessments/assessmentService";
import { getAllSessions } from "@/services/attendanceSessions/attendanceSessionService";
import { getGradesBySchoolYear } from "@/services/grades/gradeService";
import { getAttendanceRecordsBySchoolYear } from "@/services/attendance/attendanceRecordService";
import { getAcademicSettings } from "@/services/academicSettings/academicSettingsService";
import { calculateAverage, deriveSituationFromAverage, type AcademicSituation } from "@/types/grade";
import { calculateAttendanceRate } from "@/types/attendance";
import type { Student } from "@/types/student";
import type { SchoolClass } from "@/types/schoolClass";
import type { Discipline } from "@/types/discipline";

/**
 * Item 1 + 11 + 12 do plano de consolidação V8 ("fonte única de
 * verdade acadêmica" + "Dashboard como central de ação" + "sistema de
 * alertas acadêmicos").
 *
 * ANTES desta função, o Dashboard lia `student.average`/`student.status`
 * — campos digitados manualmente no cadastro do aluno
 * (`StudentFormModal`), sem nenhuma relação com as notas realmente
 * lançadas em `grades`. Isso violava diretamente o princípio central
 * do plano ("o Dashboard não deve possuir uma média independente").
 *
 * `getAcademicOverview` é a ÚNICA função que calcula a média/situação
 * consolidada de um aluno para fins de visão geral — reaproveitando as
 * MESMAS funções centrais usadas por Boletim e Relatórios
 * (`calculateAverage`, `deriveSituationFromAverage`,
 * `calculateAttendanceRate`, ambas em `types/grade.ts`/`types/attendance.ts`),
 * nunca uma fórmula própria. Os campos `student.average`/`student.status`
 * continuam existindo no documento (não foram removidos — ver
 * `types/student.ts`, que já os documentava como provisórios), mas o
 * Dashboard passa a IGNORÁ-LOS.
 *
 * A leitura é por ano letivo inteiro (`getGradesBySchoolYear`,
 * `getAttendanceRecordsBySchoolYear`, `getAssessmentsBySchoolYear` —
 * cada uma UMA consulta de campo único, sem N+1 por turma/disciplina),
 * adequado à escala de uma escola (dezenas/centenas de alunos, não
 * milhões de registros). `getAllSessions` é exceção: não existe uma
 * consulta de aulas por ano letivo pronta no projeto (só por contexto
 * completo — disciplina+turma+bimestre — em `getSessionsByContext`),
 * então lemos todas e filtramos por `schoolYear` em memória, mesmo
 * padrão já usado por `teacherOverviewService.loadTeacherRawData`.
 */

export interface StudentAcademicOverview {
  student: Student;
  average: number | null;
  situation: AcademicSituation;
  attendanceRate: number | null;
}

export interface AcademicPendency {
  id: string;
  severity: "high" | "medium" | "low";
  label: string;
  actionLabel: string;
  actionHref: string;
}

export interface AcademicOverview {
  schoolYear: number;
  students: StudentAcademicOverview[];
  byStatus: Record<AcademicSituation, number>;
  overallAverage: number | null;
  pendencies: AcademicPendency[];
}

export async function getAcademicOverview(schoolYear: number): Promise<AcademicOverview> {
  const [students, classes, disciplinesAll, assessments, sessions, grades, records, settings] = await Promise.all([
    getStudents(),
    getClasses(),
    getDisciplines(),
    getAssessmentsBySchoolYear(schoolYear),
    getAllSessions(),
    getGradesBySchoolYear(schoolYear),
    getAttendanceRecordsBySchoolYear(schoolYear),
    getAcademicSettings(schoolYear),
  ]);

  const classesThisYear = classes.filter((c) => c.schoolYear === schoolYear);
  const classIds = new Set(classesThisYear.map((c) => c.id));
  const studentsThisYear = students.filter((s) => s.classId && classIds.has(s.classId));
  // `students` não tem um campo de ano letivo próprio (só via
  // `classId` → `classes.schoolYear`) — "aluno sem turma" por
  // definição não pertence a nenhum ano, então é contado sobre TODOS
  // os alunos sem `classId`, não apenas os do ano selecionado.
  const studentsWithoutClass = students.filter((s) => !s.classId);

  const thresholds = { passingAverage: settings.passingAverage, recoveryThreshold: settings.recoveryThreshold };

  // Média/situação/frequência POR ALUNO, consolidando TODAS as
  // disciplinas/bimestres do ano — mesma regra usada pelo Boletim
  // (deriveSituationFromAverage), só que agregada no nível "aluno"
  // em vez de "aluno + disciplina".
  const studentOverviews: StudentAcademicOverview[] = studentsThisYear.map((student) => {
    const studentGrades = grades.filter((g) => g.studentId === student.id);
    const average = calculateAverage(studentGrades.map((g) => g.score));

    const studentRecords = records.filter((r) => r.studentId === student.id);
    const present = studentRecords.filter((r) => r.status === "present").length;
    const attendanceRate = calculateAttendanceRate(present, studentRecords.length);

    return {
      student,
      average,
      situation: deriveSituationFromAverage(average, thresholds),
      attendanceRate,
    };
  });

  const byStatus: Record<AcademicSituation, number> = {
    approved: 0,
    recovery: 0,
    failed: 0,
    incomplete: 0,
    no_grades: 0,
  };
  for (const o of studentOverviews) byStatus[o.situation] += 1;

  const withAverage = studentOverviews.filter((o) => o.average !== null);
  const overallAverage =
    withAverage.length === 0
      ? null
      : Math.round((withAverage.reduce((acc, o) => acc + (o.average as number), 0) / withAverage.length) * 100) / 100;

  const pendencies = buildPendencies({
    studentOverviews,
    studentsThisYear,
    studentsWithoutClass,
    disciplinesThisYear: disciplinesAll.filter((d) => d.schoolYear === schoolYear),
    classesThisYear,
    assessments,
    grades,
    sessionsThisYear: sessions.filter((s) => s.schoolYear === schoolYear),
    records,
    minAttendanceRate: settings.minAttendanceRate,
  });

  return { schoolYear, students: studentOverviews, byStatus, overallAverage, pendencies };
}

function buildPendencies(args: {
  studentOverviews: StudentAcademicOverview[];
  studentsThisYear: Student[];
  studentsWithoutClass: Student[];
  disciplinesThisYear: Discipline[];
  classesThisYear: SchoolClass[];
  assessments: import("@/types/assessment").Assessment[];
  grades: import("@/types/grade").Grade[];
  sessionsThisYear: import("@/types/attendance").AttendanceSession[];
  records: import("@/types/attendance").AttendanceRecord[];
  minAttendanceRate: number;
}): AcademicPendency[] {
  const {
    studentOverviews,
    studentsThisYear,
    studentsWithoutClass,
    disciplinesThisYear,
    classesThisYear,
    assessments,
    grades,
    sessionsThisYear,
    records,
  } = args;
  const pendencies: AcademicPendency[] = [];

  // 🔴 Alunos abaixo da média (item 12 — "Nota: aluno abaixo da média")
  const belowAverage = studentOverviews.filter((o) => o.situation === "failed" || o.situation === "recovery");
  if (belowAverage.length > 0) {
    pendencies.push({
      id: "below-average",
      severity: "high",
      label: `${belowAverage.length} aluno${belowAverage.length === 1 ? "" : "s"} abaixo da média`,
      actionLabel: "Ver alunos",
      actionHref: "/alunos",
    });
  }

  // 🟠 Alunos com frequência abaixo do mínimo (item 12 — "Frequência")
  const lowAttendance = studentOverviews.filter(
    (o) => o.attendanceRate !== null && o.attendanceRate < args.minAttendanceRate
  );
  if (lowAttendance.length > 0) {
    pendencies.push({
      id: "low-attendance",
      severity: "medium",
      label: `${lowAttendance.length} aluno${lowAttendance.length === 1 ? "" : "s"} com frequência abaixo de ${args.minAttendanceRate}%`,
      actionLabel: "Registrar frequência",
      actionHref: "/frequencia",
    });
  }

  // 🟡 Avaliações incompletas / notas não lançadas (item 12 — "Lançamento")
  const gradedByAssessment = new Map<string, number>();
  for (const g of grades) {
    if (g.score === null) continue;
    gradedByAssessment.set(g.assessmentId, (gradedByAssessment.get(g.assessmentId) ?? 0) + 1);
  }
  const studentCountByClass = new Map<string, number>();
  for (const s of studentsThisYear) {
    if (!s.classId) continue;
    studentCountByClass.set(s.classId, (studentCountByClass.get(s.classId) ?? 0) + 1);
  }

  let incompleteAssessments = 0;
  let missingGrades = 0;
  for (const assessment of assessments) {
    const expected = studentCountByClass.get(assessment.classId) ?? 0;
    if (expected === 0) continue;
    const filled = gradedByAssessment.get(assessment.id) ?? 0;
    if (filled < expected) {
      incompleteAssessments += 1;
      missingGrades += expected - filled;
    }
  }
  if (missingGrades > 0) {
    pendencies.push({
      id: "missing-grades",
      severity: "low",
      label: `${missingGrades} nota${missingGrades === 1 ? "" : "s"} ainda não lançada${missingGrades === 1 ? "" : "s"}`,
      actionLabel: "Lançar notas",
      actionHref: "/notas",
    });
  }
  if (incompleteAssessments > 0) {
    pendencies.push({
      id: "incomplete-assessments",
      severity: "low",
      label: `${incompleteAssessments} avaliaç${incompleteAssessments === 1 ? "ão incompleta" : "ões incompletas"}`,
      actionLabel: "Lançar notas",
      actionHref: "/notas",
    });
  }

  // 🟡 Aulas com frequência incompleta (mesma ideia de "avaliações
  // incompletas" acima, mas para `attendanceSessions`/`attendanceRecords`
  // — item 12 do plano V8 também cobre "lançamento" de frequência, não
  // só de notas. Uma aula (`AttendanceSession`) está incompleta quando
  // nem todos os alunos matriculados na turma naquele momento têm um
  // `AttendanceRecord` (presente/ausente) lançado para ela.
  const recordedByStudentInSession = new Map<string, Set<string>>();
  for (const r of records) {
    const set = recordedByStudentInSession.get(r.sessionId) ?? new Set<string>();
    set.add(r.studentId);
    recordedByStudentInSession.set(r.sessionId, set);
  }

  let incompleteSessions = 0;
  let missingAttendanceRecords = 0;
  for (const session of sessionsThisYear) {
    const expected = studentCountByClass.get(session.classId) ?? 0;
    if (expected === 0) continue;
    const filled = recordedByStudentInSession.get(session.id)?.size ?? 0;
    if (filled < expected) {
      incompleteSessions += 1;
      missingAttendanceRecords += expected - filled;
    }
  }
  if (missingAttendanceRecords > 0) {
    pendencies.push({
      id: "incomplete-attendance-sessions",
      severity: "low",
      label: `${incompleteSessions} aula${incompleteSessions === 1 ? "" : "s"} com frequência incompleta`,
      actionLabel: "Registrar frequência",
      actionHref: "/frequencia",
    });
  }

  // 🟡 Dados incompletos: aluno sem turma, disciplina sem professor (item 12)
  if (studentsWithoutClass.length > 0) {
    pendencies.push({
      id: "students-without-class",
      severity: "low",
      label: `${studentsWithoutClass.length} aluno${studentsWithoutClass.length === 1 ? "" : "s"} sem turma`,
      actionLabel: "Ver alunos",
      actionHref: "/alunos",
    });
  }

  const disciplinesWithoutTeacher = disciplinesThisYear.filter((d) => !d.teacherId);
  if (disciplinesWithoutTeacher.length > 0) {
    pendencies.push({
      id: "disciplines-without-teacher",
      severity: "medium",
      label: `${disciplinesWithoutTeacher.length} disciplina${disciplinesWithoutTeacher.length === 1 ? "" : "s"} sem professor`,
      actionLabel: "Ver disciplinas",
      actionHref: "/disciplinas",
    });
  }

  if (classesThisYear.length === 0) {
    pendencies.push({
      id: "no-classes",
      severity: "medium",
      label: "Nenhuma turma cadastrada para este ano letivo",
      actionLabel: "Ver turmas",
      actionHref: "/turmas",
    });
  }

  return pendencies;
}
