import { describe, expect, it } from "vitest";
import {
  calculateAverage,
  calculateSituation,
  calculateWeightedAverage,
  deriveSituationFromAverage,
  PASSING_THRESHOLD,
  RECOVERY_THRESHOLD,
} from "@/types/grade";

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
