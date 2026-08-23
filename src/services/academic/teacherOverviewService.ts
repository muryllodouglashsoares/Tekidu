import { getStudents } from "@/services/students/studentService";
import { getClasses } from "@/services/classes/classService";
import { getDisciplines } from "@/services/disciplines/disciplineService";
import { getAssessmentsByDisciplineIds } from "@/services/assessments/assessmentService";
import { getSessionsByDisciplineIds } from "@/services/attendanceSessions/attendanceSessionService";
import { getGradesByDisciplineIds } from "@/services/grades/gradeService";
import { getAttendanceRecordsByDisciplineIds } from "@/services/attendance/attendanceRecordService";
import { getAcademicSettings } from "@/services/academicSettings/academicSettingsService";
import { computeDevelopmentSeries, type ReportSeriesPoint } from "@/services/reports/reportsService";
import { calculateAverage, deriveSituationFromAverage, type AcademicSituation } from "@/types/grade";
import { calculateAttendanceRate } from "@/types/attendance";
import type { Student } from "@/types/student";
import type { SchoolClass } from "@/types/schoolClass";
import type { Discipline } from "@/types/discipline";

/**
 * Portal do Professor (Etapa 4 do plano multi-role): "Minhas Turmas" e
 * "Meus Alunos".
 *
 * POR QUE ESTE ARQUIVO EXISTE (evitar duplicação — item 26 do plano):
 * `DashboardPage.tsx` (`TeacherDashboard`) já calculava, inline, a
 * lista de "disciplina + turma" de um professor (`teacherId ===
 * profile.uid` → `discipline.classIds`). Essa MESMA relação é a base
 * de "Minhas Turmas" e "Meus Alunos" — em vez de copiar esse cálculo
 * de novo, ele foi extraído para cá e o Dashboard passou a chamar
 * `getTeacherAssignments` também (ver DashboardPage.tsx).
 *
 * ESCOPO/SEGURANÇA (item 13/14 do plano; fechado na Etapa 7): todas as
 * funções abaixo recebem `teacherUid` e filtram TUDO a partir dele —
 * um professor nunca vê turma/aluno fora de `discipline.teacherId ===
 * teacherUid`. Até a Etapa 6, isso só era garantido em memória (a
 * leitura em si buscava o ano letivo INTEIRO via `getXBySchoolYear` e
 * filtrava depois) — a Etapa 7 fechou essa lacuna: `loadTeacherRawData`
 * agora busca `myDisciplines` PRIMEIRO e usa as versões
 * `getXByDisciplineIds` (uma consulta por disciplina, nunca uma
 * consulta ampla do ano inteiro) para avaliações/aulas/notas/presença
 * — o que permite a `firestore.rules` (`isOwnDiscipline`) validar e
 * BLOQUEAR de fato a leitura, não só confiar na UI para escondê-la.
 *
 * PERFORMANCE: `myDisciplines` normalmente tem poucas entradas (as
 * disciplinas de UM professor), então o custo de "uma consulta por
 * disciplina" em paralelo (`Promise.all`) é próximo do de uma única
 * consulta ampla — só o admin (`academicOverviewService`, que continua
 * usando `getXBySchoolYear` porque precisa da escola inteira) paga o
 * custo de uma leitura por coleção.
 */

export interface TeacherAssignment {
  discipline: Discipline;
  schoolClass: SchoolClass;
  assessmentCount: number;
  sessionCount: number;
  studentCount: number;
}

export interface TeacherClassOverview extends TeacherAssignment {
  average: number | null;
  attendanceRate: number | null;
}

export interface TeacherStudentOverview {
  student: Student;
  schoolClass: SchoolClass;
  /** Disciplinas do professor em que este aluno está matriculado (pode ser mais de uma). */
  disciplines: Discipline[];
  /** Média considerando SOMENTE as disciplinas deste professor com este aluno. */
  average: number | null;
  attendanceRate: number | null;
  situation: AcademicSituation;
}

interface TeacherRawData {
  teacherUid: string;
  schoolYear: number;
  myDisciplines: Discipline[];
  classById: Map<string, SchoolClass>;
  studentsByClassId: Map<string, Student[]>;
  assessments: import("@/types/assessment").Assessment[];
  sessions: import("@/types/attendance").AttendanceSession[];
  grades: import("@/types/grade").Grade[];
  records: import("@/types/attendance").AttendanceRecord[];
  thresholds: { passingAverage: number; recoveryThreshold: number };
}

