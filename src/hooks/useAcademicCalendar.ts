import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  createAcademicEvent,
  deleteAcademicEvent,
  subscribeToEventsInRange,
  subscribeToUpcomingEvents,
  updateAcademicEvent,
} from "@/services/academicEvents/academicEventService";
import { describeFirebaseError } from "@/utils/firebaseError";
import { addMonths, monthRangeKeys, todayKey } from "@/utils/calendarDate";
import type { AcademicEvent, AcademicEventInput } from "@/types/academicEvent";

/**
 * Estado e ações compartilhados pelo Calendário Acadêmico — usado tanto
 * pela página completa (`AcademicCalendarPage`) quanto pela mini-prévia
 * da Sidebar (`CalendarMiniWidget`), cada um com sua própria instância
 * (assinaturas independentes, sem estado global): a Sidebar precisa só
 * do mês visível e dos "dias com evento"; a página completa usa tudo,
 * incluindo o dia selecionado e o CRUD.
 *
 * Eventos são carregados via listener em tempo real (`onSnapshot`)
 * escopado ao mês visível — navegar de mês assina uma nova consulta e
 * cancela a anterior, mesmo padrão de `subscribeToRecentNotifications`.
 */
export function useAcademicCalendar() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid;

  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => todayKey());

  const [monthEvents, setMonthEvents] = useState<AcademicEvent[]>([]);
  const [monthLoading, setMonthLoading] = useState(true);
  const [monthError, setMonthError] = useState<string | null>(null);

  const [upcoming, setUpcoming] = useState<AcademicEvent[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);

  // Assina os eventos do mês visível. Refeito a cada troca de mês/uid.
  useEffect(() => {
    if (!uid) return;
    setMonthLoading(true);
    setMonthError(null);
    const { start, end } = monthRangeKeys(visibleMonth);
    const unsubscribe = subscribeToEventsInRange(
      uid,
      start,
      end,
      (events) => {
        setMonthEvents(events);
        setMonthLoading(false);
      },
      (error) => {
        setMonthError(describeFirebaseError(error, "calendario:mes"));
        setMonthLoading(false);
      }
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, visibleMonth.getFullYear(), visibleMonth.getMonth()]);

  // Assina os próximos eventos (a partir de hoje), independente do mês
  // visível — é o que permite o painel "Próximos eventos" continuar
  // útil mesmo enquanto o usuário navega para outro mês.
  useEffect(() => {
    if (!uid) return;
    setUpcomingLoading(true);
    const unsubscribe = subscribeToUpcomingEvents(
      uid,
      todayKey(),
      (events) => {
        setUpcoming(events);
        setUpcomingLoading(false);
      },
      () => setUpcomingLoading(false)
    );
    return unsubscribe;
  }, [uid]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, AcademicEvent[]>();
    for (const event of monthEvents) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    // Ordena por horário dentro do dia (eventos sem horário vão para o topo).
    for (const list of map.values()) {
      list.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
    }
    return map;
  }, [monthEvents]);

  const selectedDayEvents = eventsByDate.get(selectedDate) ?? [];

  function goToPreviousMonth() {
    setVisibleMonth((prev) => addMonths(prev, -1));
  }
  function goToNextMonth() {
    setVisibleMonth((prev) => addMonths(prev, 1));
  }
  function goToToday() {
    setVisibleMonth(new Date());
    setSelectedDate(todayKey());
  }
  function selectDate(dateKey: string) {
    setSelectedDate(dateKey);
  }

  async function saveEvent(input: AcademicEventInput, editingId?: string | null) {
    if (!uid) throw new Error("Usuário não autenticado.");
    if (editingId) {
      await updateAcademicEvent(editingId, input);
    } else {
      await createAcademicEvent(uid, input);
    }
  }

  async function removeEvent(eventId: string) {
    await deleteAcademicEvent(eventId);
  }

  return {
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
  };
}
