import type { AssessmentTerm } from "@/types/assessment";

/**
 * Escala de notas aceita pela aplicação. Não há uma constante
 * equivalente pré-existente no projeto (o único outro lugar que valida
 * "0 a 10" é `StudentFormModal`, com os limites soltos no JSX) — esta é
 * a fonte única de verdade para a nova funcionalidade de Notas.
 */
export const GRADE_MIN = 0;
export const GRADE_MAX = 10;

/**
 * Formato do documento em: grades/{gradeId}
 *
 * NOTA SOBRE A DENORMALIZAÇÃO (disciplineId/classId/schoolYear/term):
 * Esses quatro campos já existem no documento de `assessments/{assessmentId}`
 * referenciado por `assessmentId`. Eles são copiados (snapshot) para cá
 * pelo mesmo motivo que `disciplines.teacherName` é copiado de
 * `users/{uid}`: permitem consultar `grades` diretamente por
 * `classId + disciplineId + term` (a tabela inteira de notas de um
 * contexto) com UMA ÚNICA query, em vez de:
 *   (a) buscar as avaliações do contexto primeiro, e then
 *   (b) fazer uma query `where assessmentId in [...]` (limitada a 30
 *       valores no Firestore) ou N queries — uma por avaliação.
 * O preço é manter os campos em sincronia caso uma avaliação seja
 * "movida" de contexto — cenário raro (normalmente exclui-se e recria-se
 * a avaliação), então o custo de manutenção é baixo perto do ganho de
 * performance/simplicidade de leitura.
 *
 * NOTA SOBRE score:
 * `null` representa "nota não lançada" (campo vazio), diferente de `0`
 * (nota lançada como zero). Isso é o que permite distinguir as situações
 * "Sem notas" / "Notas incompletas" de uma reprovação real por nota 0.
 */
export interface Grade {
  id: string;
  studentId: string;
  assessmentId: string;
  disciplineId: string;
  classId: string;
  schoolYear: number;
  term: AssessmentTerm;
  score: number | null;
  createdAt: unknown; // Firestore Timestamp
  updatedAt: unknown; // Firestore Timestamp
}

/** Payload aceito ao salvar/atualizar uma nota individual. */
export interface GradeInput {
  studentId: string;
  assessmentId: string;
  disciplineId: string;
  classId: string;
  schoolYear: number;
  term: AssessmentTerm;
  score: number | null;
}

/**
 * Situação acadêmica calculada a partir das notas de um aluno em um
 * contexto (disciplina + turma + bimestre). Não existe uma regra de
 * aprovação definida no restante do projeto — `PASSING_THRESHOLD` abaixo
 * é um valor provisório e isolado, fácil de trocar por uma configuração
 * real quando essa regra existir.
 */
export type AcademicSituation =
  | "no_grades"
  | "incomplete"
  | "approved"
  | "recovery"
  | "failed";

export const ACADEMIC_SITUATION_LABEL: Record<AcademicSituation, string> = {
  no_grades: "Sem notas",
  incomplete: "Notas incompletas",
  approved: "Aprovado",
  recovery: "Recuperação",
  failed: "Reprovado",
};

/**
 * Limiar padrão de aprovação (escala 0–10). Este é apenas o valor
 * usado quando a instituição ainda não configurou uma regra própria
 * para o ano letivo (ver `types/academicSettings.ts` e
 * `services/academicSettings/academicSettingsService.ts`, item 6 do
 * plano de consolidação V8). TODAS as funções de cálculo abaixo
 * aceitam thresholds explícitos como parâmetro opcional — nunca
 * hardcode `PASSING_THRESHOLD`/`RECOVERY_THRESHOLD` diretamente em uma
 * página/componente; sempre passe o valor vindo de `AcademicSettings`
 * quando ele estiver disponível, para que a regra fique centralizada e
 * configurável por ano letivo em vez de fixa no código.
 */
export const PASSING_THRESHOLD = 6;
export const RECOVERY_THRESHOLD = 4;

/** Par de limiares de aprovação/recuperação usado pelas funções de cálculo. */
export interface AcademicThresholds {
  passingAverage: number;
  recoveryThreshold: number;
}

