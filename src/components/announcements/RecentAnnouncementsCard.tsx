import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Megaphone } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAnnouncementsForRole,
  isAnnouncementExpired,
  sortAnnouncements,
} from "@/services/announcements/announcementService";
import type { Announcement } from "@/types/announcement";

const PREVIEW_COUNT = 3;

/**
 * Prévia leve de "Avisos recentes" para o Dashboard (seção 56 do
 * briefing): reaproveita `getAnnouncementsForRole` (mesma fonte de
 * dados/permissões do Portal completo) em vez de duplicar o Portal
 * inteiro aqui — mostra só os avisos mais relevantes (fixados >
 * urgentes > importantes > recentes) com um link para "/avisos".
 */
export function RecentAnnouncementsCard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Announcement[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!profile) return;
    getAnnouncementsForRole(profile)
      .then((list) => {
        if (cancelled) return;
        const visible = list.filter((a) => a.published && !isAnnouncementExpired(a));
        setItems(sortAnnouncements(visible).slice(0, PREVIEW_COUNT));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  return (
    <Card className="p-6 border-line shadow-sm bg-surface">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-ink900">Avisos recentes</h3>
        <div className="h-8 w-8 rounded-full bg-ink-50 flex items-center justify-center text-ink-500">
          <Megaphone className="h-4 w-4" />
        </div>
      </div>

      {items === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success/40" />
          <p className="text-sm font-medium text-ink-600">Nenhum aviso no momento.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate("/avisos")}
              className="text-left group"
            >
              <p className="text-sm font-medium text-ink900 line-clamp-1">{a.title}</p>
              <p className="mt-0.5 text-xs text-ink-500 line-clamp-1">{a.content}</p>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate("/avisos")}
        className="mt-5 flex w-full items-center justify-center gap-1 rounded-card border border-line py-2 text-xs font-medium text-ink-600 hover:bg-ink-50"
      >
        Ver todos
      </button>
    </Card>
  );
}
