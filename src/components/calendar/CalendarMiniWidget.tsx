import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useAcademicCalendar } from "@/hooks/useAcademicCalendar";
import {
  WEEKDAY_LABELS_SHORT,
  WEEKDAY_LABELS_FULL,
  buildMonthMatrix,
  formatMonthYear,
  toDateKey,
  todayKey,
} from "@/utils/calendarDate";

interface CalendarMiniWidgetProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Ativo quando a rota atual é "/calendario" — reaproveita o mesmo
   * destaque visual usado pelos demais itens da Sidebar (NavLink). */
  isRouteActive: boolean;
}

/**
 * Reproduz o bloco "CALENDÁRIO" do protótipo do Figma dentro da própria
 * Sidebar: cabeçalho colapsável + mini-mês com navegação e indicador de
 * "hoje"/dias com evento. Clicar em um dia (ou no cabeçalho) navega
 * para a experiência completa em "/calendario", com aquele dia
 * pré-selecionado — nunca abre uma navegação paralela.
 */
export function CalendarMiniWidget({
  collapsed,
  onToggleCollapsed,
  isRouteActive,
}: CalendarMiniWidgetProps) {
  const navigate = useNavigate();
  const { visibleMonth, eventsByDate, goToPreviousMonth, goToNextMonth } = useAcademicCalendar();

  const weeks = buildMonthMatrix(visibleMonth);
  const { month, year } = formatMonthYear(visibleMonth);
  const today = todayKey();

  function openDay(dateKey: string) {
    navigate(`/calendario?data=${dateKey}`);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-3 pb-1">
        <button
          type="button"
          onClick={() => navigate("/calendario")}
          className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${
            isRouteActive ? "text-ink-700" : "text-ink-400 hover:text-ink-600"
          }`}
        >
          Calendário
        </button>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expandir calendário" : "Recolher calendário"}
          aria-expanded={!collapsed}
          className="rounded-full p-1 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
        </button>
      </div>

      {!collapsed && (
        <div className="rounded-card px-2 pb-2">
          {/* Navegação de mês */}
          <div className="mb-2 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={goToPreviousMonth}
              aria-label="Mês anterior"
              className="rounded-full p-1 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm">
              <span className="font-display font-bold text-ink900">{month}</span>{" "}
              <span className="text-ink-400">{year}</span>
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              aria-label="Próximo mês"
              className="rounded-full p-1 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Dias da semana */}
          <div className="mb-1 grid grid-cols-7 text-center">
            {WEEKDAY_LABELS_SHORT.map((label, i) => (
              <span
                key={`${label}-${i}`}
                aria-hidden="true"
                className="text-[11px] font-medium text-ink-300"
              >
                {label}
              </span>
            ))}
          </div>

          {/* Grid de dias */}
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {weeks.flatMap((week, weekIndex) =>
              week.map((date, dayIndex) => {
                if (!date) return <span key={`${weekIndex}-${dayIndex}`} />;
                const dateKey = toDateKey(date);
                const isToday = dateKey === today;
                const hasEvents = (eventsByDate.get(dateKey)?.length ?? 0) > 0;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => openDay(dateKey)}
                    aria-label={`${WEEKDAY_LABELS_FULL[date.getDay()]}, ${date.getDate()} de ${month}${
                      hasEvents ? " — com eventos" : ""
                    }`}
                    className="flex flex-col items-center justify-center py-0.5"
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                        isToday
                          ? "bg-ink-700 text-white"
                          : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    <span
                      className={`mt-0.5 h-1 w-1 rounded-full ${
                        hasEvents ? (isToday ? "bg-white" : "bg-ink-700") : "bg-transparent"
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
