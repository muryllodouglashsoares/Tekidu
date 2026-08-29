import {
  ClipboardCheck,
  FileText,
  CheckSquare,
  Users,
  PartyPopper,
  Hourglass,
  Tag,
  type LucideIcon,
} from "lucide-react";
import type { AcademicEventCategory } from "@/types/academicEvent";

/**
 * Ícone por categoria — combinado com a cor em `ACADEMIC_EVENT_CATEGORY_META`
 * para diferenciar categorias que compartilham a mesma cor (paleta do
 * Tekidu tem só 3 matizes reais, ver comentário em `types/academicEvent.ts`).
 */
export const ACADEMIC_EVENT_ICON: Record<AcademicEventCategory, LucideIcon> = {
  prova: ClipboardCheck,
  trabalho: FileText,
  atividade: CheckSquare,
  evento: Users,
  feriado: PartyPopper,
  prazo: Hourglass,
  outro: Tag,
};
