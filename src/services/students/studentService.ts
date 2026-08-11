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
import type { Student, StudentInput } from "@/types/student";

const studentsCollection = collection(db, "students");

function toStudent(id: string, data: Record<string, unknown>): Student {
  return {
    id,
    name: (data.name as string) ?? "",
    email: (data.email as string) ?? "",
    registrationNumber: (data.registrationNumber as string) ?? "",
    turma: (data.turma as string) ?? "",
    status: (data.status as Student["status"]) ?? "active",
    average: (data.average as number | null) ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Lista todos os alunos ordenados por data de matrícula (mais recentes
 * primeiro). Consulta simples de campo único — não exige a criação de
 * nenhum índice composto no Firestore.
 */
export async function getStudents(): Promise<Student[]> {
  const q = query(studentsCollection, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toStudent(d.id, d.data()));
}

export async function getStudentById(id: string): Promise<Student | null> {
  const snapshot = await getDoc(doc(db, "students", id));
  if (!snapshot.exists()) return null;
  return toStudent(snapshot.id, snapshot.data());
}

export async function createStudent(data: StudentInput): Promise<string> {
  const ref = await addDoc(studentsCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateStudent(id: string, data: StudentInput): Promise<void> {
  await updateDoc(doc(db, "students", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteStudent(id: string): Promise<void> {
  await deleteDoc(doc(db, "students", id));
}
