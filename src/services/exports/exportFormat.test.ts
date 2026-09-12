import { describe, expect, it } from "vitest";
import {
  buildExportFileName,
  formatExportDateKey,
  formatExportNumber,
  formatExportPercentage,
  sanitizeFileNamePart,
} from "@/services/exports/exportFormat";

describe("sanitizeFileNamePart", () => {
  it("remove acentos e caracteres especiais", () => {
    expect(sanitizeFileNamePart("2º Ano A")).toBe("2-ano-a");
  });

  it("converte espaços múltiplos em um único hífen", () => {
    expect(sanitizeFileNamePart("Educação   Física")).toBe("educacao-fisica");
  });

  it("remove hífens nas extremidades", () => {
    expect(sanitizeFileNamePart("--Informática--")).toBe("informatica");
  });
});

describe("buildExportFileName", () => {
  it("monta o nome combinando base + partes válidas", () => {
    expect(buildExportFileName("relatorio", ["2º Ano A", "Informática", "2026"])).toBe(
      "tekidu-relatorio-2-ano-a-informatica-2026"
    );
  });

  it("ignora partes vazias, nulas ou indefinidas", () => {
    expect(buildExportFileName("frequencia", [undefined, "", null, "2026"])).toBe("tekidu-frequencia-2026");
  });

  it("retorna só o prefixo quando não há nenhuma parte válida", () => {
    expect(buildExportFileName("relatorio", [undefined, null, ""])).toBe("tekidu-relatorio");
  });
});

describe("formatExportNumber", () => {
  it("formata no padrão brasileiro (vírgula)", () => {
    expect(formatExportNumber(8.5)).toBe("8,5");
  });

  it("retorna travessão para null", () => {
    expect(formatExportNumber(null)).toBe("—");
  });

  it("retorna travessão para undefined", () => {
    expect(formatExportNumber(undefined)).toBe("—");
  });
});

describe("formatExportPercentage", () => {
  it("formata percentual inteiro sem casas decimais desnecessárias", () => {
    expect(formatExportPercentage(90)).toBe("90%");
  });

  it("formata percentual com uma casa decimal", () => {
    expect(formatExportPercentage(92.5)).toBe("92,5%");
  });

  it("nunca transforma ausência de dados em 0%", () => {
    expect(formatExportPercentage(null)).toBe("—");
  });
});

describe("formatExportDateKey", () => {
  it("converte yyyy-mm-dd para dd/mm/aaaa", () => {
    expect(formatExportDateKey("2026-09-11")).toBe("11/09/2026");
  });

  it("retorna travessão para valor vazio", () => {
    expect(formatExportDateKey(null)).toBe("—");
    expect(formatExportDateKey(undefined)).toBe("—");
    expect(formatExportDateKey("")).toBe("—");
  });
});
