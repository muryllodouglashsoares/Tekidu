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
import type { Assessment, AssessmentInput, AssessmentTerm, AssessmentType } from "@/types/assessment";

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
    weight: data.weight as number | undefined,
    maxScore: data.maxScore as number | undefined,
    type: data.type as AssessmentType | undefined,
    description: data.description as string | undefined,
    date: data.date as string | undefined,
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

/**
 * Lista TODAS as avaliações de um ano letivo, independente de
 * turma/disciplina/bimestre. Mesmo racional de
 * `gradeService.getGradesBySchoolYear`: usada pelo Dashboard para
 * calcular pendências ("avaliações incompletas", "notas ainda não
 * lançadas" — item 12 do plano V8) sem repetir uma consulta por
 * combinação de turma/disciplina/bimestre. Consulta de campo único
 * (`schoolYear`) — não exige índice composto.
 */
export async function getAssessmentsBySchoolYear(schoolYear: number): Promise<Assessment[]> {
  const q = query(assessmentsCollection, where("schoolYear", "==", schoolYear));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toAssessment(d.id, d.data()));
}

/**
 * Lista as avaliações de VÁRIAS disciplinas de um ano letivo — Etapa 7
 * do plano multi-role ("escopar turma/disciplina para o professor").
 *
 * Diferente de `getAssessmentsBySchoolYear` (uma única consulta sem
 * filtro de disciplina — por isso só seguro para admin), esta função
 * faz UMA consulta por disciplina (`where('disciplineId','==', id) +
 * where('schoolYear','==', schoolYear)`), em paralelo. É
 * deliberadamente uma query de igualdade por vez (não um único
 * `where('disciplineId','in', ids)`) porque só uma query com o valor
 * de `disciplineId` FIXO permite às Firestore Rules provar, sem
 * avaliar cada documento individualmente, que o resultado inteiro
 * satisfaz `isOwnDiscipline(disciplineId)` — mesmo racional já usado
 * em `isOwnStudentRecord` (ver `firestore.rules`). Uma cláusula `in`
 * teria o mesmo problema de `getAssessmentsBySchoolYear`: a regra não
 * consegue provar a posse de CADA valor possível do conjunto de uma
 * vez, e o Firestore rejeitaria a consulta inteira.
 *
 * Usada por `teacherOverviewService` (Portal do Professor) no lugar de
 * `getAssessmentsBySchoolYear` — antes, o professor buscava as
 * avaliações do ANO LETIVO INTEIRO (todas as disciplinas da escola) e
 * filtrava em memória; a UI já escondia o resultado, mas a leitura em
 * si não era escopada, então nada impedia a mesma chamada de trazer
 * dados de disciplinas de outros professores. Ver nota na regra de
 * `assessments` em `firestore.rules`.
 */
export async function getAssessmentsByDisciplineIds(
  disciplineIds: string[],
  schoolYear: number
): Promise<Assessment[]> {
  if (disciplineIds.length === 0) return [];
  const results = await Promise.all(
    disciplineIds.map(async (disciplineId) => {
      const q = query(
        assessmentsCollection,
        where("disciplineId", "==", disciplineId),
        where("schoolYear", "==", schoolYear)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => toAssessment(d.id, d.data()));
    })
  );
  return results.flat();
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
