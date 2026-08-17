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
 * Constrói o ID determinístico do documento de nota de um aluno em
 * uma avaliação. Formato: `{studentId}_{assessmentId}`.
 *
 * CORREÇÃO (auditoria V8 — item 3 "Corrigir especialmente: IDs
 * temporários; duplicação de notas; criação versus atualização"):
 * antes, `saveGrade` recebia um `existingGradeId` resolvido pelo
 * CHAMADOR a partir do estado local em memória (`grades.find(...)`).
 * Isso é uma fonte real de duplicação: se o estado local ainda não
 * refletir uma nota recém-criada (ex.: duas edições rápidas na mesma
 * célula, ou a tabela ainda carregando quando o usuário lança a
 * primeira nota), duas chamadas podem concluir simultaneamente que
 * "não existe nota ainda" e ambas executar `addDoc`, criando dois
 * documentos para o mesmo par (aluno, avaliação).
 *
 * Ao usar `{studentId}_{assessmentId}` como o PRÓPRIO ID do documento
 * (em vez de um ID gerado + busca prévia), a estrutura garante
 * "1 aluno + 1 avaliação = 1 nota" independente de qualquer condição de
 * corrida: não existe like "criar duas vezes", porque as duas
 * chamadas resolvem para o MESMO documento — a segunda apenas
 * sobrescreve a primeira (last-write-wins), nunca duplica.
 */
export function buildGradeId(studentId: string, assessmentId: string): string {
  return `${studentId}_${assessmentId}`;
}

/**
 * Cria ou atualiza a nota de um aluno em uma avaliação específica,
 * usando o ID determinístico de `buildGradeId` — ver nota acima sobre
 * por que isso substitui a resolução de existência pelo chamador.
 *
 * Ainda assim distinguimos create/update (via `getDoc` prévio) para
 * preservar `createdAt` como a data do PRIMEIRO lançamento, não a de
 * cada edição — importante para a trilha de auditoria (item 14).
 */
export async function saveGrade(data: GradeInput): Promise<void> {
  const ref = doc(db, "grades", buildGradeId(data.studentId, data.assessmentId));
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    await updateDoc(ref, {
      score: data.score,
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

/** Busca uma nota específica pelo par (aluno, avaliação). `null` se ainda não lançada. */
export async function getGrade(studentId: string, assessmentId: string): Promise<Grade | null> {
  const snapshot = await getDoc(doc(db, "grades", buildGradeId(studentId, assessmentId)));
  if (!snapshot.exists()) return null;
  return toGrade(snapshot.id, snapshot.data());
}
