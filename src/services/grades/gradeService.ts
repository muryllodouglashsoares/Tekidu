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
import type { Grade, GradeInput } from "@/types/grade";
import type { AssessmentTerm } from "@/types/assessment";

const gradesCollection = collection(db, "grades");

function toGrade(id: string, data: Record<string, unknown>): Grade {
  return {
    id,
    studentId: (data.studentId as string) ?? "",
    assessmentId: (data.assessmentId as string) ?? "",
    disciplineId: (data.disciplineId as string) ?? "",
    classId: (data.classId as string) ?? "",
    schoolYear: (data.schoolYear as number) ?? new Date().getFullYear(),
    term: (data.term as AssessmentTerm) ?? "1",
    score: (data.score as number | null) ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Lista TODAS as notas de um contexto (disciplina + turma + bimestre)
 * em uma única consulta — a tabela inteira de notas é montada a partir
 * deste resultado, cruzado em memória com alunos x avaliações. Isso é
 * o que evita o risco de N+1 queries descrito no plano: sem os campos
 * denormalizados em `Grade`, seria necessário buscar por
 * `assessmentId` avaliação por avaliação.
 *
 * Exige o mesmo índice composto de `getAssessmentsByContext` (campos
 * diferentes, mesma ideia): `classId + disciplineId + term`.
 */
export async function getGradesByContext(
  disciplineId: string,
  classId: string,
  schoolYear: number,
  term: AssessmentTerm
): Promise<Grade[]> {
  const q = query(
    gradesCollection,
    where("disciplineId", "==", disciplineId),
    where("classId", "==", classId),
    where("schoolYear", "==", schoolYear),
    where("term", "==", term)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toGrade(d.id, d.data()));
}

/**
 * Lista TODAS as notas lançadas em um ano letivo, independente de
 * turma/disciplina/bimestre — usada pelos Relatórios de Desenvolvimento
 * (item 7 do briefing), que precisam agregar médias em vários recortes
 * (todas as turmas, uma turma, uma disciplina, um bimestre) sem repetir
 * uma consulta por combinação. Consulta de campo único
 * (`schoolYear`) — não exige índice composto, e evita buscar TODO o
 * histórico de anos anteriores de uma vez (ver item 29 do briefing,
 * performance).
 */
export async function getGradesBySchoolYear(schoolYear: number): Promise<Grade[]> {
  const q = query(gradesCollection, where("schoolYear", "==", schoolYear));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toGrade(d.id, d.data()));
}

/**
 * Cria ou atualiza a nota de um aluno em uma avaliação específica.
 * Como `grades` não usa `studentId_assessmentId` como ID do documento
 * (evita acoplar o formato do ID a dois campos que podem mudar de
 * forma), a existência prévia é resolvida por uma consulta antes do
 * write — aceitável aqui porque o lançamento de notas é uma ação
 * pontual do usuário (clique em uma célula), não um loop em lote.
 */
export async function saveGrade(existingGradeId: string | null, data: GradeInput): Promise<void> {
  if (existingGradeId) {
    await updateDoc(doc(db, "grades", existingGradeId), {
      score: data.score,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await addDoc(gradesCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
