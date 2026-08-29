import type { AcademicEvent } from "@/types/academicEvent";
import { ACADEMIC_EVENT_CATEGORY_META } from "@/types/academicEvent";
import {
  WEEKDAY_LABELS_FULL,
  WEEKDAY_LABELS_SHORT,
  buildMonthMatrix,
  toDateKey,
} from "@/utils/calendarDate";

interface CalendarGridProps {
  visibleMonth: Date;
  eventsByDate: Map<string, AcademicEvent[]>;
  selectedDate: string;
  todayKey: string;
  onSelectDate: (dateKey: string) => void;
}

const MAX_VISIBLE_CHIPS = 3;

/**
 * Grid mensal completo (desktop e mobile): cada célula mostra o número
 * do dia, um destaque para "hoje" e para o dia selecionado, e até
 * `MAX_VISIBLE_CHIPS` eventos (com "+N" para o restante) — o suficiente
 * para identificar rapidamente o que existe no dia sem abrir nada,
 * conforme o objetivo de "leitura rápida" do briefing.
 */
export function CalendarGrid({
  visibleMonth,
  eventsByDate,
  selectedDate,
  todayKey,
  onSelectDate,
}: CalendarGridProps) {
  const weeks = buildMonthMatrix(visibleMonth);

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 border-b border-line pb-2">
        {WEEKDAY_LABELS_SHORT.map((label, i) => (
          <span
            key={`${label}-${i}`}
            aria-hidden="true"
            className="text-center text-xs font-semibold uppercase tracking-wide text-ink-400"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-line border-x border-b border-line">
        {weeks.flatMap((week, weekIndex) =>
          week.map((date, dayIndex) => {
            if (!date) {
              return <div key={`${weekIndex}-${dayIndex}`} className="min-h-[92px] bg-paper/40 sm:min-h-[112px]" />;
            }

            const dateKey = toDateKey(date);
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDate;
            const dayEvents = eventsByDate.get(dateKey) ?? [];
            const overflowCount = dayEvents.length - MAX_VISIBLE_CHIPS;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => onSelectDate(dateKey)}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${WEEKDAY_LABELS_FULL[date.getDay()]}, ${date.getDate()}${
                  dayEvents.length ? ` — ${dayEvents.length} evento(s)` : ""
                }`}
                className={`flex min-h-[92px] flex-col items-stretch gap-1 p-1.5 text-left transition-colors sm:min-h-[112px] sm:p-2 ${
                  isSelected ? "bg-ink-50" : "bg-surface hover:bg-ink-50/60"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday
                      ? "bg-ink-700 text-white"
                      : isSelected
                        ? "bg-ink900 text-white"
                        : "text-ink-600"
                  }`}
                >
                  {date.getDate()}
                </span>

                <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                  {dayEvents.slice(0, MAX_VISIBLE_CHIPS).map((event) => {
                    const meta = ACADEMIC_EVENT_CATEGORY_META[event.category];
                    return (
                      <span
                        key={event.id}
                        className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${meta.badgeClassName}`}
                        title={event.title}
                      >
                        {event.title}
                      </span>
                    );
                  })}
                  {overflowCount > 0 && (
                    <span className="text-[10px] font-medium text-ink-400">+{overflowCount} mais</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
