import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/layout/EmptyState";
import { ErrorState } from "@/components/layout/ErrorState";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { EventCard } from "@/components/calendar/EventCard";
import { EventDialog } from "@/components/calendar/EventDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAcademicCalendar } from "@/hooks/useAcademicCalendar";
import { useToast } from "@/contexts/ToastContext";
import {
  ACADEMIC_EVENT_CATEGORY_META,
  ACADEMIC_EVENT_CATEGORY_OPTIONS,
  type AcademicEvent,
  type AcademicEventInput,
} from "@/types/academicEvent";
import { formatFullDate, formatMonthYear, todayKey } from "@/utils/calendarDate";

/**
 * Calendário Acadêmico — visão completa (mês + painel do dia + próximos
 * eventos). Acessível a qualquer role autenticada, sem restrição de
 * `roles` (mesmo critério de "/configuracoes" em AppRoutes): o
 * calendário é uma agenda pessoal, não uma tela de administração.
 */
export function AcademicCalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const {
    visibleMonth,
    selectedDate,
    eventsByDate,
    selectedDayEvents,
    monthLoading,
    monthError,
    upcoming,
    upcomingLoading,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    selectDate,
    saveEvent,
    removeEvent,
  } = useAcademicCalendar();

  const [showDialog, setShowDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AcademicEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<AcademicEvent | null>(null);

  // Aplica "?data=yyyy-mm-dd" vindo da mini-prévia da Sidebar (ou de um
  // link direto) como o dia selecionado inicial, depois limpa o
  // parâmetro da URL para não reaplicá-lo a cada nova visita.
  useEffect(() => {
    const requestedDate = searchParams.get("data");
    if (requestedDate) {
      selectDate(requestedDate);
      const next = new URLSearchParams(searchParams);
      next.delete("data");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { month, year } = formatMonthYear(visibleMonth);

  // Swipe horizontal para trocar de mês em mobile (ver "GESTOS" no
  // briefing: só vale a pena quando melhora mesmo a UX — trocar de mês
  // é uma ação repetida com frequência, então o gesto complementa os
  // botões de seta sem escondê-los). Limiar de 48px evita disparo
  // acidental durante o scroll vertical da página.
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;
    if (deltaX > 0) goToPreviousMonth();
    else goToNextMonth();
  }

  function openNewEventDialog() {
    setEditingEvent(null);
    setShowDialog(true);
  }

  function openEditDialog(event: AcademicEvent) {
    setEditingEvent(event);
    setShowDialog(true);
  }

  async function handleSave(data: AcademicEventInput, editingId?: string | null) {
    await saveEvent(data, editingId);
    toast.success(editingId ? "Evento atualizado com sucesso." : "Evento criado com sucesso.");
  }

  async function handleDelete() {
    if (!deletingEvent) return;
    await removeEvent(deletingEvent.id);
    toast.success(`"${deletingEvent.title}" foi excluído.`);
    setDeletingEvent(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho: navegação de mês + ações */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goToPreviousMonth}
            aria-label="Mês anterior"
            className="rounded-full border border-line bg-surface p-2 text-ink-500 shadow-sm transition-colors hover:bg-ink-50 hover:text-ink-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="min-w-[180px] text-center font-display text-xl font-bold text-ink900 sm:text-left">
            {month} <span className="text-ink-400">{year}</span>
          </h2>
          <button
            type="button"
            onClick={goToNextMonth}
            aria-label="Próximo mês"
            className="rounded-full border border-line bg-surface p-2 text-ink-500 shadow-sm transition-colors hover:bg-ink-50 hover:text-ink-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={goToToday}>
            Hoje
          </Button>
          <Button onClick={openNewEventDialog}>
            <Plus className="h-4 w-4" />
            Novo evento
          </Button>
        </div>
      </div>

      {/* Legenda de categorias */}
      <div className="flex flex-wrap gap-2">
        {ACADEMIC_EVENT_CATEGORY_OPTIONS.map((category) => {
          const meta = ACADEMIC_EVENT_CATEGORY_META[category];
          return (
            <span
              key={category}
              className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-500"
            >
              <span className={`h-2 w-2 rounded-full ${meta.dotClassName}`} aria-hidden="true" />
              {meta.label}
            </span>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Grid mensal */}
        <Card className="overflow-hidden p-0 lg:col-span-2" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {monthError ? (
            <div className="p-4">
              <ErrorState message={monthError} />
            </div>
          ) : monthLoading ? (
            <div className="p-4">
              <div className="mb-2 grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-4" />
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-[92px] sm:h-[112px]" />
                ))}
              </div>
            </div>
          ) : (
            <CalendarGrid
              visibleMonth={visibleMonth}
              eventsByDate={eventsByDate}
              selectedDate={selectedDate}
              todayKey={todayKey()}
              onSelectDate={selectDate}
            />
          )}
        </Card>

        {/* Painel lateral: dia selecionado + próximos eventos */}
        <div className="flex flex-col gap-6">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Dia selecionado</p>
                <p className="font-display text-sm font-semibold text-ink900">{formatFullDate(selectedDate)}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={openNewEventDialog}>
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>

            {monthLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : selectedDayEvents.length === 0 ? (
              <EmptyState
                bare
                icon={CalendarDays}
                title="Nenhum evento neste dia"
                description="Adicione provas, trabalhos ou lembretes para este dia."
                action={{ label: "Adicionar evento", onClick: openNewEventDialog }}
              />
            ) : (
              <div className="flex flex-col gap-2">
                {selectedDayEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={openEditDialog}
                    onDelete={setDeletingEvent}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
              Próximos eventos
            </p>
            {upcomingLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : upcoming.length === 0 ? (
              <EmptyState
                bare
                icon={CalendarDays}
                title="Nada por vir"
                description="Você não tem eventos futuros cadastrados."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {upcoming.map((event) => (
                  <EventCard key={event.id} event={event} showDateLabel />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {showDialog && (
        <EventDialog
          defaultDate={selectedDate}
          event={editingEvent}
          onClose={() => setShowDialog(false)}
          onSubmit={handleSave}
        />
      )}

      {deletingEvent && (
        <ConfirmDialog
          title="Excluir evento"
          description={`Tem certeza de que deseja excluir "${deletingEvent.title}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onCancel={() => setDeletingEvent(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
