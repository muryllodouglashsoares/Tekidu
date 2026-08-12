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
import { getStudents } from "@/services/students/studentService";
import type { ClassInput, SchoolClass } from "@/types/schoolClass";

const classesCollection = collection(db, "classes");

function toSchoolClass(id: string, data: Record<string, unknown>): SchoolClass {
  return {
    id,
    name: (data.name as string) ?? "",
    grade: (data.grade as string) ?? "",
    schoolYear: (data.schoolYear as number) ?? new Date().getFullYear(),
    shift: (data.shift as SchoolClass["shift"]) ?? "manha",
    status: (data.status as SchoolClass["status"]) ?? "active",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Lista todas as turmas ordenadas por data de criação (mais recentes
 * primeiro). Consulta de campo único — não exige índice composto.
 */
export async function getClasses(): Promise<SchoolClass[]> {
  const q = query(classesCollection, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toSchoolClass(d.id, d.data()));
}

export async function getClassById(id: string): Promise<SchoolClass | null> {
  const snapshot = await getDoc(doc(db, "classes", id));
  if (!snapshot.exists()) return null;
  return toSchoolClass(snapshot.id, snapshot.data());
}

export async function createClass(data: ClassInput): Promise<string> {
  const ref = await addDoc(classesCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateClass(id: string, data: ClassInput): Promise<void> {
  await updateDoc(doc(db, "classes", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteClass(id: string): Promise<void> {
  await deleteDoc(doc(db, "classes", id));
}

/**
 * Conta quantos alunos existem por turma, usando o campo `students.turma`
 * (texto livre) já existente — sem precisar de um campo de contagem
 * duplicado em `classes`. A chave do mapa é o nome da turma (trim exato).
 *
 * Nota: para o volume esperado nesta fase (uma instituição), buscar todos
 * os alunos e agrupar em memória é mais simples e barato do que uma
 * consulta por turma para cada linha da tabela.
 */
export async function getStudentCountsByClassName(): Promise<Record<string, number>> {
  const students = await getStudents();
  const counts: Record<string, number> = {};
  for (const student of students) {
    const key = student.turma.trim();
    if (!key) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/** Lista os alunos vinculados a uma turma pelo nome (usado no detalhe da turma). */
export async function getStudentsByClassName(className: string) {
  const students = await getStudents();
  return students.filter((s) => s.turma.trim() === className.trim());
}
