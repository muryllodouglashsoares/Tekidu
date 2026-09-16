import { describe, expect, it } from "vitest";
import {
  calculateAverage,
  calculateEffectiveAcademicResult,
  calculateEffectiveAssessmentScore,
  calculateSituation,
  calculateWeightedAverage,
  deriveSituationFromAverage,
  resolveStudentAcademicResult,
  PASSING_THRESHOLD,
  RECOVERY_THRESHOLD,
} from "@/types/grade";
import type { Assessment } from "@/types/assessment";

/**
 * Testes unitários das funções puras de cálculo acadêmico (Tarefa 5,
 * Fase 1 pós-auditoria V8). Nenhum destes testes toca Firebase/
 * Firestore — são funções sem I/O, testadas isoladamente com os casos
 * de fronteira citados no prompt.
 */
describe("calculateAverage", () => {
  it("calcula a média aritmética simples ignorando null", () => {
    expect(calculateAverage([8, 6, 10])).toBe(8);
  });

  it("ignora notas não lançadas (null) no cálculo", () => {
    expect(calculateAverage([8, null, 6])).toBe(7);
  });

  it("retorna null quando o array de notas está vazio", () => {
    expect(calculateAverage([])).toBeNull();
  });

  it("retorna null quando todas as notas são null", () => {
    expect(calculateAverage([null, null, null])).toBeNull();
  });

  it("arredonda o resultado em até 2 casas decimais", () => {
    // 7 + 8 + 9 = 24 / 3 = 8 exato; usa um caso com dízima para checar arredondamento.
    expect(calculateAverage([7, 8, 8])).toBeCloseTo(7.67, 2);
  });
});

describe("calculateWeightedAverage", () => {
  it("calcula a média ponderada considerando os pesos", () => {
    // (8*3 + 5*1) / (3+1) = 29/4 = 7.25
    expect(calculateWeightedAverage([{ score: 8, weight: 3 }, { score: 5, weight: 1 }])).toBe(7.25);
  });

  it("equivale à média simples quando todos os pesos são 1", () => {
    const entries = [{ score: 8, weight: 1 }, { score: 6, weight: 1 }, { score: 10, weight: 1 }];
    expect(calculateWeightedAverage(entries)).toBe(calculateAverage(entries.map((e) => e.score)));
  });

  it("ignora avaliações com nota não lançada (score null)", () => {
    const entries = [{ score: 8, weight: 2 }, { score: null, weight: 5 }];
    expect(calculateWeightedAverage(entries)).toBe(8);
  });

  it("retorna null quando nenhuma nota foi lançada", () => {
    expect(calculateWeightedAverage([{ score: null, weight: 1 }, { score: null, weight: 2 }])).toBeNull();
  });

  it("trata peso zero como 0 na ponderação (não distribui igualmente)", () => {
    // peso 0 contribui 0 para o numerador e para o total de pesos.
    const entries = [{ score: 8, weight: 2 }, { score: 4, weight: 0 }];
    expect(calculateWeightedAverage(entries)).toBe(8);
  });

  it("trata peso negativo como 0 na ponderação, igual ao peso zero", () => {
    const entries = [{ score: 8, weight: 2 }, { score: 4, weight: -1 }];
    expect(calculateWeightedAverage(entries)).toBe(8);
  });

  it("cai para a média aritmética simples quando TODOS os pesos são zero/negativos", () => {
    const entries = [{ score: 8, weight: 0 }, { score: 4, weight: -3 }];
    expect(calculateWeightedAverage(entries)).toBe(calculateAverage([8, 4]));
    expect(calculateWeightedAverage(entries)).toBe(6);
  });
});

describe("calculateSituation", () => {
  it('retorna "no_grades" quando nenhuma nota foi lançada', () => {
    expect(calculateSituation([], 3)).toBe("no_grades");
    expect(calculateSituation([null, null], 2)).toBe("no_grades");
  });

  it('retorna "incomplete" quando há notas lançadas, mas menos que o total de avaliações do contexto', () => {
    expect(calculateSituation([8, null], 2)).toBe("incomplete");
  });

  it('retorna "approved" quando a média atinge o limiar de aprovação', () => {
    expect(calculateSituation([8, 7], 2)).toBe("approved");
  });

  it('retorna "recovery" quando a média está entre o limiar de recuperação e o de aprovação', () => {
    expect(calculateSituation([5, 3], 2)).toBe("recovery"); // média 4
  });

  it('retorna "failed" quando a média fica abaixo do limiar de recuperação', () => {
    expect(calculateSituation([2, 1], 2)).toBe("failed"); // média 1.5
  });

  it("respeita thresholds explícitos em vez dos padrões do sistema", () => {
    // Com um limiar de aprovação mais baixo (5), a mesma média 5.5 que
    // seria "recovery" no padrão passa a ser "approved".
    const thresholds = { passingAverage: 5, recoveryThreshold: 3 };
    expect(calculateSituation([6, 5], 2, thresholds)).toBe("approved");
  });
});

