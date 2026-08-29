import { Clock, Pencil, Trash2 } from "lucide-react";
import { ACADEMIC_EVENT_CATEGORY_META, type AcademicEvent } from "@/types/academicEvent";
import { ACADEMIC_EVENT_ICON } from "@/components/calendar/categoryIcons";
import { formatRelativeDayLabel } from "@/utils/calendarDate";

interface EventCardProps {
  event: AcademicEvent;
  /** Mostra o rótulo de proximidade ("Hoje", "Em 3 dias"...) — usado na lista de próximos eventos. */
  showDateLabel?: boolean;
  onEdit?: (event: AcademicEvent) => void;
  onDelete?: (event: AcademicEvent) => void;
}

export function EventCard({ event, showDateLabel, onEdit, onDelete }: EventCardProps) {
  const meta = ACADEMIC_EVENT_CATEGORY_META[event.category];
  const Icon = ACADEMIC_EVENT_ICON[event.category];

  return (
    <div className="group flex items-start gap-3 rounded-card border border-line bg-surface p-3.5 transition-colors hover:border-ink-200">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-card ${meta.badgeClassName}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-ink900">{event.title}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.badgeClassName}`}>
            {meta.label}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
          {showDateLabel && <span className="font-medium text-ink-600">{formatRelativeDayLabel(event.date)}</span>}
          {(event.startTime || event.endTime) && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {event.startTime ?? "—"}
              {event.endTime ? ` – ${event.endTime}` : ""}
            </span>
          )}
        </div>

        {event.description && (
          <p className="mt-1.5 line-clamp-2 text-xs text-ink-500">{event.description}</p>
        )}
      </div>

      {(onEdit || onDelete) && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(event)}
              aria-label={`Editar ${event.title}`}
              className="rounded-full p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(event)}
              aria-label={`Excluir ${event.title}`}
              className="rounded-full p-1.5 text-ink-400 hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
