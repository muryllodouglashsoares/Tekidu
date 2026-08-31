import { AlertTriangle, Building2, CalendarDays, GraduationCap, Megaphone } from "lucide-react";
import { ANNOUNCEMENT_CATEGORY_LABELS, type AnnouncementCategory } from "@/types/announcement";

const ICONS: Record<AnnouncementCategory, typeof Megaphone> = {
  general: Megaphone,
  academic: GraduationCap,
  administrative: Building2,
  event: CalendarDays,
  urgent: AlertTriangle,
};

// Neutro por padrão (identidade do Tekidu — ver DESIGN_TOKENS.md):
// só "urgent" usa vermelho pontual, o resto se distingue por ÍCONE,
// não por uma paleta de cores própria por categoria.
const STYLES: Record<AnnouncementCategory, string> = {
  general: "bg-ink-100 text-ink-600",
  academic: "bg-ink-100 text-ink-600",
  administrative: "bg-ink-100 text-ink-600",
  event: "bg-ink-100 text-ink-600",
  urgent: "bg-danger/10 text-danger",
};

export function AnnouncementCategoryBadge({ category }: { category: AnnouncementCategory }) {
  const Icon = ICONS[category];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[category]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {ANNOUNCEMENT_CATEGORY_LABELS[category]}
    </span>
  );
}
