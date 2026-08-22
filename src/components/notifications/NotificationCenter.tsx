import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ClipboardList, BookOpen, UserPlus, Inbox } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getRecentNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from "@/services/notifications/notificationService";
import type { Notification, NotificationType } from "@/types/notification";

const ICON_BY_TYPE: Record<NotificationType, typeof Bell> = {
  grade_posted: ClipboardList,
  discipline_assigned: BookOpen,
  teacher_created: UserPlus,
};

function formatRelativeTime(value: unknown): string {
  const date = toDate(value);
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `há ${diffD}d`;
  return date.toLocaleDateString("pt-BR");
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

/**
 * Centro de notificações (Fase 5). Acessível pelo Header — ícone de
 * sino com contador de não lidas, painel com lista/estado vazio/
 * carregamento, marcar como lida (individual e em lote) e navegação
 * para o contexto relacionado via `notification.link`.
 *
 * Carrega sob demanda na primeira abertura (mesmo padrão de
 * `useCommandPaletteData`) — evita duas queries extras ao Firestore em
 * toda navegação só para um contador que a maioria das visitas nem vai
 * abrir.
 */
export function NotificationCenter() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const containerRef = useRef<HTMLDivElement>(null);

  // Contador de não lidas é buscado uma vez ao entrar no app (não só
  // quando o painel abre), para o sino já nascer com o número certo.
  useEffect(() => {
    if (!profile) return;
    getUnreadCount(profile.uid)
      .then(setUnreadCount)
      .catch(() => {
        /* contador é cosmético; falha aqui não deve gerar erro visível */
      });
  }, [profile]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function loadNotifications() {
    if (!profile) return;
    setStatus("loading");
    try {
      const [items, count] = await Promise.all([
        getRecentNotifications(profile.uid),
        getUnreadCount(profile.uid),
      ]);
      setNotifications(items);
      setUnreadCount(count);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      if (next) loadNotifications();
      return next;
    });
  }

  async function handleItemClick(notification: Notification) {
    if (!notification.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      markAsRead(notification.id).catch(() => {
        /* atualização otimista; uma falha aqui não trava a navegação */
      });
    }
    setOpen(false);
    if (notification.link) navigate(notification.link);
  }

  async function handleMarkAllAsRead() {
    if (!profile) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllAsRead(profile.uid);
    } catch {
      // Se falhar, a próxima abertura do painel corrige o estado.
    }
  }

  if (!profile) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ""}`}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink-500 shadow-sm transition-colors hover:text-ink-700"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificações"
          className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-card border border-line bg-surface shadow-card sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display text-sm font-semibold text-ink900">Notificações</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-700"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {status === "loading" && (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-3">
                    <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-ink-100" />
                    <div className="flex-1 space-y-1.5">
                      <span className="block h-3 w-3/4 animate-pulse rounded bg-ink-100" />
                      <span className="block h-3 w-1/2 animate-pulse rounded bg-ink-100" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {status === "error" && (
              <div className="p-6 text-center">
                <p className="text-sm text-ink-500">Não foi possível carregar as notificações.</p>
                <button
                  type="button"
                  onClick={loadNotifications}
                  className="mt-2 text-sm font-medium text-ink-700 hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {status === "ready" && notifications.length === 0 && (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <Inbox className="h-6 w-6 text-ink-300" />
                <p className="text-sm font-medium text-ink900">Nenhuma notificação</p>
                <p className="text-xs text-ink-500">Você será avisado aqui sobre novidades importantes.</p>
              </div>
            )}

            {status === "ready" &&
              notifications.map((notification) => {
                const Icon = ICON_BY_TYPE[notification.type] ?? Bell;
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleItemClick(notification)}
                    className={`flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-ink-50 ${
                      notification.read ? "" : "bg-ink-50/60"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-ink900">{notification.title}</span>
                        {!notification.read && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-700" aria-hidden="true" />
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">{notification.message}</span>
                      <span className="mt-1 block text-[11px] text-ink-400">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
