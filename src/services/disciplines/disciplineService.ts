import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getClassById, getStudentCountsByClassId } from "@/services/classes/classService";
import type { Discipline, DisciplineInput } from "@/types/discipline";
import type { SchoolClass } from "@/types/schoolClass";

const disciplinesCollection = collection(db, "disciplines");

function toDiscipline(id: string, data: Record<string, unknown>): Discipline {
  return {
    id,
    name: (data.name as string) ?? "",
    code: (data.code as string) ?? "",
    workload: (data.workload as number) ?? 0,
    schoolYear: (data.schoolYear as number) ?? new Date().getFullYear(),
    status: (data.status as Discipline["status"]) ?? "active",
    teacherId: (data.teacherId as string | null) ?? null,
    teacherName: (data.teacherName as string) ?? "",
    classIds: (data.classIds as string[]) ?? [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Lista todas as disciplinas ordenadas por data de criação (mais
 * recentes primeiro). Consulta de campo único — não exige índice
 * composto.
 */
export async function getDisciplines(): Promise<Discipline[]> {
  const q = query(disciplinesCollection, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toDiscipline(d.id, d.data()));
}

export async function getDisciplineById(id: string): Promise<Discipline | null> {
  const snapshot = await getDoc(doc(db, "disciplines", id));
  if (!snapshot.exists()) return null;
  return toDiscipline(snapshot.id, snapshot.data());
}

export async function createDiscipline(data: DisciplineInput): Promise<string> {
  const ref = await addDoc(disciplinesCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDiscipline(id: string, data: DisciplineInput): Promise<void> {
  await updateDoc(doc(db, "disciplines", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDiscipline(id: string): Promise<void> {
  await deleteDoc(doc(db, "disciplines", id));
}

/**
 * Resolve os IDs de turma de uma disciplina para os documentos completos
 * de `classes`. IDs que não existem mais (turma excluída) são omitidos
 * silenciosamente da lista resolvida.
 */
export async function getClassesByIds(classIds: string[]): Promise<SchoolClass[]> {
  if (classIds.length === 0) return [];
  const results = await Promise.all(classIds.map((id) => getClassById(id)));
  return results.filter((c): c is SchoolClass => c !== null);
}

/**
 * Calcula a quantidade de alunos "envolvidos" em um conjunto de turmas,
 * sem duplicar essa contagem no documento da disciplina. Reaproveita
 * `getStudentCountsByClassId` (baseada em `students.classId`, referência
 * de verdade a `classes/{classId}`) já usada em Turmas, somando pelo ID
 * de cada turma vinculada.
 */
export async function getStudentCountForClasses(classes: SchoolClass[]): Promise<number> {
  const counts = await getStudentCountsByClassId();
  return classes.reduce((sum, schoolClass) => sum + (counts[schoolClass.id] ?? 0), 0);
}
