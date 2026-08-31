import { CalendarClock, Pin } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AnnouncementCategoryBadge } from "@/components/announcements/AnnouncementCategoryBadge";
import { AnnouncementPriorityBadge } from "@/components/announcements/AnnouncementPriorityBadge";
import type { Announcement } from "@/types/announcement";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function formatDate(value: unknown): string {
  const date = toDate(value);
  return date
    ? date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "";
}

const AUTHOR_ROLE_LABEL: Record<Announcement["authorRole"], string> = {
  admin: "Administração",
  teacher: "Professor(a)",
};

interface AnnouncementDetailModalProps {
  announcement: Announcement;
  /** `true` quando o usuário logado pode editar ESTE aviso (admin, ou autor). */
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export function AnnouncementDetailModal({
  announcement,
  canEdit,
  onClose,
  onEdit,
}: AnnouncementDetailModalProps) {
  return (
    <Modal title="Detalhes do aviso" onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {announcement.pinned && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-700">
              <Pin className="h-3.5 w-3.5" aria-hidden="true" />
              Fixado
            </span>
          )}
          <AnnouncementCategoryBadge category={announcement.category} />
          <AnnouncementPriorityBadge priority={announcement.priority} />
          {!announcement.published && (
            <span className="inline-flex items-center rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-500">
              Rascunho
            </span>
          )}
        </div>

        <h2 className="font-display text-xl font-bold text-ink900">{announcement.title}</h2>

        <div className="flex flex-wrap items-center gap-3 text-sm text-ink-500">
          <span className="font-medium text-ink-700">{announcement.createdByName}</span>
          <span>{AUTHOR_ROLE_LABEL[announcement.authorRole]}</span>
          {Boolean(announcement.publishedAt || announcement.createdAt) && (
            <span>Publicado em {formatDate(announcement.publishedAt ?? announcement.createdAt)}</span>
          )}
        </div>

        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-700">
          {announcement.content}
        </p>

        {Boolean(announcement.expiresAt) && (
          <div className="flex items-center gap-2 rounded-card border border-line bg-paper px-3.5 py-2.5 text-sm text-ink-500">
            <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
            Válido até {formatDate(announcement.expiresAt)}
          </div>
        )}

        <div className="mt-1 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          {canEdit && <Button onClick={onEdit}>Editar aviso</Button>}
        </div>
      </div>
    </Modal>
  );
}
