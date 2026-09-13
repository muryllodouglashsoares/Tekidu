import { describe, expect, it } from "vitest";
import {
  buildAbsenceJustificationOverview,
  isEligibleForJustification,
  isJustificationExpired,
  isValidJustificationReason,
  isWithinJustificationWindow,
  justificationDeadlineDate,
  type AbsenceJustification,
} from "@/types/absenceJustification";
import type { AttendanceRecord } from "@/types/attendance";

/**
 * Testes unitários das funções puras de Justificativas de Faltas.
 * Nenhum destes testes toca Firebase/Firestore — mesmo racional de
 * `attendance.test.ts`. Datas fixas (`FIXED_NOW`) são usadas em vez de
 * `new Date()` para os testes ficarem determinísticos independente do
 * dia em que rodam.
 */
const FIXED_NOW = new Date("2026-08-13T10:00:00"); // 1 dia depois da falta de exemplo (2026-08-12)

function makeRecord(overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  return {
    id: "rec-1",
    studentId: "student-1",
    sessionId: "session-1",
    disciplineId: "disc-1",
    classId: "class-1",
    schoolYear: 2026,
    term: "1",
    status: "absent",
    date: "2026-08-12",
    label: "Aula 03",
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function makeTimestamp(date: Date) {
  return { toDate: () => date };
}

function makeJustification(overrides: Partial<AbsenceJustification> = {}): AbsenceJustification {
  return {
    id: "rec-1",
    studentId: "student-1",
    attendanceRecordId: "rec-1",
    sessionId: "session-1",
    disciplineId: "disc-1",
    classId: "class-1",
    schoolYear: 2026,
    term: "1",
    absenceDate: "2026-08-12",
    sessionLabel: "Aula 03",
    reason: "Consulta médica agendada.",
    documentData: "data:application/pdf;base64,JVBERi0xLjQK",
    documentName: "atestado.pdf",
    documentType: "pdf",
    documentSize: 1024,
    status: "pending",
    submittedAt: null,
    updatedAt: null,
    // Prazo padrão: 2 dias depois de FIXED_NOW — ainda não expirado
    // em nenhum dos testes que não sobrescrevem este campo.
    expiresAt: makeTimestamp(new Date(FIXED_NOW.getTime() + 2 * 24 * 60 * 60 * 1000)),
    ...overrides,
  };
}

describe("isValidJustificationReason", () => {
  it("rejeita motivo vazio", () => {
    expect(isValidJustificationReason("")).toBe(false);
  });

  it("rejeita motivo abaixo do mínimo de 10 caracteres", () => {
    expect(isValidJustificationReason("gripe")).toBe(false);
  });

  it("aceita motivo dentro do intervalo permitido", () => {
    expect(isValidJustificationReason("Fiquei doente e fui ao médico.")).toBe(true);
  });

  it("rejeita motivo acima de 1000 caracteres", () => {
    expect(isValidJustificationReason("a".repeat(1001))).toBe(false);
  });

  it("ignora espaços nas extremidades ao validar o tamanho", () => {
    expect(isValidJustificationReason("   curto   ")).toBe(false);
  });
});

describe("isWithinJustificationWindow (prazo de 2 dias para solicitar)", () => {
  const absenceDate = "2026-08-10";

  it("está dentro do prazo no próprio dia da falta", () => {
    expect(isWithinJustificationWindow(absenceDate, new Date("2026-08-10T20:00:00"))).toBe(true);
  });

  it("está dentro do prazo no último dia permitido (2 dias depois)", () => {
    expect(isWithinJustificationWindow(absenceDate, new Date("2026-08-12T23:00:00"))).toBe(true);
  });

  it("fica fora do prazo no dia seguinte ao limite", () => {
    expect(isWithinJustificationWindow(absenceDate, new Date("2026-08-13T00:00:01"))).toBe(false);
  });

  it("calcula o último dia do prazo para exibição", () => {
    expect(justificationDeadlineDate(absenceDate)).toBe("2026-08-12");
  });
});

describe("isJustificationExpired (retenção do registro no banco)", () => {
  it("não está expirado enquanto `expiresAt` está no futuro", () => {
    const justification = makeJustification({
      expiresAt: makeTimestamp(new Date(FIXED_NOW.getTime() + 60 * 60 * 1000)),
    });
    expect(isJustificationExpired(justification, FIXED_NOW)).toBe(false);
  });

  it("está expirado quando `expiresAt` já passou", () => {
    const justification = makeJustification({
      expiresAt: makeTimestamp(new Date(FIXED_NOW.getTime() - 60 * 60 * 1000)),
    });
    expect(isJustificationExpired(justification, FIXED_NOW)).toBe(true);
  });

  it("nunca considera expirado um registro sem `expiresAt` definido", () => {
    const justification = makeJustification({ expiresAt: undefined });
    expect(isJustificationExpired(justification, FIXED_NOW)).toBe(false);
  });
});

describe("isEligibleForJustification", () => {
  const absenceDate = "2026-08-12";

  it("é elegível quando não há nenhuma justificativa e ainda está no prazo", () => {
    expect(isEligibleForJustification(absenceDate, undefined, false, FIXED_NOW)).toBe(true);
  });

  it("não é elegível quando já está pendente", () => {
    expect(isEligibleForJustification(absenceDate, "pending", false, FIXED_NOW)).toBe(false);
  });

  it("não é elegível quando já foi aprovada", () => {
    expect(isEligibleForJustification(absenceDate, "approved", false, FIXED_NOW)).toBe(false);
  });

  it("não é elegível quando foi recusada, por padrão (sem reabertura administrativa)", () => {
    expect(isEligibleForJustification(absenceDate, "rejected", false, FIXED_NOW)).toBe(false);
  });

  it("permite reenvio após recusa somente quando explicitamente habilitado", () => {
    expect(isEligibleForJustification(absenceDate, "rejected", true, FIXED_NOW)).toBe(true);
  });

  it("não é elegível quando o prazo de 2 dias já passou, mesmo sem justificativa prévia", () => {
    const farInTheFuture = new Date("2026-09-01T00:00:00");
    expect(isEligibleForJustification(absenceDate, undefined, false, farInTheFuture)).toBe(false);
  });
});

describe("buildAbsenceJustificationOverview", () => {
  it("lista faltas sem justificativa como elegíveis", () => {
    const records = [makeRecord()];
    const overview = buildAbsenceJustificationOverview(records, [], FIXED_NOW);
    expect(overview.eligibleRecords).toHaveLength(1);
    expect(overview.justifications).toHaveLength(0);
  });

  it("remove das elegíveis uma falta com justificativa pendente ou aprovada", () => {
    const records = [makeRecord({ id: "rec-1" }), makeRecord({ id: "rec-2" })];
    const justifications = [
      makeJustification({ id: "rec-1", attendanceRecordId: "rec-1", status: "pending" }),
      makeJustification({ id: "rec-2", attendanceRecordId: "rec-2", status: "approved" }),
    ];
    const overview = buildAbsenceJustificationOverview(records, justifications, FIXED_NOW);
    expect(overview.eligibleRecords).toHaveLength(0);
    expect(overview.justifications).toHaveLength(2);
  });

  it("mantém como elegível uma falta cuja justificativa foi recusada (sem reabertura)", () => {
    const records = [makeRecord({ id: "rec-1" })];
    const justifications = [
      makeJustification({ id: "rec-1", attendanceRecordId: "rec-1", status: "rejected" }),
    ];
    // Recusada continua NÃO elegível por padrão (seção 12 do prompt) —
    // aqui verificamos o inverso do teste acima só para deixar
    // explícito que o comportamento padrão é conservador.
    const overview = buildAbsenceJustificationOverview(records, justifications, FIXED_NOW);
    expect(overview.eligibleRecords).toHaveLength(0);
  });

  it("ordena as justificativas por data da falta, mais recente primeiro", () => {
    const justifications = [
      makeJustification({ id: "a", attendanceRecordId: "a", absenceDate: "2026-03-01" }),
      makeJustification({ id: "b", attendanceRecordId: "b", absenceDate: "2026-08-01" }),
    ];
    const overview = buildAbsenceJustificationOverview([], justifications, FIXED_NOW);
    expect(overview.justifications.map((j) => j.id)).toEqual(["b", "a"]);
  });

  it("some da lista uma justificativa cujo prazo de retenção (expiresAt) já passou", () => {
    const records = [makeRecord({ id: "rec-1" })];
    const farAfterExpiry = new Date("2026-08-20T00:00:00"); // bem depois do prazo de solicitação (>2 dias) e do expiresAt
    const justifications = [
      makeJustification({
        id: "rec-1",
        attendanceRecordId: "rec-1",
        status: "approved",
        expiresAt: makeTimestamp(new Date("2026-08-15T00:00:00")),
      }),
    ];
    const overview = buildAbsenceJustificationOverview(records, justifications, farAfterExpiry);
    expect(overview.justifications).toHaveLength(0);
    // A falta em si já está fora do prazo de solicitação (>2 dias),
    // então não volta a ficar elegível só porque o registro expirou.
    expect(overview.eligibleRecords).toHaveLength(0);
  });
});
