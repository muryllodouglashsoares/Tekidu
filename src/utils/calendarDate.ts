/**
 * Utilitários de data para o Calendário Acadêmico.
 *
 * IMPORTANTE: todo "dateKey" usado no calendário é uma string
 * "yyyy-mm-dd" derivada do horário LOCAL do navegador (nunca
 * `toISOString()`, que converte para UTC e pode "voltar um dia" para
 * quem está em fusos negativos, ex.: Brasil). Isso mantém "hoje" e o
 * dia selecionado sempre coerentes com o que o usuário vê no relógio.
 */

export const WEEKDAY_LABELS_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];
export const WEEKDAY_LABELS_FULL = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** Formata uma Date como "yyyy-mm-dd" usando os componentes LOCAIS (ver nota acima). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Reconstrói uma Date à meia-noite LOCAL a partir de uma dateKey "yyyy-mm-dd". */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfMonth(reference: Date): Date {
  return new Date(reference.getFullYear(), reference.getMonth(), 1);
}

export function endOfMonth(reference: Date): Date {
  return new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
}

export function addMonths(reference: Date, delta: number): Date {
  return new Date(reference.getFullYear(), reference.getMonth() + delta, 1);
}

export function formatMonthYear(reference: Date): { month: string; year: string } {
  return { month: MONTH_LABELS[reference.getMonth()], year: String(reference.getFullYear()) };
}

/**
 * Matriz de semanas do mês (linhas de 7 colunas, Domingo→Sábado).
 * Segue o modelo do Figma: dias fora do mês corrente ficam como `null`
 * (célula em branco), em vez de mostrar os dias do mês adjacente —
 * mantém o grid limpo e sem ambiguidade sobre "de qual mês é esse 30".
 */
export function buildMonthMatrix(reference: Date): Array<Array<Date | null>> {
  const first = startOfMonth(reference);
  const last = endOfMonth(reference);
  const totalDays = last.getDate();
  const leadingBlanks = first.getDay(); // 0 (Dom) .. 6 (Sáb)

  const cells: Array<Date | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => new Date(reference.getFullYear(), reference.getMonth(), i + 1)),
  ];
  // Completa a última semana com blanks para fechar múltiplos de 7.
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Array<Array<Date | null>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** "yyyy-mm-dd" do primeiro e último dia do mês de referência — usados nas queries do Firestore. */
export function monthRangeKeys(reference: Date): { start: string; end: string } {
  return { start: toDateKey(startOfMonth(reference)), end: toDateKey(endOfMonth(reference)) };
}

/** Data por extenso, ex.: "Sexta-feira, 29 de agosto de 2026". */
export function formatFullDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const weekday = WEEKDAY_LABELS_FULL[date.getDay()];
  const month = MONTH_LABELS[date.getMonth()].toLowerCase();
  return `${weekday}, ${date.getDate()} de ${month} de ${date.getFullYear()}`;
}

/** Data curta, ex.: "29 de agosto". */
export function formatShortDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const month = MONTH_LABELS[date.getMonth()].toLowerCase();
  return `${date.getDate()} de ${month}`;
}

/**
 * Rótulo de proximidade relativo a hoje ("Hoje", "Amanhã", "Em 5 dias",
 * "Ontem"...). Usado no painel de "próximos eventos" para responder
 * rapidamente "o que está acontecendo e o que está próximo".
 */
export function formatRelativeDayLabel(dateKey: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseDateKey(dateKey);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Amanhã";
  if (diffDays === -1) return "Ontem";
  if (diffDays > 1 && diffDays <= 7) return `Em ${diffDays} dias`;
  if (diffDays < -1 && diffDays >= -7) return `Há ${Math.abs(diffDays)} dias`;
  return formatShortDate(dateKey);
}
