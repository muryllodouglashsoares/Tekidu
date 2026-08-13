import { getDisciplines } from "@/services/disciplines/disciplineService";
import { getGradesByContext } from "@/services/grades/gradeService";
import { getRecordsByContext } from "@/services/attendance/attendanceRecordService";
import {
  ACADEMIC_SITUATION_LABEL,
  PASSING_THRESHOLD,
  RECOVERY_THRESHOLD,
  calculateAverage,
  type AcademicSituation,
} from "@/types/grade";
import {
  calculateAttendanceRate,
  calculateAttendanceStatus,
  type AttendanceStatus,
} from "@/types/attendance";
import { ALL_ASSESSMENT_TERMS, type BoletimPeriod, type BoletimStatus } from "@/types/boletim";
import type { Discipline } from "@/types/discipline";

/** Desempenho consolidado de UMA disciplina no período consultado. */
export interface DisciplineBoletimRow {
  discipline: Discipline;
  average: number | null;
  situation: AcademicSituation;
  attendanceRate: number | null;
  attendanceStatus: AttendanceStatus | null;
}

/** Boletim consolidado de um aluno: identificação fica a cargo da página (já tem Student/SchoolClass). */
export interface StudentBoletim {
  disciplines: DisciplineBoletimRow[];
  overallAverage: number | null;
  overallAttendanceRate: number | null;
  overallStatus: BoletimStatus;
}

/**
 * Deriva a situação de UMA disciplina a partir da média das notas
 * lançadas. Reaproveita os mesmos limiares de `calculateSituation`
 * (types/grade.ts) — não duplica a regra de aprovação, só não usa a
 * variante "incomplete" (que depende da contagem de avaliações de UM
 * bimestre específico; no período "Anual" isso deixaria de fazer
 * sentido, já que consolidamos 4 bimestres).
 */
function situationFromAverage(average: number | null): AcademicSituation {
  if (average === null) return "no_grades";
  if (average >= PASSING_THRESHOLD) return "approved";
  if (average >= RECOVERY_THRESHOLD) return "recovery";
  return "failed";
}

/**
 * Consolida a situação GERAL do boletim a partir da situação de cada
 * disciplina + da frequência geral. Prioridade (mais grave primeiro):
 * Reprovado > Recuperação > Atenção > Regular. "Sem dados" quando o
 * aluno não tem nenhuma nota nem nenhum registro de frequência ainda
 * (ex.: turma recém-criada, ainda sem lançamentos).
 */
function deriveOverallStatus(
  disciplineRows: DisciplineBoletimRow[],
  overallAttendanceStatus: AttendanceStatus | null
): BoletimStatus {
  const hasAnyGrade = disciplineRows.some((row) => row.situation !== "no_grades");
  if (!hasAnyGrade && overallAttendanceStatus === null) return "no_data";

  if (disciplineRows.some((row) => row.situation === "failed") || overallAttendanceStatus === "critical") {
    return "failed";
  }
  if (disciplineRows.some((row) => row.situation === "recovery")) {
    return "recovery";
  }
  if (overallAttendanceStatus === "attention") {
    return "attention";
  }
  return "regular";
}

/**
 * Monta o boletim de UM aluno em UMA turma, para o período informado.
 * Reaproveita integralmente os serviços já existentes de Notas
 * (`gradeService`) e Frequência (`attendanceRecordService`) — o
 * boletim não tem sua própria coleção de notas/presença, apenas
 * consolida o que já é lançado nessas duas telas (item 15 do
 * briefing). Sem backend próprio: os dados vêm de `grades` e
 * `attendanceRecords`, filtrados no cliente pelo aluno.
 */
export async function getStudentBoletim(
  studentId: string,
  classId: string,
  schoolYear: number,
  period: BoletimPeriod
): Promise<StudentBoletim> {
  const terms = period === "annual" ? ALL_ASSESSMENT_TERMS : [period];

  const allDisciplines = await getDisciplines();
  const disciplines = allDisciplines.filter(
    (d) => d.schoolYear === schoolYear && d.classIds.includes(classId)
  );

  const disciplineRows = await Promise.all(
    disciplines.map(async (discipline): Promise<DisciplineBoletimRow> => {
      const [gradesByTerm, recordsByTerm] = await Promise.all([
        Promise.all(terms.map((term) => getGradesByContext(discipline.id, classId, schoolYear, term))),
        Promise.all(terms.map((term) => getRecordsByContext(discipline.id, classId, schoolYear, term))),
      ]);

      const studentGrades = gradesByTerm.flat().filter((g) => g.studentId === studentId);
      const studentRecords = recordsByTerm.flat().filter((r) => r.studentId === studentId);

      const average = calculateAverage(studentGrades.map((g) => g.score));
      const present = studentRecords.filter((r) => r.status === "present").length;
      const total = studentRecords.length;
      const attendanceRate = calculateAttendanceRate(present, total);

      return {
        discipline,
        average,
        situation: situationFromAverage(average),
        attendanceRate,
        attendanceStatus: calculateAttendanceStatus(attendanceRate),
      };
    })
  );

  const averages = disciplineRows.map((r) => r.average).filter((v): v is number => v !== null);
  const overallAverage = averages.length === 0 ? null : Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 100) / 100;

  const rates = disciplineRows.map((r) => r.attendanceRate).filter((v): v is number => v !== null);
  const overallAttendanceRate =
    rates.length === 0 ? null : Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10;
  const overallAttendanceStatus = calculateAttendanceStatus(overallAttendanceRate);

  return {
    disciplines: disciplineRows,
    overallAverage,
    overallAttendanceRate,
    overallStatus: deriveOverallStatus(disciplineRows, overallAttendanceStatus),
  };
}

// Reexportado para telas que só precisam do rótulo (ex.: BoletimTable) sem
// importar `types/grade` diretamente.
export { ACADEMIC_SITUATION_LABEL };