async function loadTeacherRawData(teacherUid: string, schoolYear: number): Promise<TeacherRawData> {
  // Etapa 7 — busca disciplinas/turmas/alunos primeiro (leitura de
  // catálogo, já ampla por Security Rule — ver nota em
  // `firestore.rules`) para resolver `myDisciplines` ANTES de buscar
  // avaliações/aulas/notas/presença, que agora são escopadas por
  // disciplina (`getXByDisciplineIds`) em vez de "o ano letivo
  // inteiro" (`getXBySchoolYear`).
  const [disciplines, classes, students, settings] = await Promise.all([
    getDisciplines(),
    getClasses(),
    getStudents(),
    getAcademicSettings(schoolYear),
  ]);

  const myDisciplines = disciplines.filter((d) => d.teacherId === teacherUid);
  const myDisciplineIds = myDisciplines.map((d) => d.id);

  const [assessments, sessions, grades, records] = await Promise.all([
    getAssessmentsByDisciplineIds(myDisciplineIds, schoolYear),
    getSessionsByDisciplineIds(myDisciplineIds),
    getGradesByDisciplineIds(myDisciplineIds, schoolYear),
    getAttendanceRecordsByDisciplineIds(myDisciplineIds, schoolYear),
  ]);

  const classById = new Map<string, SchoolClass>();
  for (const c of classes) classById.set(c.id, c);

  const studentsByClassId = new Map<string, Student[]>();
  for (const s of students) {
    if (!s.classId) continue;
    const list = studentsByClassId.get(s.classId) ?? [];
    list.push(s);
    studentsByClassId.set(s.classId, list);
  }

  return {
    teacherUid,
    schoolYear,
    myDisciplines,
    classById,
    studentsByClassId,
    assessments,
    sessions,
    grades,
    records,
    thresholds: { passingAverage: settings.passingAverage, recoveryThreshold: settings.recoveryThreshold },
  };
}

/** Lista "disciplina lecionada em uma turma" do professor — base do Dashboard e de "Minhas Turmas". */
export async function getTeacherAssignments(teacherUid: string, schoolYear: number): Promise<TeacherAssignment[]> {
  const data = await loadTeacherRawData(teacherUid, schoolYear);
  return buildAssignments(data);
}

function buildAssignments(data: TeacherRawData): TeacherAssignment[] {
  const { myDisciplines, classById, studentsByClassId, assessments, sessions } = data;
  const built: TeacherAssignment[] = [];

  for (const discipline of myDisciplines) {
    for (const classId of discipline.classIds) {
      const schoolClass = classById.get(classId);
      if (!schoolClass) continue;
      const assessmentCount = assessments.filter(
        (a) => a.disciplineId === discipline.id && a.classId === classId
      ).length;
      const sessionCount = sessions.filter(
        (s) => s.disciplineId === discipline.id && s.classId === classId
      ).length;
      const studentCount = (studentsByClassId.get(classId) ?? []).length;
      built.push({ discipline, schoolClass, assessmentCount, sessionCount, studentCount });
    }
  }

  return built;
}

/** "Minhas Turmas": mesma lista de `getTeacherAssignments`, mas com média/frequência calculadas (seção 4 do plano). */
export async function getTeacherClassesOverview(teacherUid: string, schoolYear: number): Promise<TeacherClassOverview[]> {
  const data = await loadTeacherRawData(teacherUid, schoolYear);
  const assignments = buildAssignments(data);

  return assignments.map((assignment) => {
    const { discipline, schoolClass } = assignment;
    const studentsInClass = data.studentsByClassId.get(schoolClass.id) ?? [];
    const studentIds = new Set(studentsInClass.map((s) => s.id));

    const classGrades = data.grades.filter(
      (g) => g.disciplineId === discipline.id && g.classId === schoolClass.id && studentIds.has(g.studentId)
    );
    const average = calculateAverage(classGrades.map((g) => g.score));

    const classRecords = data.records.filter(
      (r) => r.disciplineId === discipline.id && r.classId === schoolClass.id && studentIds.has(r.studentId)
    );
    const present = classRecords.filter((r) => r.status === "present").length;
    const attendanceRate = calculateAttendanceRate(present, classRecords.length);

    return { ...assignment, average, attendanceRate };
  });
}

/**
 * "Meus Alunos": um aluno aparece UMA vez mesmo que esteja em mais de
 * uma turma/disciplina do mesmo professor — média/frequência são
 * calculadas apenas sobre as disciplinas deste professor com aquele
 * aluno (não a média geral do aluno em todas as matérias da escola),
 * porque é essa a informação que pertence à responsabilidade do
 * professor (seção 13/21 do plano: "acessar dados acadêmicos
 * relacionados às suas responsabilidades").
 */
