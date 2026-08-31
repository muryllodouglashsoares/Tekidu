import { ANNOUNCEMENT_PRIORITY_LABELS, type AnnouncementPriority } from "@/types/announcement";

// Prioridade "normal" não recebe selo (ver seção 15 do briefing: "não
// transformar a página em um painel cheio de alertas") — apenas
// important/urgent ganham um indicador visual, com destaque crescente
// mas discreto.
const STYLES: Record<Exclude<AnnouncementPriority, "normal">, string> = {
  important: "bg-ink-100 text-ink-700",
  urgent: "bg-danger/10 text-danger",
};

export function AnnouncementPriorityBadge({ priority }: { priority: AnnouncementPriority }) {
  if (priority === "normal") return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${STYLES[priority]}`}
    >
      {ANNOUNCEMENT_PRIORITY_LABELS[priority]}
    </span>
  );
}
