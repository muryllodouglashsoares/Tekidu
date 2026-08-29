/**
 * Formato do documento em: academicEvents/{eventId}
 *
 * Calendário Acadêmico — evento pessoal do usuário logado (Notas,
 * Frequência e Boletim já cobrem a visão de escola/turma; o calendário
 * cobre a linha do tempo INDIVIDUAL: "o que está acontecendo/próximo
 * para mim"). Por isso `ownerId` é sempre o `uid` de quem criou, e a
 * Security Rule (ver firestore.rules) só libera leitura/escrita ao
 * próprio dono — nenhum estudante enxerga o evento de outro.
 *
 * `disciplineId`/`classId` ficam previstos (opcionais) para a evolução
 * futura descrita no prompt (Turma → Disciplina → Evento), mas não são
 * usados por nenhuma tela nesta fase — não implementamos seletor de
 * turma/disciplina no formulário ainda, só reservamos o campo para não
 * exigir migração de dados quando isso for necessário.
 */
export type AcademicEventCategory =
  | "prova"
  | "trabalho"
  | "atividade"
  | "evento"
  | "feriado"
  | "prazo"
  | "outro";

export interface AcademicEventCategoryMeta {
  label: string;
  /** Classes Tailwind para o "pill"/badge (fundo + texto). */
  badgeClassName: string;
  /** Classe Tailwind para o indicador de ponto (dot) no grid do calendário. */
  dotClassName: string;
}

/**
 * Metadados visuais por categoria. A paleta do Tekidu tem só três
 * matizes reais (azul `ink-700`, verde `success`, vermelho `danger`/
 * `honors` — ver tailwind.config.js); `violet` é EXCLUSIVO da Landing
 * Page e não pode aparecer aqui. Por isso a diferenciação entre
 * categorias combina cor (por nível de urgência) + ícone (ver
 * `ACADEMIC_EVENT_ICON` em `components/calendar/categoryIcons.ts`),
 * em vez de uma cor exclusiva por categoria.
 */
export const ACADEMIC_EVENT_CATEGORY_META: Record<AcademicEventCategory, AcademicEventCategoryMeta> = {
  prova: {
    label: "Prova",
    badgeClassName: "bg-danger/10 text-danger",
    dotClassName: "bg-danger",
  },
  trabalho: {
    label: "Trabalho",
    badgeClassName: "bg-honors-100 text-honors-600",
    dotClassName: "bg-honors-500",
  },
  atividade: {
    label: "Atividade",
    badgeClassName: "bg-success/10 text-success-700",
    dotClassName: "bg-success",
  },
  evento: {
    label: "Evento acadêmico",
    badgeClassName: "bg-ink-700/10 text-ink-700",
    dotClassName: "bg-ink-700",
  },
  feriado: {
    label: "Feriado",
    badgeClassName: "bg-ink-100 text-ink-600",
    dotClassName: "bg-ink-400",
  },
  prazo: {
    label: "Prazo",
    badgeClassName: "bg-honors-100 text-honors-600",
    dotClassName: "bg-honors-500",
  },
  outro: {
    label: "Outro",
    badgeClassName: "bg-ink-100 text-ink-500",
    dotClassName: "bg-ink-300",
  },
};

export const ACADEMIC_EVENT_CATEGORY_OPTIONS: AcademicEventCategory[] = [
  "prova",
  "trabalho",
  "atividade",
  "evento",
  "prazo",
  "feriado",
  "outro",
];

export interface AcademicEvent {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  /** "yyyy-mm-dd", sempre horário local (ver utils/calendarDate.ts). */
  date: string;
  /** "HH:mm" — omitido (null) para eventos de dia inteiro. */
  startTime: string | null;
  endTime: string | null;
  category: AcademicEventCategory;
  /** Reservado para evolução futura (ver comentário acima) — não usado ainda. */
  disciplineId: string | null;
  classId: string | null;
  createdAt: unknown; // Firestore Timestamp
  updatedAt: unknown; // Firestore Timestamp
}

export interface AcademicEventInput {
  title: string;
  description: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  category: AcademicEventCategory;
  disciplineId?: string | null;
  classId?: string | null;
}

/**
 * Validação de formulário (mesmo espírito de `ClassFormModal`/
 * `StudentFormModal`: validação manual simples, já que o projeto não
 * usa React Hook Form/Zod). Retorna a primeira mensagem de erro
 * encontrada, ou `null` quando o input é válido.
 */
export function validateAcademicEventInput(input: AcademicEventInput): string | null {
  if (!input.title.trim()) return "Informe um título para o evento.";
  if (input.title.trim().length > 120) return "O título pode ter no máximo 120 caracteres.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return "Selecione uma data válida.";
  if (input.startTime && !/^\d{2}:\d{2}$/.test(input.startTime)) return "Informe um horário de início válido.";
  if (input.endTime && !/^\d{2}:\d{2}$/.test(input.endTime)) return "Informe um horário de término válido.";
  if (input.startTime && input.endTime && input.endTime < input.startTime) {
    return "O horário de término deve ser depois do horário de início.";
  }
  if (input.description.length > 500) return "A descrição pode ter no máximo 500 caracteres.";
  return null;
}