export async function getTeacherStudentsOverview(teacherUid: string, schoolYear: number): Promise<TeacherStudentOverview[]> {
  const data = await loadTeacherRawData(teacherUid, schoolYear);

  const byStudentId = new Map<string, TeacherStudentOverview>();

  for (const discipline of data.myDisciplines) {
    for (const classId of discipline.classIds) {
      const schoolClass = data.classById.get(classId);
      if (!schoolClass) continue;
      const studentsInClass = data.studentsByClassId.get(classId) ?? [];

      for (const student of studentsInClass) {
        const existing = byStudentId.get(student.id);
        if (existing) {
          if (!existing.disciplines.some((d) => d.id === discipline.id)) {
            existing.disciplines.push(discipline);
          }
        } else {
          byStudentId.set(student.id, {
            student,
            schoolClass,
            disciplines: [discipline],
            average: null,
            attendanceRate: null,
            situation: "no_grades",
          });
        }
      }
    }
  }

  for (const overview of byStudentId.values()) {
    const disciplineIds = new Set(overview.disciplines.map((d) => d.id));

    const studentGrades = data.grades.filter(
      (g) => g.studentId === overview.student.id && disciplineIds.has(g.disciplineId)
    );
    overview.average = calculateAverage(studentGrades.map((g) => g.score));
    overview.situation = deriveSituationFromAverage(overview.average, data.thresholds);

    const studentRecords = data.records.filter(
      (r) => r.studentId === overview.student.id && disciplineIds.has(r.disciplineId)
    );
    const present = studentRecords.filter((r) => r.status === "present").length;
    overview.attendanceRate = calculateAttendanceRate(present, studentRecords.length);
  }

  return Array.from(byStudentId.values()).sort((a, b) => a.student.name.localeCompare(b.student.name, "pt-BR"));
}

/**
 * "Desempenho" do professor (Etapa 4b do plano multi-role): mesma
 * lista de `getTeacherClassesOverview` (uma linha por
 * disciplina+turma do professor), mas cada item também carrega a
 * série de médias por bimestre — para permitir (a) comparar turmas
 * entre si pela média/frequência ANUAL já calculada aqui, e (b) ver a
 * evolução de UMA turma+disciplina ao longo do ano (o mesmo padrão de
 * `MyPerformancePage.tsx` do aluno, mas por turma em vez de por
 * aluno).
 *
 * REAPROVEITAMENTO (regra 1 do plano — nada de service duplicado):
 * a série por bimestre usa `reportsService.computeDevelopmentSeries`,
 * a MESMA função já usada pelo gráfico de "/relatorios" (visão do
 * admin) — nenhuma lógica de agregação por bimestre é reimplementada
 * aqui, só aplicada ao recorte "notas desta turma+disciplina,
 * filtradas aos alunos atualmente matriculados nela".
 */
export interface TeacherClassPerformance extends TeacherClassOverview {
  series: ReportSeriesPoint[];
}

export async function getTeacherPerformanceOverview(
  teacherUid: string,
  schoolYear: number
): Promise<TeacherClassPerformance[]> {
  const data = await loadTeacherRawData(teacherUid, schoolYear);
  const assignments = buildAssignments(data);

  return assignments.map((assignment) => {
    const { discipline, schoolClass } = assignment;
    const studentsInClass = data.studentsByClassId.get(schoolClass.id) ?? [];
    const studentIds = new Set(studentsInClass.map((s) => s.id));

    const classGrades = data.grades.filter(
      (g) => g.disciplineId === discipline.id && g.classId === schoolClass.id && studentIds.has(g.studentId)
    );
    const average = calculateAverage(classGrades.map((g) => g.score));

    const classRecords = data.records.filter(
      (r) => r.disciplineId === discipline.id && r.classId === schoolClass.id && studentIds.has(r.studentId)
    );
    const present = classRecords.filter((r) => r.status === "present").length;
    const attendanceRate = calculateAttendanceRate(present, classRecords.length);

    // Escopo já pré-filtrado (disciplina+turma+alunos matriculados)
    // acima, então `computeDevelopmentSeries` não precisa repetir esse
    // filtro — só agrupa as notas já corretas por bimestre.
    const series = computeDevelopmentSeries(classGrades, {});

    return { ...assignment, average, attendanceRate, series };
  });
}