export const DEFAULT_ACADEMIC_THRESHOLDS: AcademicThresholds = {
  passingAverage: PASSING_THRESHOLD,
  recoveryThreshold: RECOVERY_THRESHOLD,
};

/**
 * Calcula a média aritmética simples das notas lançadas (ignora `null`).
 * Retorna `null` se nenhuma nota foi lançada ainda.
 *
 * Usada quando todas as avaliações do contexto têm o mesmo peso (o
 * caso mais comum). Para contextos com pesos diferentes por avaliação
 * (item 4 do plano V8 — "Avaliações mais completas"), use
 * `calculateWeightedAverage` abaixo.
 */
export function calculateAverage(scores: (number | null)[]): number | null {
  const filled = scores.filter((s): s is number => s !== null);
  if (filled.length === 0) return null;
  const sum = filled.reduce((acc, s) => acc + s, 0);
  return Math.round((sum / filled.length) * 100) / 100;
}

/**
 * Uma nota lançada junto do peso da avaliação a que pertence — a
 * mesma dupla (score, weight) usada por `Assessment.weight`
 * (types/assessment.ts). `score: null` = nota ainda não lançada.
 */
export interface WeightedScore {
  score: number | null;
  weight: number;
}

/**
 * Calcula a média ponderada das notas lançadas. Equivalente a
 * `calculateAverage` quando todos os pesos são iguais a 1 (mesmo
 * resultado, mesma escala) — não é uma fórmula paralela, apenas a
 * generalização da média simples para o caso em que a arquitetura já
 * suporta peso por avaliação (item 4 do plano V8). Avaliações sem nota
 * lançada não entram nem no somatório nem no divisor (mesmo
 * comportamento de `calculateAverage`, que ignora `null`).
 */
export function calculateWeightedAverage(entries: WeightedScore[]): number | null {
  const filled = entries.filter((e): e is { score: number; weight: number } => e.score !== null);
  if (filled.length === 0) return null;
  const totalWeight = filled.reduce((acc, e) => acc + (e.weight > 0 ? e.weight : 0), 0);
  if (totalWeight === 0) return calculateAverage(filled.map((e) => e.score));
  const weightedSum = filled.reduce((acc, e) => acc + e.score * (e.weight > 0 ? e.weight : 0), 0);
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

/**
 * Deriva a situação acadêmica a partir das notas lançadas em um
 * contexto (disciplina + turma + bimestre) — inclui a variante
 * "incomplete", que depende de quantas avaliações existem NAQUELE
 * bimestre. `thresholds` é opcional e cai para o padrão do sistema
 * quando a instituição ainda não configurou um valor próprio para o
 * ano letivo.
 */
export function calculateSituation(
  scores: (number | null)[],
  totalAssessments: number,
  thresholds: AcademicThresholds = DEFAULT_ACADEMIC_THRESHOLDS
): AcademicSituation {
  const filledCount = scores.filter((s) => s !== null).length;
  if (filledCount === 0) return "no_grades";
  if (filledCount < totalAssessments) return "incomplete";

  const average = calculateAverage(scores);
  if (average === null) return "no_grades";
  return deriveSituationFromAverage(average, thresholds);
}

/**
 * Deriva a situação a partir de uma média JÁ CALCULADA, sem a noção de
 * "incompleto" (que só faz sentido dentro de UM bimestre específico —
 * ver `calculateSituation` acima). Usada em qualquer lugar que precise
 * classificar uma média consolidada (várias avaliações, vários
 * bimestres, ou a média anual de uma disciplina): Boletim
 * (`boletimService.getStudentBoletim`), Dashboard (pendências e
 * distribuição por situação) e, no futuro, Histórico do aluno. É a
 * ÚNICA função que decide "aprovado vs recuperação vs reprovado" a
 * partir de uma média — nenhum outro módulo deve reimplementar esta
 * comparação.
 */
export function deriveSituationFromAverage(
  average: number | null,
  thresholds: AcademicThresholds = DEFAULT_ACADEMIC_THRESHOLDS
): AcademicSituation {
  if (average === null) return "no_grades";
  if (average >= thresholds.passingAverage) return "approved";
  if (average >= thresholds.recoveryThreshold) return "recovery";
  return "failed";
}
