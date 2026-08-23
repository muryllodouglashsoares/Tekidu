import { getDisciplines, getDisciplinesForClass } from "@/services/disciplines/disciplineService";
import { getGradesByContext } from "@/services/grades/gradeService";
import { getRecordsByContext } from "@/services/attendance/attendanceRecordService";
import { getAcademicSettings } from "@/services/academicSettings/academicSettingsService";
import {
  ACADEMIC_SITUATION_LABEL,
  calculateAverage,
  deriveSituationFromAverage,
  type AcademicSituation,
  type AcademicThresholds,
} from "@/types/grade";
import {
  calculateAttendanceRate,
  calculateAttendanceStatus,
  type AttendanceStatus,
} from "@/types/attendance";
import { ALL_ASSESSMENT_TERMS, type BoletimPeriod, type BoletimStatus } from "@/types/boletim";
import type { Discipline } from "@/types/discipline";
import type { AssessmentTerm } from "@/types/assessment";

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

  // Regras acadêmicas (média mínima, recuperação, frequência mínima) —
  // busca a configuração do ano letivo (item 6/7 do plano V8) em vez
  // de usar os limiares fixos diretamente; cai para o padrão do
  // sistema quando o ano ainda não foi configurado (ver
  // `academicSettingsService.getAcademicSettings`).
  const [allDisciplines, settings] = await Promise.all([
    // Ver nota em `getDisciplinesForClass` (disciplineService): o
    // relacionamento correto é só `classIds`, sem exigir que
    // `discipline.schoolYear` também bata com o ano da turma.
    getDisciplines(),
    getAcademicSettings(schoolYear),
  ]);
  const disciplines = getDisciplinesForClass(allDisciplines, classId);
  const thresholds: AcademicThresholds = {
    passingAverage: settings.passingAverage,
    recoveryThreshold: settings.recoveryThreshold,
  };

  const disciplineRows = await Promise.all(
    disciplines.map(async (discipline): Promise<DisciplineBoletimRow> => {
      // `studentId` é passado adiante para estreitar a query já no
      // servidor (em vez de buscar o contexto inteiro e filtrar aqui em
      // memória) — mesmo resultado final de antes, mas agora também é
      // o que torna esta função utilizável por um aluno autenticado
      // (Tarefa 3, Fase 1 pós-auditoria V8): ver a nota de parâmetro em
      // `gradeService.getGradesByContext`/`attendanceRecordService.getRecordsByContext`.
      //
      // TRY/CATCH (Etapa 7): desde o escopo de leitura por disciplina em
      // `firestore.rules` (`isOwnDiscipline`), um PROFESSOR consultando o
      // boletim de um aluno de uma turma onde ele só leciona ALGUMAS
      // disciplinas recebe "permissão negada" para as disciplinas dos
      // OUTROS professores dessa turma — o comportamento correto e
      // esperado. Sem este try/catch, essa negação derrubaria o
      // `Promise.all` inteiro e quebraria o boletim também para as
      // disciplinas que o professor TEM permissão de ver. Em vez disso,
      // a disciplina sem permissão aparece como "sem dados" — o mesmo
      // estado vazio já usado para uma disciplina sem lançamentos ainda
      // (regra 3 do plano: nada de erro onde um estado vazio já existe).
      // Para admin/aluno (dono do próprio registro), isso nunca ocorre.
      let studentGrades: import("@/types/grade").Grade[] = [];
      let studentRecords: import("@/types/attendance").AttendanceRecord[] = [];
      try {
        const [gradesByTerm, recordsByTerm] = await Promise.all([
          Promise.all(
            terms.map((term) => getGradesByContext(discipline.id, classId, schoolYear, term, studentId))
          ),
          Promise.all(
            terms.map((term) => getRecordsByContext(discipline.id, classId, schoolYear, term, studentId))
          ),
        ]);
        studentGrades = gradesByTerm.flat().filter((g) => g.studentId === studentId);
        studentRecords = recordsByTerm.flat().filter((r) => r.studentId === studentId);
      } catch {
        // Sem permissão para esta disciplina específica — trata como
        // "sem dados" em vez de propagar o erro (ver nota acima).
      }

      const average = calculateAverage(studentGrades.map((g) => g.score));
      const present = studentRecords.filter((r) => r.status === "present").length;
      const total = studentRecords.length;
      const attendanceRate = calculateAttendanceRate(present, total);

      return {
        discipline,
        average,
        // Reaproveita a MESMA função central usada por Notas
        // (`calculateSituation` → `deriveSituationFromAverage` em
        // types/grade.ts) — o Boletim não tem sua própria fórmula de
        // aprovação; só não usa a variante \"incomplete\" (que depende
        // da contagem de avaliações de UM bimestre específico; no
        // período \"Anual\" isso deixaria de fazer sentido, já que
        // consolidamos 4 bimestres).
        situation: deriveSituationFromAverage(average, thresholds),
        attendanceRate,
        attendanceStatus: calculateAttendanceStatus(attendanceRate, settings.minAttendanceRate),
      };
    })
  );

  const averages = disciplineRows.map((r) => r.average).filter((v): v is number => v !== null);
  const overallAverage = averages.length === 0 ? null : Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 100) / 100;

  const rates = disciplineRows.map((r) => r.attendanceRate).filter((v): v is number => v !== null);
  const overallAttendanceRate =
    rates.length === 0 ? null : Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10;
  const overallAttendanceStatus = calculateAttendanceStatus(overallAttendanceRate, settings.minAttendanceRate);

  return {
    disciplines: disciplineRows,
    overallAverage,
    overallAttendanceRate,
    overallStatus: deriveOverallStatus(disciplineRows, overallAttendanceStatus),
  };
}

/** Um ponto da série de evolução de um aluno (item 18 do briefing). */
export interface StudentDevelopmentPoint {
  term: AssessmentTerm;
  average: number | null;
  attendanceRate: number | null;
}

/**
 * Monta a série de evolução do aluno ao longo dos 4 bimestres do ano
 * letivo — usada pelo gráfico individual do Relatório de Desenvolvimento
 * (item 18) e pelo gráfico na página do aluno (item 19). Reaproveita
 * `getStudentBoletim` uma vez por bimestre (mesma fonte de verdade do
 * Boletim, sem duplicar o cálculo de média/frequência em outro lugar) —
 * as 4 chamadas rodam em paralelo, então o custo é o mesmo de buscar um
 * único bimestre "mais lento".
 */
export async function getStudentDevelopmentSeries(
  studentId: string,
  classId: string,
  schoolYear: number
): Promise<StudentDevelopmentPoint[]> {
  const results = await Promise.all(
    ALL_ASSESSMENT_TERMS.map(async (term) => {
      const boletim = await getStudentBoletim(studentId, classId, schoolYear, term);
      return { term, average: boletim.overallAverage, attendanceRate: boletim.overallAttendanceRate };
    })
  );
  return results;
}

// Reexportado para telas que só precisam do rótulo (ex.: BoletimTable) sem
// importar `types/grade` diretamente.
export { ACADEMIC_SITUATION_LABEL };
