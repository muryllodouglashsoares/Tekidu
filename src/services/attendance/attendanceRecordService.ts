import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
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
 *
 * `studentId` (opcional, Tarefa 3 — Fase 1 pós-auditoria V8): mesmo
 * papel do parâmetro equivalente em `gradeService.getGradesByContext`
 * — estreita a consulta a um único aluno via `where('studentId', '==',
 * ...)`, tornando-a executável para um aluno autenticado sob a
 * Security Rule de `attendanceRecords` (`isOwnStudentRecord`).
 */
export async function getRecordsByContext(
  disciplineId: string,
  classId: string,
  schoolYear: number,
  term: AssessmentTerm,
  studentId?: string
): Promise<AttendanceRecord[]> {
  const clauses = [
    where("disciplineId", "==", disciplineId),
    where("classId", "==", classId),
    where("schoolYear", "==", schoolYear),
    where("term", "==", term),
  ];
  if (studentId) clauses.push(where("studentId", "==", studentId));
  const q = query(recordsCollection, ...clauses);
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
 * Lista TODOS os registros de presença de um ano letivo, independente
 * de turma/disciplina/bimestre — mesmo racional de `getGradesBySchoolYear`
 * (Notas), usada pelos Relatórios de Desenvolvimento para calcular a
 * frequência média em vários recortes com uma única leitura. Consulta
 * de campo único — não exige índice composto.
 */
export async function getAttendanceRecordsBySchoolYear(schoolYear: number): Promise<AttendanceRecord[]> {
  const q = query(recordsCollection, where("schoolYear", "==", schoolYear));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toRecord(d.id, d.data()));
}

/**
 * Lista os registros de presença de VÁRIAS disciplinas de um ano
 * letivo — versão escopada de `getAttendanceRecordsBySchoolYear` para
 * o Portal do Professor. Mesmo racional de
 * `assessmentService.getAssessmentsByDisciplineIds` (uma consulta por
 * disciplina, nunca `in`).
 */
export async function getAttendanceRecordsByDisciplineIds(
  disciplineIds: string[],
  schoolYear: number
): Promise<AttendanceRecord[]> {
  if (disciplineIds.length === 0) return [];
  const results = await Promise.all(
    disciplineIds.map(async (disciplineId) => {
      const q = query(
        recordsCollection,
        where("disciplineId", "==", disciplineId),
        where("schoolYear", "==", schoolYear)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => toRecord(d.id, d.data()));
    })
  );
  return results.flat();
}

/**
 * Constrói o ID determinístico do registro de presença de um aluno em
 * uma aula. Formato: `{studentId}_{sessionId}`. Mesma correção
 * estrutural de `gradeService.buildGradeId` (ver nota lá) aplicada
 * aqui: evita duplicar registros de presença quando duas marcações do
 * mesmo aluno/aula acontecem antes do estado local em memória ser
 * atualizado.
 */
export function buildAttendanceRecordId(studentId: string, sessionId: string): string {
  return `${studentId}_${sessionId}`;
}

/**
 * Cria ou atualiza o registro de presença de um aluno em uma aula
 * específica, usando o ID determinístico de `buildAttendanceRecordId`
 * — garante estruturalmente "1 aluno + 1 aula = 1 registro de
 * presença", independente de condições de corrida no estado local.
 */
export async function saveAttendanceRecord(data: AttendanceRecordInput): Promise<void> {
  const ref = doc(db, "attendanceRecords", buildAttendanceRecordId(data.studentId, data.sessionId));
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    await updateDoc(ref, {
      status: data.status,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await setDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
