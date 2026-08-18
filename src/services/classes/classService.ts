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
import { logAuditEvent } from "@/services/audit/auditService";
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

/**
 * Exclui uma turma. Restrita a admin (ver firestore.rules).
 *
 * Registra um evento de auditoria (Tarefa 4, Fase 1 pós-auditoria V8):
 * antes desta mudança, excluir uma turma não deixava nenhum rastro.
 * Busca o documento ANTES de excluir para poder registrar o nome da
 * turma removida (`before`) — depois do `deleteDoc` o documento não
 * existe mais para consultar. Não há "depois" (o documento deixou de
 * existir) — `after: null`.
 */
export async function deleteClass(id: string, actor: { id: string; name: string }): Promise<void> {
  const schoolClass = await getClassById(id);
  await deleteDoc(doc(db, "classes", id));
  logAuditEvent({
    type: "class_deleted",
    actorId: actor.id,
    actorName: actor.name,
    before: schoolClass?.name ?? null,
    after: null,
  });
}

/**
 * Conta quantos alunos existem por turma, usando o campo `students.classId`
 * (referência a `classes/{classId}`) — sem precisar de um campo de
 * contagem duplicado em `classes`. A chave do mapa é o ID da turma.
 *
 * Nota: para o volume esperado nesta fase (uma instituição), buscar todos
 * os alunos e agrupar em memória é mais simples e barato do que uma
 * consulta por turma para cada linha da tabela.
 */
export async function getStudentCountsByClassId(): Promise<Record<string, number>> {
  const students = await getStudents();
  const counts: Record<string, number> = {};
  for (const student of students) {
    if (!student.classId) continue;
    counts[student.classId] = (counts[student.classId] ?? 0) + 1;
  }
  return counts;
}

/** Lista os alunos vinculados a uma turma pelo ID (usado no detalhe da turma). */
export async function getStudentsByClassId(classId: string) {
  const students = await getStudents();
  return students.filter((s) => s.classId === classId);
}
