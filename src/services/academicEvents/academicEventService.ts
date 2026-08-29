import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AcademicEvent, AcademicEventInput } from "@/types/academicEvent";

const academicEventsCollection = collection(db, "academicEvents");

function toAcademicEvent(id: string, data: Record<string, unknown>): AcademicEvent {
  return {
    id,
    ownerId: (data.ownerId as string) ?? "",
    title: (data.title as string) ?? "",
    description: (data.description as string) ?? "",
    date: (data.date as string) ?? "",
    startTime: (data.startTime as string | null) ?? null,
    endTime: (data.endTime as string | null) ?? null,
    category: (data.category as AcademicEvent["category"]) ?? "outro",
    disciplineId: (data.disciplineId as string | null) ?? null,
    classId: (data.classId as string | null) ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Assina, em tempo real, os eventos do usuário logado dentro de um
 * intervalo de datas (inclusive) — usado tanto pelo grid mensal
 * completo (`AcademicCalendarPage`) quanto pela mini-prévia da Sidebar,
 * cada um com seu próprio intervalo (mês visível).
 *
 * Consulta com uma igualdade (`ownerId`) + intervalo/orderBy no mesmo
 * campo (`date`) — exige o índice composto `ownerId ASC, date ASC`
 * (ver firestore.indexes.json), mesmo padrão já usado em
 * `notificationService` para `recipientUid`+`createdAt`.
 *
 * Retorna a função de `unsubscribe` — o chamador deve invocá-la no
 * cleanup do `useEffect` (mesmo contrato de
 * `subscribeToRecentNotifications`).
 */
export function subscribeToEventsInRange(
  ownerId: string,
  startDateKey: string,
  endDateKey: string,
  onChange: (events: AcademicEvent[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const q = query(
    academicEventsCollection,
    where("ownerId", "==", ownerId),
    where("date", ">=", startDateKey),
    where("date", "<=", endDateKey),
    orderBy("date", "asc")
  );
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map((d) => toAcademicEvent(d.id, d.data()))),
    (error) => {
      // eslint-disable-next-line no-console
      console.error("[AcademicEventService] Falha no listener de eventos (intervalo)", error);
      onError?.(error);
    }
  );
}

const UPCOMING_LIMIT = 8;

/**
 * Assina os próximos eventos do usuário a partir de uma data (inclusive),
 * sem limite de fim — alimenta o painel "Próximos eventos" mesmo quando
 * o usuário está navegando em um mês diferente do atual. Mesmo índice
 * composto de `subscribeToEventsInRange` cobre esta consulta.
 */
export function subscribeToUpcomingEvents(
  ownerId: string,
  fromDateKey: string,
  onChange: (events: AcademicEvent[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const q = query(
    academicEventsCollection,
    where("ownerId", "==", ownerId),
    where("date", ">=", fromDateKey),
    orderBy("date", "asc"),
    limit(UPCOMING_LIMIT)
  );
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map((d) => toAcademicEvent(d.id, d.data()))),
    (error) => {
      // eslint-disable-next-line no-console
      console.error("[AcademicEventService] Falha no listener de próximos eventos", error);
      onError?.(error);
    }
  );
}

export async function createAcademicEvent(
  ownerId: string,
  input: AcademicEventInput
): Promise<string> {
  const ref = await addDoc(academicEventsCollection, {
    ownerId,
    title: input.title.trim(),
    description: input.description.trim(),
    date: input.date,
    startTime: input.startTime || null,
    endTime: input.endTime || null,
    category: input.category,
    disciplineId: input.disciplineId ?? null,
    classId: input.classId ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAcademicEvent(
  eventId: string,
  input: AcademicEventInput
): Promise<void> {
  await updateDoc(doc(db, "academicEvents", eventId), {
    title: input.title.trim(),
    description: input.description.trim(),
    date: input.date,
    startTime: input.startTime || null,
    endTime: input.endTime || null,
    category: input.category,
    disciplineId: input.disciplineId ?? null,
    classId: input.classId ?? null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAcademicEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, "academicEvents", eventId));
}
