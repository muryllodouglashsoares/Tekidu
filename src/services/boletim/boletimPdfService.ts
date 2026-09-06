import { getStudentBoletim, type StudentBoletim } from "@/services/boletim/boletimService";
import { getAcademicSettings } from "@/services/academicSettings/academicSettingsService";
import { ALL_ASSESSMENT_TERMS, type BoletimPeriod, type BoletimStatus } from "@/types/boletim";
import type { AcademicSettings } from "@/types/academicSettings";
import type { AcademicSituation } from "@/types/grade";
import type { AttendanceStatus } from "@/types/attendance";
import type { AssessmentTerm } from "@/types/assessment";
import type { Discipline } from "@/types/discipline";

/** Média de UM bimestre para uma disciplina, usada nas colunas "1º BIM"..."4º BIM" do PDF anual. */
export interface BoletimPdfTermValue {
  term: AssessmentTerm;
  average: number | null;
}

/**
 * Linha de UMA disciplina no PDF. Estende `DisciplineBoletimRow` (ver
 * `boletimService.ts`) com a quebra por bimestre — necessária apenas no
 * relatório ANUAL, já que a imagem de referência mostra Q1..Q4 lado a
 * lado (item 6 do briefing). `finalAverage`/`attendanceRate`/`situation`
 * são exatamente os mesmos valores já calculados por `getStudentBoletim`
 * para o período consultado — nenhuma fórmula nova é criada aqui.
 */
export interface BoletimPdfDisciplineRow {
  discipline: Discipline;
  /** Um item por bimestre no relatório "annual"; um único item (o próprio período) nos demais. */
  terms: BoletimPdfTermValue[];
  finalAverage: number | null;
  situation: AcademicSituation;
  attendanceRate: number | null;
  attendanceStatus: AttendanceStatus | null;
}

/** Estrutura completa consumida pelo componente `BoletimPDF`. */
export interface BoletimPdfData {
  period: BoletimPeriod;
  disciplines: BoletimPdfDisciplineRow[];
  overallAverage: number | null;
  overallAttendanceRate: number | null;
  overallStatus: BoletimStatus;
  settings: AcademicSettings;
}

/**
 * Prepara os dados do PDF do boletim a partir do boletim JÁ CARREGADO
 * pela página (`currentBoletim`, resultado de `getStudentBoletim` para
 * o `period` selecionado) — evita buscar de novo o mesmo período.
 *
 * Quando `period !== "annual"`, os dados já são suficientes: cada
 * disciplina vira uma linha com uma única coluna de bimestre (o
 * próprio período).
 *
 * Quando `period === "annual"`, o relatório precisa mostrar os QUATRO
 * bimestres lado a lado (item 6 do briefing) — algo que
 * `getStudentBoletim("annual")` não calcula (ele consolida as notas de
 * todos os bimestres em uma única média anual, não expõe a média de
 * cada um). Para isso, busca os quatro boletins por bimestre em
 * paralelo (`Promise.all`) reaproveitando a MESMA função central, e
 * apenas lê a média já calculada de cada um — sem reimplementar
 * `calculateAverage`/`deriveSituationFromAverage` aqui. A média final,
 * frequência geral e situação geral exibidas continuam vindo do
 * boletim anual já carregado (`currentBoletim`), preservando a mesma
 * fonte de verdade usada pela tela.
 */
export async function getStudentBoletimPdfData(
  studentId: string,
  classId: string,
  schoolYear: number,
  period: BoletimPeriod,
  currentBoletim: StudentBoletim
): Promise<BoletimPdfData> {
  const settings = await getAcademicSettings(schoolYear);

  if (period !== "annual") {
    return {
      period,
      disciplines: currentBoletim.disciplines.map((row) => ({
        discipline: row.discipline,
        terms: [{ term: period, average: row.average }],
        finalAverage: row.average,
        situation: row.situation,
        attendanceRate: row.attendanceRate,
        attendanceStatus: row.attendanceStatus,
      })),
      overallAverage: currentBoletim.overallAverage,
      overallAttendanceRate: currentBoletim.overallAttendanceRate,
      overallStatus: currentBoletim.overallStatus,
      settings,
    };
  }

  // Quatro consultas em paralelo (item 19 do briefing) — nunca em série.
  const termBoletins = await Promise.all(
    ALL_ASSESSMENT_TERMS.map((term) => getStudentBoletim(studentId, classId, schoolYear, term))
  );

  const disciplines: BoletimPdfDisciplineRow[] = currentBoletim.disciplines.map((annualRow) => {
    const terms: BoletimPdfTermValue[] = ALL_ASSESSMENT_TERMS.map((term, index) => {
      const termRow = termBoletins[index].disciplines.find(
        (row) => row.discipline.id === annualRow.discipline.id
      );
      return { term, average: termRow?.average ?? null };
    });

    return {
      discipline: annualRow.discipline,
      terms,
      finalAverage: annualRow.average,
      situation: annualRow.situation,
      attendanceRate: annualRow.attendanceRate,
      attendanceStatus: annualRow.attendanceStatus,
    };
  });

  return {
    period,
    disciplines,
    overallAverage: currentBoletim.overallAverage,
    overallAttendanceRate: currentBoletim.overallAttendanceRate,
    overallStatus: currentBoletim.overallStatus,
    settings,
  };
}
