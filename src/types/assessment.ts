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

/**
 * Natureza de uma avaliação quantitativa (RECUPERAÇÕES E SEGUNDA
 * CHAMADA, item 5 do briefing).
 *
 * - `regular`: avaliação comum, a única natureza que existia antes
 *   desta funcionalidade. Também o valor assumido por qualquer
 *   avaliação antiga sem o campo `assessmentKind` gravado — ver
 *   `effectiveAssessmentKind` (item 42, "migração": nenhum documento
 *   antigo precisa ser reescrito).
 * - `second_call`: nova oportunidade para um aluno que não realizou
 *   UMA avaliação regular específica (`parentAssessmentId` aponta para
 *   ela). Quando lançada, a nota de segunda chamada passa a ser a nota
 *   CONSIDERADA daquela avaliação específica no cálculo da média — a
 *   nota original nunca é sobrescrita (ver `calculateEffectiveAssessmentScore`
 *   em `types/grade.ts`).
 * - `recovery`: avaliação complementar de recuperação de desempenho de
 *   um contexto (disciplina + turma + bimestre). `parentAssessmentId`
 *   aponta para uma avaliação regular do MESMO contexto (usada apenas
 *   como âncora de vínculo/validação — ver item 30 do briefing — e de
 *   agrupamento na interface, item 37); o efeito no cálculo não é por
 *   avaliação, e sim sobre o RESULTADO final do contexto (ver
 *   `calculateEffectiveAcademicResult`, `types/grade.ts`).
 */
export type AssessmentKind = "regular" | "recovery" | "second_call";

export const ASSESSMENT_KIND_LABEL: Record<AssessmentKind, string> = {
  regular: "Regular",
  recovery: "Recuperação",
  second_call: "Segunda chamada",
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
  /**
   * Natureza da avaliação. `undefined` em documentos antigos ⇒
   * `"regular"` (nunca leia este campo diretamente — use
   * `effectiveAssessmentKind`).
   */
  assessmentKind?: AssessmentKind;
  /**
   * Avaliação regular de origem, presente apenas quando
   * `assessmentKind` é `"recovery"` ou `"second_call"`. `undefined`
   * para avaliações regulares.
   */
  parentAssessmentId?: string;
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
  assessmentKind?: AssessmentKind;
  parentAssessmentId?: string;
}

/** Peso efetivo de uma avaliação — nunca leia `assessment.weight` diretamente. */
export function effectiveWeight(assessment: Pick<Assessment, "weight">): number {
  return assessment.weight && assessment.weight > 0 ? assessment.weight : 1;
}

/** Valor máximo efetivo de uma avaliação — nunca leia `assessment.maxScore` diretamente. */
export function effectiveMaxScore(assessment: Pick<Assessment, "maxScore">): number {
  return assessment.maxScore && assessment.maxScore > 0 ? assessment.maxScore : 10;
}

/** Natureza efetiva de uma avaliação — nunca leia `assessment.assessmentKind` diretamente (item 42: retrocompatibilidade). */
export function effectiveAssessmentKind(assessment: Pick<Assessment, "assessmentKind">): AssessmentKind {
  return assessment.assessmentKind ?? "regular";
}

/** `true` para avaliações de recuperação ou segunda chamada (o oposto de uma avaliação regular). */
export function isSpecialAssessment(assessment: Pick<Assessment, "assessmentKind">): boolean {
  return effectiveAssessmentKind(assessment) !== "regular";
}

/**
 * Uma avaliação regular agrupada com sua segunda chamada e suas
 * recuperações vinculadas (item 37 do briefing — "exibição
 * hierárquica"). Usada pela tabela de Notas e pelo gerenciador de
 * avaliações para renderizar o vínculo pai/filho sem duplicar a lógica
 * de agrupamento em cada componente.
 */
export interface AssessmentGroup {
  regular: Assessment;
  secondCall: Assessment | null;
  recoveries: Assessment[];
}

/**
 * Agrupa uma lista de avaliações de um mesmo contexto (disciplina +
 * turma + bimestre) em avaliações regulares + suas avaliações
 * especiais vinculadas, ordenadas por `order`. Avaliações especiais
 * "órfãs" (item 55 — avaliação pai inexistente/excluída) não aparecem
 * em nenhum grupo; ver `getOrphanSpecialAssessments` para localizá-las
 * quando necessário (ex.: uma tela de manutenção/auditoria).
 */
export function groupAssessments(assessments: Assessment[]): AssessmentGroup[] {
  const regulars = assessments
    .filter((a) => effectiveAssessmentKind(a) === "regular")
    .slice()
    .sort((a, b) => a.order - b.order);
  const specials = assessments.filter((a) => effectiveAssessmentKind(a) !== "regular");

  return regulars.map((regular) => ({
    regular,
    secondCall:
      specials.find(
        (s) => effectiveAssessmentKind(s) === "second_call" && s.parentAssessmentId === regular.id
      ) ?? null,
    recoveries: specials.filter(
      (s) => effectiveAssessmentKind(s) === "recovery" && s.parentAssessmentId === regular.id
    ),
  }));
}

/** Avaliações especiais cujo `parentAssessmentId` não aponta para nenhuma avaliação regular presente na lista (item 55, edge case 1). */
export function getOrphanSpecialAssessments(assessments: Assessment[]): Assessment[] {
  const regularIds = new Set(
    assessments.filter((a) => effectiveAssessmentKind(a) === "regular").map((a) => a.id)
  );
  return assessments.filter(
    (a) => effectiveAssessmentKind(a) !== "regular" && !regularIds.has(a.parentAssessmentId ?? "")
  );
}

/** Todas as avaliações especiais (recuperação + segunda chamada) vinculadas a uma avaliação regular específica. */
export function getDependentAssessments(assessments: Assessment[], parentAssessmentId: string): Assessment[] {
  return assessments.filter(
    (a) => effectiveAssessmentKind(a) !== "regular" && a.parentAssessmentId === parentAssessmentId
  );
}
