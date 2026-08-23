import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AttendanceSession, AttendanceSessionInput } from "@/types/attendance";
import type { AssessmentTerm } from "@/types/assessment";

const sessionsCollection = collection(db, "attendanceSessions");

function toSession(id: string, data: Record<string, unknown>): AttendanceSession {
  return {
    id,
    disciplineId: (data.disciplineId as string) ?? "",
    classId: (data.classId as string) ?? "",
    schoolYear: (data.schoolYear as number) ?? new Date().getFullYear(),
    term: (data.term as AssessmentTerm) ?? "1",
    date: (data.date as string) ?? "",
    label: (data.label as string) ?? "",
    order: (data.order as number) ?? 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Lista as aulas de um contexto específico (disciplina + turma +
 * bimestre), ordenadas por `order` — mesma granularidade dos filtros da
 * tela de Frequência (ver `getAssessmentsByContext` em Notas). Exige o
 * mesmo tipo de índice composto no Firestore.
 */
export async function getSessionsByContext(
  disciplineId: string,
  classId: string,
  schoolYear: number,
  term: AssessmentTerm
): Promise<AttendanceSession[]> {
  const q = query(
    sessionsCollection,
    where("disciplineId", "==", disciplineId),
    where("classId", "==", classId),
    where("schoolYear", "==", schoolYear),
    where("term", "==", term),
    orderBy("order", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toSession(d.id, d.data()));
}

/**
 * Lista TODAS as aulas já registradas (qualquer contexto), ordenadas
 * pela data mais recente primeiro — usada pela aba "Histórico", que é
 * uma visão transversal (não depende de ano/bimestre selecionado).
 */
export async function getAllSessions(): Promise<AttendanceSession[]> {
  const q = query(sessionsCollection, orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toSession(d.id, d.data()));
}

/**
 * Lista as aulas de VÁRIAS disciplinas (qualquer bimestre) — versão
 * escopada de `getAllSessions` para o Portal do Professor. Mesmo
 * racional de `assessmentService.getAssessmentsByDisciplineIds` (uma
 * consulta por disciplina, nunca `in`).
 */
export async function getSessionsByDisciplineIds(disciplineIds: string[]): Promise<AttendanceSession[]> {
  if (disciplineIds.length === 0) return [];
  const results = await Promise.all(
    disciplineIds.map(async (disciplineId) => {
      const q = query(sessionsCollection, where("disciplineId", "==", disciplineId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => toSession(d.id, d.data()));
    })
  );
  return results.flat();
}

export async function createSession(data: AttendanceSessionInput): Promise<string> {
  const ref = await addDoc(sessionsCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Exclui a aula e todos os registros de presença lançados para ela
 * (evita registros "órfãos" apontando para um `sessionId` inexistente)
 * — mesmo padrão de `deleteAssessment` em Notas.
 */
export async function deleteSession(id: string): Promise<void> {
  const recordsQuery = query(collection(db, "attendanceRecords"), where("sessionId", "==", id));
  const recordsSnapshot = await getDocs(recordsQuery);
  await Promise.all(recordsSnapshot.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "attendanceSessions", id));
}