describe("deriveSituationFromAverage", () => {
  it('retorna "no_grades" quando a média é null', () => {
    expect(deriveSituationFromAverage(null)).toBe("no_grades");
  });

  it('retorna "approved" exatamente no limiar de aprovação (fronteira)', () => {
    expect(deriveSituationFromAverage(PASSING_THRESHOLD)).toBe("approved");
  });

  it('retorna "recovery" logo abaixo do limiar de aprovação (fronteira)', () => {
    expect(deriveSituationFromAverage(PASSING_THRESHOLD - 0.01)).toBe("recovery");
  });

  it('retorna "recovery" exatamente no limiar de recuperação (fronteira)', () => {
    expect(deriveSituationFromAverage(RECOVERY_THRESHOLD)).toBe("recovery");
  });

  it('retorna "failed" logo abaixo do limiar de recuperação (fronteira)', () => {
    expect(deriveSituationFromAverage(RECOVERY_THRESHOLD - 0.01)).toBe("failed");
  });

  it("respeita thresholds explícitos passados como parâmetro", () => {
    const thresholds = { passingAverage: 7, recoveryThreshold: 5 };
    expect(deriveSituationFromAverage(7, thresholds)).toBe("approved");
    expect(deriveSituationFromAverage(6.99, thresholds)).toBe("recovery");
    expect(deriveSituationFromAverage(5, thresholds)).toBe("recovery");
    expect(deriveSituationFromAverage(4.99, thresholds)).toBe("failed");
  });
});

/**
 * RECUPERAÇÕES E SEGUNDA CHAMADA (item 45 do briefing) — testes das
 * funções puras que resolvem nota efetiva sem jamais sobrescrever a
 * nota original (item 57: "o sistema calcula um resultado efetivo
 * separado do histórico bruto").
 */
describe("calculateEffectiveAssessmentScore", () => {
  it("usa a nota original quando não há segunda chamada lançada", () => {
    expect(calculateEffectiveAssessmentScore(8, null)).toBe(8);
  });

  it("a segunda chamada substitui a nota considerada quando lançada", () => {
    expect(calculateEffectiveAssessmentScore(null, 8)).toBe(8);
  });

  it("a segunda chamada prevalece mesmo quando existe nota original (aluno refez a prova)", () => {
    expect(calculateEffectiveAssessmentScore(4, 9)).toBe(9);
  });

  it("retorna null quando não há nota original nem segunda chamada", () => {
    expect(calculateEffectiveAssessmentScore(null, null)).toBeNull();
  });
});

describe("calculateEffectiveAcademicResult", () => {
  it("recuperação maior que o resultado original prevalece", () => {
    expect(calculateEffectiveAcademicResult(5, 7)).toBe(7);
  });

  it("resultado original maior que a recuperação prevalece (nunca há dupla penalização)", () => {
    expect(calculateEffectiveAcademicResult(7, 5)).toBe(7);
  });

  it("sem recuperação lançada, retorna o resultado original inalterado", () => {
    expect(calculateEffectiveAcademicResult(6, null)).toBe(6);
  });

  it("usa a nota de recuperação quando não havia resultado original", () => {
    expect(calculateEffectiveAcademicResult(null, 8)).toBe(8);
  });

  it("retorna null quando nem o original nem a recuperação existem", () => {
    expect(calculateEffectiveAcademicResult(null, null)).toBeNull();
  });

  it("respeita os limites da escala (0 e 10)", () => {
    expect(calculateEffectiveAcademicResult(0, 10)).toBe(10);
    expect(calculateEffectiveAcademicResult(10, 0)).toBe(10);
  });
});

