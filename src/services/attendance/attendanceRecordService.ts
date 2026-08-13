import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AttendanceRecord, AttendanceRecordInput } from "@/types/attendance";
import type { AssessmentTerm } from "@/types/assessment";

const recordsCollection = collection(db, "attendanceRecords");

function toRecord(id: string, data: Record<string, unknown>): AttendanceRecord {
  return {
    id,
    studentId: (data.studentId as string) ?? "",
    sessionId: (data.sessionId as string) ?? "",
    disciplineId: (data.disciplineId as string) ?? "",
    classId: (data.classId as string) ?? "",
    schoolYear: (data.schoolYear as number) ?? new Date().getFullYear(),
    term: (data.term as AssessmentTerm) ?? "1",
    status: (data.status as AttendanceRecord["status"]) ?? "absent",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Lista TODOS os registros de presença de um contexto (disciplina +
 * turma + bimestre) em uma única consulta — a tabela "Resumo" e "Por
 * data" inteiras são montadas a partir deste resultado, cruzado em
 * memória com alunos x aulas. Mesmo racional de `getGradesByContext`:
 * evita N+1 queries (uma por aula) graças aos campos denormalizados em
 * `AttendanceRecord`. Exige o mesmo índice composto de
 * `getSessionsByContext`.
 */
export async function getRecordsByContext(
  disciplineId: string,
  classId: string,
  schoolYear: number,
  term: AssessmentTerm
): Promise<AttendanceRecord[]> {
  const q = query(
    recordsCollection,
    where("disciplineId", "==", disciplineId),
    where("classId", "==", classId),
    where("schoolYear", "==", schoolYear),
    where("term", "==", term)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toRecord(d.id, d.data()));
}

/**
 * Registros de um conjunto de aulas específico — usado pela aba
 * "Histórico" para calcular presentes/ausentes por aula sem precisar de
 * um contexto de ano/bimestre selecionado. Como o Firestore limita
 * `where(...,"in",...)` a 30 valores, faz uma query por lote de 30
 * IDs — na prática, uma única chamada na grande maioria dos casos.
 */
export async function getRecordsBySessionIds(sessionIds: string[]): Promise<AttendanceRecord[]> {
  if (sessionIds.length === 0) return [];
  const batches: string[][] = [];
  for (let i = 0; i < sessionIds.length; i += 30) {
    batches.push(sessionIds.slice(i, i + 30));
  }
  const results = await Promise.all(
    batches.map(async (batch) => {
      const q = query(recordsCollection, where("sessionId", "in", batch));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => toRecord(d.id, d.data()));
    })
  );
  return results.flat();
}

/**
 * Cria ou atualiza o registro de presença de um aluno em uma aula
 * específica. Assim como `saveGrade`, a existência prévia é resolvida
 * pelo chamador (não pelo formato do ID do documento) — aceitável pois
 * o lançamento é uma ação pontual (clique em "Presente"/"Ausente"), não
 * um loop em lote.
 */
export async function saveAttendanceRecord(
  existingRecordId: string | null,
  data: AttendanceRecordInput
): Promise<void> {
  if (existingRecordId) {
    await updateDoc(doc(db, "attendanceRecords", existingRecordId), {
      status: data.status,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await addDoc(recordsCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
