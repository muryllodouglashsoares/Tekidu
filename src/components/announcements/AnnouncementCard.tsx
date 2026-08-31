import { MoreHorizontal, Pin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { Announcement } from "@/types/announcement";
import { AnnouncementCategoryBadge } from "@/components/announcements/AnnouncementCategoryBadge";
import { AnnouncementPriorityBadge } from "@/components/announcements/AnnouncementPriorityBadge";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function formatDate(value: unknown): string {
  const date = toDate(value);
  return date ? date.toLocaleDateString("pt-BR") : "";
}

const AUTHOR_ROLE_LABEL: Record<Announcement["authorRole"], string> = {
  admin: "Administração",
  teacher: "Professor(a)",
};

export interface AnnouncementCardAction {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

interface AnnouncementCardProps {
  announcement: Announcement;
  onOpen: () => void;
  /** Ações contextuais (editar/publicar/excluir/fixar...) — omitido = sem menu (aluno). */
  actions?: AnnouncementCardAction[];
}

/**
 * Card compacto reutilizado tanto na listagem principal quanto na área
 * de destaque e no widget do Dashboard (seção 28 do briefing). O
 * conteúdo é truncado (line-clamp) para manter a leitura rápida — os
 * detalhes completos ficam em `AnnouncementDetailModal`.
 */
export function AnnouncementCard({ announcement, onOpen, actions }: AnnouncementCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  return (
    <Card className="relative p-4 transition-colors hover:border-ink-300">
      <button type="button" onClick={onOpen} className="flex w-full flex-col gap-2 text-left">
        <div className="flex flex-wrap items-center gap-2 pr-8">
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

        <h3 className="font-display text-base font-semibold text-ink900">{announcement.title}</h3>
        <p className="line-clamp-2 text-sm text-ink-500">{announcement.content}</p>

        <div className="mt-1 flex items-center gap-2 text-xs text-ink-400">
          <span className="font-medium text-ink-600">{announcement.createdByName}</span>
          <span aria-hidden="true">•</span>
          <span>{AUTHOR_ROLE_LABEL[announcement.authorRole]}</span>
          {Boolean(announcement.publishedAt || announcement.createdAt) && (
            <>
              <span aria-hidden="true">•</span>
              <span>{formatDate(announcement.publishedAt ?? announcement.createdAt)}</span>
            </>
          )}
        </div>
      </button>

      {actions && actions.length > 0 && (
        <div ref={menuRef} className="absolute right-3 top-3">
          <button
            type="button"
            aria-label="Ações do aviso"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-card p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-card border border-line bg-surface shadow-card">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    action.onClick();
                  }}
                  className={`block w-full px-3.5 py-2 text-left text-sm hover:bg-ink-50 ${
                    action.destructive ? "text-danger hover:bg-danger/10" : "text-ink-700"
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
