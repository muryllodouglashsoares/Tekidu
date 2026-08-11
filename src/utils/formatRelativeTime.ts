import { Timestamp } from "firebase/firestore";

/**
 * Formata um Firestore Timestamp (ou valor compatível) como tempo
 * relativo em português ("há 3 horas", "ontem, 14h22", "há 2 dias").
 * Retorna null quando o valor ainda não foi resolvido pelo servidor
 * (acontece brevemente logo após um `serverTimestamp()` pendente).
 */
export function formatRelativeTime(value: unknown): string | null {
  if (!(value instanceof Timestamp)) return null;
  const date = value.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} minuto${diffMin === 1 ? "" : "s"}`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours} hora${diffHours === 1 ? "" : "s"}`;

  const isYesterday =
    now.getDate() - date.getDate() === 1 &&
    now.getMonth() === date.getMonth() &&
    now.getFullYear() === date.getFullYear();
  if (isYesterday) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `ontem, ${hh}h${mm}`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `há ${diffDays} dia${diffDays === 1 ? "" : "s"}`;
}