describe("resolveStudentAcademicResult", () => {
  function makeAssessment(overrides: Partial<Assessment>): Assessment {
    return {
      id: "a",
      disciplineId: "disc-1",
      classId: "class-1",
      schoolYear: 2026,
      term: "1",
      name: "Prova",
      order: 0,
      createdAt: null,
      updatedAt: null,
      ...overrides,
    };
  }

  it("avaliação regular isolada: resultado efetivo é a própria nota", () => {
    const prova1 = makeAssessment({ id: "prova1", name: "Prova 1" });
    const result = resolveStudentAcademicResult([prova1], { prova1: 8 });
    expect(result.effectiveResult).toBe(8);
    expect(result.situation).toBe("approved");
    expect(result.assessments[0].originalScore).toBe(8);
    expect(result.assessments[0].effectiveScore).toBe(8);
  });

  it("recuperação com nota maior que a média eleva o resultado efetivo, preservando o histórico bruto", () => {
    // Exemplo do item 53 do briefing: Prova 1 (peso 2) = 4, Prova 2 (peso 1) = 6 → média 4,67; recuperação = 7.
    const prova1 = makeAssessment({ id: "prova1", name: "Prova 1", order: 0, weight: 2 });
    const prova2 = makeAssessment({ id: "prova2", name: "Prova 2", order: 1, weight: 1 });
    const recuperacao = makeAssessment({
      id: "rec1",
      name: "Recuperação — 1º Bimestre",
      order: 2,
      assessmentKind: "recovery",
      parentAssessmentId: "prova1",
    });
    const result = resolveStudentAcademicResult(
      [prova1, prova2, recuperacao],
      { prova1: 4, prova2: 6, rec1: 7 }
    );
    expect(result.baseAverage).toBeCloseTo(4.67, 2);
    expect(result.recoveryScore).toBe(7);
    expect(result.effectiveResult).toBe(7);
    // As notas originais continuam acessíveis no breakdown.
    expect(result.assessments.find((a) => a.assessment.id === "prova1")?.originalScore).toBe(4);
    expect(result.assessments.find((a) => a.assessment.id === "prova2")?.originalScore).toBe(6);
  });

  it("recuperação com nota menor que a média original não piora o resultado", () => {
    const prova1 = makeAssessment({ id: "prova1", name: "Prova 1" });
    const recuperacao = makeAssessment({
      id: "rec1",
      name: "Recuperação",
      order: 1,
      assessmentKind: "recovery",
      parentAssessmentId: "prova1",
    });
    const result = resolveStudentAcademicResult([prova1, recuperacao], { prova1: 7, rec1: 5 });
    expect(result.effectiveResult).toBe(7);
  });

  it("segunda chamada: aluno sem nota original passa a ter a nota da segunda chamada como resultado", () => {
    // Exemplo do item 54 do briefing.
    const prova1 = makeAssessment({ id: "prova1", name: "Prova 1" });
    const segundaChamada = makeAssessment({
      id: "sc1",
      name: "Segunda chamada — Prova 1",
      order: 1,
      assessmentKind: "second_call",
      parentAssessmentId: "prova1",
    });
    const result = resolveStudentAcademicResult([prova1, segundaChamada], { prova1: null, sc1: 7.5 });
    expect(result.effectiveResult).toBe(7.5);
    expect(result.assessments[0].originalScore).toBeNull();
    expect(result.assessments[0].secondCallScore).toBe(7.5);
    expect(result.assessments[0].effectiveScore).toBe(7.5);
  });

  it("segunda chamada com nota original: a nota original é preservada no histórico, mas não entra no cálculo", () => {
    const prova1 = makeAssessment({ id: "prova1", name: "Prova 1" });
    const segundaChamada = makeAssessment({
      id: "sc1",
      name: "Segunda chamada — Prova 1",
      order: 1,
      assessmentKind: "second_call",
      parentAssessmentId: "prova1",
    });
    const result = resolveStudentAcademicResult([prova1, segundaChamada], { prova1: 4, sc1: 7 });
    expect(result.assessments[0].originalScore).toBe(4);
    expect(result.assessments[0].effectiveScore).toBe(7);
    expect(result.effectiveResult).toBe(7);
  });

  it("nota null em ambas as avaliações regulares resulta em null (sem lançamentos)", () => {
    const prova1 = makeAssessment({ id: "prova1", name: "Prova 1" });
    const prova2 = makeAssessment({ id: "prova2", name: "Prova 2", order: 1 });
    const result = resolveStudentAcademicResult([prova1, prova2], { prova1: null, prova2: null });
    expect(result.effectiveResult).toBeNull();
    expect(result.situation).toBe("no_grades");
  });

  it("respeita os limites 0 e 10 na nota efetiva", () => {
    const prova1 = makeAssessment({ id: "prova1", name: "Prova 1" });
    const resultZero = resolveStudentAcademicResult([prova1], { prova1: 0 });
    expect(resultZero.effectiveResult).toBe(0);
    expect(resultZero.situation).toBe("failed");
    const resultMax = resolveStudentAcademicResult([prova1], { prova1: 10 });
    expect(resultMax.effectiveResult).toBe(10);
    expect(resultMax.situation).toBe("approved");
  });

  it("arredonda o resultado efetivo em até 2 casas decimais", () => {
    const prova1 = makeAssessment({ id: "prova1", name: "Prova 1", order: 0 });
    const prova2 = makeAssessment({ id: "prova2", name: "Prova 2", order: 1 });
    const prova3 = makeAssessment({ id: "prova3", name: "Prova 3", order: 2 });
    const result = resolveStudentAcademicResult([prova1, prova2, prova3], { prova1: 7, prova2: 8, prova3: 8 });
    expect(result.effectiveResult).toBeCloseTo(7.67, 2);
  });

  it("a nota efetiva de uma avaliação com segunda chamada entra corretamente no cálculo ponderado", () => {
    const prova1 = makeAssessment({ id: "prova1", name: "Prova 1", order: 0, weight: 3 });
    const prova2 = makeAssessment({ id: "prova2", name: "Prova 2", order: 1, weight: 1 });
    const segundaChamada = makeAssessment({
      id: "sc1",
      name: "Segunda chamada — Prova 1",
      order: 2,
      assessmentKind: "second_call",
      parentAssessmentId: "prova1",
    });
    // Sem segunda chamada lançada: (null*3 ignorado) + 6*1 → média = 6 (só Prova 2 conta).
    const withoutSecondCall = resolveStudentAcademicResult(
      [prova1, prova2, segundaChamada],
      { prova1: null, prova2: 6, sc1: null }
    );
    expect(withoutSecondCall.baseAverage).toBe(6);
    // Com segunda chamada = 9: (9*3 + 6*1) / 4 = 8.25, usando o MESMO
    // mecanismo de média ponderada já existente (calculateWeightedAverage).
    const withSecondCall = resolveStudentAcademicResult(
      [prova1, prova2, segundaChamada],
      { prova1: null, prova2: 6, sc1: 9 }
    );
    expect(withSecondCall.baseAverage).toBe(8.25);
  });

  it('situação "incomplete" considera apenas avaliações regulares — recuperação/segunda chamada sem nota não conta', () => {
    const prova1 = makeAssessment({ id: "prova1", name: "Prova 1", order: 0 });
    const prova2 = makeAssessment({ id: "prova2", name: "Prova 2", order: 1 });
    const recuperacao = makeAssessment({
      id: "rec1",
      name: "Recuperação",
      order: 2,
      assessmentKind: "recovery",
      parentAssessmentId: "prova1",
    });
    // As duas avaliações regulares têm nota — não deve ser "incomplete"
    // mesmo com a recuperação sem nota lançada (item 35 do briefing).
    const result = resolveStudentAcademicResult(
      [prova1, prova2, recuperacao],
      { prova1: 8, prova2: 7, rec1: null }
    );
    expect(result.situation).not.toBe("incomplete");
  });

  it('situação "incomplete" quando uma avaliação regular ainda não tem nota', () => {
    const prova1 = makeAssessment({ id: "prova1", name: "Prova 1", order: 0 });
    const prova2 = makeAssessment({ id: "prova2", name: "Prova 2", order: 1 });
    const result = resolveStudentAcademicResult([prova1, prova2], { prova1: 8, prova2: null });
    expect(result.situation).toBe("incomplete");
  });

  it("situação approved/recovery/failed usando os thresholds configuráveis, considerando a recuperação", () => {
    const prova1 = makeAssessment({ id: "prova1", name: "Prova 1" });
    const recuperacao = makeAssessment({
      id: "rec1",
      name: "Recuperação",
      order: 1,
      assessmentKind: "recovery",
      parentAssessmentId: "prova1",
    });
    const thresholds = { passingAverage: 7, recoveryThreshold: 5 };
    expect(
      resolveStudentAcademicResult([prova1, recuperacao], { prova1: 3, rec1: 8 }, thresholds).situation
    ).toBe("approved");
    expect(
      resolveStudentAcademicResult([prova1, recuperacao], { prova1: 3, rec1: 5 }, thresholds).situation
    ).toBe("recovery");
    expect(
      resolveStudentAcademicResult([prova1, recuperacao], { prova1: 3, rec1: 4 }, thresholds).situation
    ).toBe("failed");
  });
});
