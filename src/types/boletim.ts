import { ASSESSMENT_TERM_LABEL, type AssessmentTerm } from "@/types/assessment";

/**
 * Período consultado no Boletim. Estende `AssessmentTerm` (mesmos 4
 * bimestres já usados por Notas/Frequência) com a opção "annual", que
 * consolida os quatro bimestres do ano letivo em uma única visão —
 * mesmo comportamento do seletor "Anual" do protótipo do Figma.
 */
export type BoletimPeriod = "annual" | AssessmentTerm;

export const BOLETIM_PERIOD_LABEL: Record<BoletimPeriod, string> = {
  annual: "Anual",
  ...ASSESSMENT_TERM_LABEL,
};

/** Todos os bimestres, usados para consolidar o período "annual". */
export const ALL_ASSESSMENT_TERMS: AssessmentTerm[] = ["1", "2", "3", "4"];

/**
 * Situação acadêmica GERAL do aluno no boletim (item 10 do briefing:
 * "Situação acadêmica" — Regular / Atenção / Recuperação / Reprovado).
 * É distinta de `AcademicSituation` (types/grade.ts, por disciplina) e
 * de `AttendanceStatus` (types/attendance.ts, só frequência): o
 * boletim CONSOLIDA as duas em uma única situação — ver
 * `deriveOverallStatus` em `services/boletim/boletimService.ts`.
 */
export type BoletimStatus = "no_data" | "regular" | "attention" | "recovery" | "failed";

export const BOLETIM_STATUS_LABEL: Record<BoletimStatus, string> = {
  no_data: "Sem dados",
  regular: "Regular",
  attention: "Atenção",
  recovery: "Recuperação",
  failed: "Reprovado",
};
