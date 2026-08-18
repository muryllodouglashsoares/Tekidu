import { describe, expect, it } from "vitest";
import {
  ATTENDANCE_ATTENTION_THRESHOLD,
  ATTENDANCE_REGULAR_THRESHOLD,
  calculateAttendanceRate,
  calculateAttendanceStatus,
} from "@/types/attendance";

/**
 * Testes unitários das funções puras de cálculo de frequência
 * (Tarefa 5, Fase 1 pós-auditoria V8). Nenhum destes testes toca
 * Firebase/Firestore — são funções sem I/O.
 */
describe("calculateAttendanceRate", () => {
  it("calcula o percentual de presença com 1 casa decimal", () => {
    expect(calculateAttendanceRate(3, 4)).toBe(75);
  });

  it("arredonda dízimas para 1 casa decimal", () => {
    // 1/3 = 33.333...% -> 33.3
    expect(calculateAttendanceRate(1, 3)).toBeCloseTo(33.3, 1);
  });

  it("retorna null quando não há nenhum registro ainda (total 0)", () => {
    expect(calculateAttendanceRate(0, 0)).toBeNull();
  });

  it("retorna 0 quando há registros mas nenhuma presença", () => {
    expect(calculateAttendanceRate(0, 5)).toBe(0);
  });

  it("retorna 100 quando todas as aulas tiveram presença", () => {
    expect(calculateAttendanceRate(5, 5)).toBe(100);
  });
});

describe("calculateAttendanceStatus", () => {
  it("retorna null quando a taxa é null (sem registros)", () => {
    expect(calculateAttendanceStatus(null)).toBeNull();
  });

  it('retorna "regular" exatamente no limiar regular (fronteira)', () => {
    expect(calculateAttendanceStatus(ATTENDANCE_REGULAR_THRESHOLD)).toBe("regular");
  });

  it('retorna "attention" logo abaixo do limiar regular, mas acima/igual ao mínimo (fronteira)', () => {
    expect(calculateAttendanceStatus(ATTENDANCE_REGULAR_THRESHOLD - 0.1)).toBe("attention");
  });

  it('retorna "attention" exatamente no limiar mínimo padrão (fronteira)', () => {
    expect(calculateAttendanceStatus(ATTENDANCE_ATTENTION_THRESHOLD)).toBe("attention");
  });

  it('retorna "critical" logo abaixo do limiar mínimo padrão (fronteira)', () => {
    expect(calculateAttendanceStatus(ATTENDANCE_ATTENTION_THRESHOLD - 0.1)).toBe("critical");
  });

  it("respeita um minRate customizado (configuração por ano letivo) em vez do padrão", () => {
    const minRate = 60;
    expect(calculateAttendanceStatus(60, minRate)).toBe("attention"); // fronteira exata do minRate custom
    expect(calculateAttendanceStatus(59.9, minRate)).toBe("critical");
    expect(calculateAttendanceStatus(89.9, minRate)).toBe("attention"); // ainda abaixo do regular fixo (90)
  });

  it('retorna "critical" para taxa 0', () => {
    expect(calculateAttendanceStatus(0)).toBe("critical");
  });
});
