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
 */
export interface Assessment {
  id: string;
  disciplineId: string;
  classId: string;
  schoolYear: number;
  term: AssessmentTerm;
  name: string;
  order: number;
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
}
