/**
 * Helpers puros de formatação/nomenclatura usados pela camada de
 * exportação (PDF + Excel) de Relatórios e Frequência.
 *
 * Mantidos sem nenhuma dependência de `@react-pdf/renderer` ou
 * `exceljs` para continuarem 100% testáveis em Node (mesmo padrão dos
 * demais arquivos `types/*.ts` cobertos por `*.test.ts`, ver
 * `vitest.config.ts`: ambiente `node`, sem DOM).
 */

/** Remove acentos/caracteres especiais para um nome de arquivo seguro em qualquer SO. */
export function sanitizeFileNamePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Monta um nome de arquivo descritivo a partir do contexto/filtros
 * atuais da tela (item 12 do briefing), sempre prefixado com
 * "tekidu-" — ex.: `tekidu-relatorio-2ano-a-informatica-2bimestre-2026`.
 * Partes vazias/undefined são ignoradas silenciosamente.
 */
export function buildExportFileName(base: string, parts: Array<string | number | null | undefined>): string {
  const cleanParts = parts
    .filter((p): p is string | number => p !== null && p !== undefined && String(p).trim() !== "")
    .map((p) => sanitizeFileNamePart(String(p)))
    .filter(Boolean);
  return cleanParts.length > 0
    ? `tekidu-${sanitizeFileNamePart(base)}-${cleanParts.join("-")}`
    : `tekidu-${sanitizeFileNamePart(base)}`;
}

/** Formata uma média/nota (escala 0–10) no padrão brasileiro: "8,5". `null` vira "—". */
export function formatExportNumber(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(decimals).replace(".", ",");
}

/** Formata um percentual de frequência: "92,5%". `null` vira "—" (nunca "0%" para ausência de dados). */
export function formatExportPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const rounded = Number.isInteger(value) ? value : Math.round(value * 10) / 10;
  return `${String(rounded).replace(".", ",")}%`;
}

/** Converte uma dateKey "yyyy-mm-dd" (mesmo formato usado por `AttendanceSession.date`) para "dd/mm/aaaa". */
export function formatExportDateKey(dateKey: string | null | undefined): string {
  if (!dateKey) return "—";
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) return dateKey;
  return `${day}/${month}/${year}`;
}

/** Data/hora de geração do documento, no padrão pt-BR ("11/09/2026 14:30"). */
export function formatExportDateTime(date: Date): string {
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
