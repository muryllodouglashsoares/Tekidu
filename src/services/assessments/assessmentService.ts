import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assessment, AssessmentInput, AssessmentTerm } from "@/types/assessment";

const assessmentsCollection = collection(db, "assessments");

function toAssessment(id: string, data: Record<string, unknown>): Assessment {
  return {
    id,
    disciplineId: (data.disciplineId as string) ?? "",
    classId: (data.classId as string) ?? "",
    schoolYear: (data.schoolYear as number) ?? new Date().getFullYear(),
    term: (data.term as AssessmentTerm) ?? "1",
    name: (data.name as string) ?? "",
    order: (data.order as number) ?? 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Lista as avaliações de um contexto específico (disciplina + turma +
 * bimestre), ordenadas por `order` — a mesma granularidade dos filtros
 * da tela de Notas. Consulta composta (`where` em 3 campos + `orderBy`
 * em um 4º) — exige um índice composto no Firestore. Ver README/aviso
 * de índice entregue junto com esta implementação.
 */
export async function getAssessmentsByContext(
  disciplineId: string,
  classId: string,
  schoolYear: number,
  term: AssessmentTerm
): Promise<Assessment[]> {
  const q = query(
    assessmentsCollection,
    where("disciplineId", "==", disciplineId),
    where("classId", "==", classId),
    where("schoolYear", "==", schoolYear),
    where("term", "==", term),
    orderBy("order", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toAssessment(d.id, d.data()));
}

export async function createAssessment(data: AssessmentInput): Promise<string> {
  const ref = await addDoc(assessmentsCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAssessment(id: string, data: AssessmentInput): Promise<void> {
  await updateDoc(doc(db, "assessments", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Exclui a avaliação e todas as notas lançadas para ela (evita notas
 * "órfãs" apontando para um `assessmentId` inexistente). Usa o mesmo
 * padrão de `getGradesByAssessment` do `gradeService` para localizar os
 * documentos a remover antes de excluir a avaliação em si.
 */
export async function deleteAssessment(id: string): Promise<void> {
  const gradesQuery = query(collection(db, "grades"), where("assessmentId", "==", id));
  const gradesSnapshot = await getDocs(gradesQuery);
  await Promise.all(gradesSnapshot.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "assessments", id));
}
