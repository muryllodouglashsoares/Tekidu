/**
 * Bimestre/período letivo em que a avaliação ocorre.
 * Lista fixa de 4 bimestres — o mesmo padrão de enumeração simples já
 * usado em `ClassShift`/`DisciplineStatus`. Caso a instituição use
 * trimestres/semestres, este é o único lugar a ajustar.
 */
export type AssessmentTerm = "1" | "2" | "3" | "4";

export const ASSESSMENT_TERM_LABEL: Record<AssessmentTerm, string> = {
  "1": "1º Bimestre",
  "2": "2º Bimestre",
  "3": "3º Bimestre",
  "4": "4º Bimestre",
};

/**
 * Formato do documento em: assessments/{assessmentId}
 *
 * NOTA SOBRE O ESCOPO (disciplineId + classId + term):
 * Uma avaliação pertence a uma disciplina lecionada em UMA turma
 * específica, dentro de UM bimestre. Isso reflete a realidade de que a
 * mesma disciplina (ex.: "Programação") pode ser lecionada em turmas
 * diferentes (`discipline.classIds`) com calendários de prova distintos
 * — não faz sentido uma "Prova 1" ser compartilhada entre turmas que
 * avançam em ritmos diferentes. Essa também é a granularidade exata dos
 * filtros da tela de Notas (Turma → Disciplina → Bimestre), então listar
 * avaliações do contexto selecionado é sempre uma consulta direta por
 * `disciplineId + classId + term`, sem joins adicionais.
 *
 * `order` define a ordem das colunas na tabela de notas (não depende de
 * `createdAt`, para permitir reordenar sem afetar histórico).
 *
 * `weight`/`maxScore`/`type`/`description`/`date` (item 4 do plano V8 —
 * "Avaliações mais completas") são OPCIONAIS e retrocompatíveis:
 * avaliações criadas antes desta versão não têm esses campos no
 * Firestore, então todo código que os lê usa um fallback (`weight ?? 1`,
 * `maxScore ?? GRADE_MAX`) — nunca assuma que estão presentes.
 */
export type AssessmentType = "prova" | "trabalho" | "participacao" | "outro";

export const ASSESSMENT_TYPE_LABEL: Record<AssessmentType, string> = {
  prova: "Prova",
  trabalho: "Trabalho",
  participacao: "Participação",
  outro: "Outro",
};

export interface Assessment {
  id: string;
  disciplineId: string;
  classId: string;
  schoolYear: number;
  term: AssessmentTerm;
  name: string;
  order: number;
  /** Peso na média ponderada da disciplina/bimestre. `undefined` ⇒ 1 (mesmo peso de todas as outras). */
  weight?: number;
  /** Valor máximo da avaliação (escala do lançamento). `undefined` ⇒ `GRADE_MAX` (10). */
  maxScore?: number;
  type?: AssessmentType;
  description?: string;
  /** Data da avaliação, formato ISO (YYYY-MM-DD). Opcional. */
  date?: string;
  createdAt: unknown; // Firestore Timestamp
  updatedAt: unknown; // Firestore Timestamp
}

/** Payload aceito pelo formulário de criação/edição de avaliação. */
export interface AssessmentInput {
  disciplineId: string;
  classId: string;
  schoolYear: number;
  term: AssessmentTerm;
  name: string;
  order: number;
  weight?: number;
  maxScore?: number;
  type?: AssessmentType;
  description?: string;
  date?: string;
}

/** Peso efetivo de uma avaliação — nunca leia `assessment.weight` diretamente. */
export function effectiveWeight(assessment: Pick<Assessment, "weight">): number {
  return assessment.weight && assessment.weight > 0 ? assessment.weight : 1;
}

/** Valor máximo efetivo de uma avaliação — nunca leia `assessment.maxScore` diretamente. */
export function effectiveMaxScore(assessment: Pick<Assessment, "maxScore">): number {
  return assessment.maxScore && assessment.maxScore > 0 ? assessment.maxScore : 10;
}
