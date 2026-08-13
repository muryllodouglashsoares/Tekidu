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
 * Limiar provisório de aprovação (escala 0–10). NÃO é uma regra
 * acadêmica oficial do Tekidu — é um placeholder isolado nesta
 * constante para que, quando a instituição definir a regra real
 * (ex.: média mínima diferente, faixa de recuperação, etc.), baste
 * ajustar este único valor.
 */
export const PASSING_THRESHOLD = 6;
export const RECOVERY_THRESHOLD = 4;

/**
 * Calcula a média aritmética simples das notas lançadas (ignora `null`).
 * Retorna `null` se nenhuma nota foi lançada ainda.
 */
export function calculateAverage(scores: (number | null)[]): number | null {
  const filled = scores.filter((s): s is number => s !== null);
  if (filled.length === 0) return null;
  const sum = filled.reduce((acc, s) => acc + s, 0);
  return Math.round((sum / filled.length) * 100) / 100;
}

/**
 * Deriva a situação acadêmica a partir das notas lançadas em um
 * contexto. Ver nota sobre `PASSING_THRESHOLD` acima.
 */
export function calculateSituation(
  scores: (number | null)[],
  totalAssessments: number
): AcademicSituation {
  const filledCount = scores.filter((s) => s !== null).length;
  if (filledCount === 0) return "no_grades";
  if (filledCount < totalAssessments) return "incomplete";

  const average = calculateAverage(scores);
  if (average === null) return "no_grades";
  if (average >= PASSING_THRESHOLD) return "approved";
  if (average >= RECOVERY_THRESHOLD) return "recovery";
  return "failed";
}
