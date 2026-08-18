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
import { logAuditEvent } from "@/services/audit/auditService";
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

/**
 * Exclui uma disciplina. Restrita a admin (ver firestore.rules).
 *
 * Registra um evento de auditoria (Tarefa 4, Fase 1 pós-auditoria V8):
 * antes desta mudança, excluir uma disciplina não deixava nenhum
 * rastro. Mesmo racional de `classService.deleteClass`: busca o
 * documento ANTES de excluir para registrar nome/código no `before` —
 * não há "depois" (`after: null`).
 */
export async function deleteDiscipline(
  id: string,
  actor: { id: string; name: string }
): Promise<void> {
  const discipline = await getDisciplineById(id);
  await deleteDoc(doc(db, "disciplines", id));
  logAuditEvent({
    type: "discipline_deleted",
    actorId: actor.id,
    actorName: actor.name,
    disciplineId: id,
    disciplineName: discipline ? `${discipline.name} (${discipline.code})` : null,
    before: discipline ? `${discipline.name} (${discipline.code})` : null,
    after: null,
  });
}

/**
 * Filtra as disciplinas vinculadas a uma turma, usando SOMENTE o
 * relacionamento real (`discipline.classIds.includes(classId)`).
 *
 * NOTA SOBRE O BUG CORRIGIDO (Turma ↔ Disciplina em Notas/Frequência/
 * Boletim):
 * As telas dependentes (Notas, Frequência, Boletim) antes exigiam
 * ADICIONALMENTE que `discipline.schoolYear` fosse igual ao ano letivo
 * filtrado (o mesmo ano da turma selecionada). O problema é que
 * `schoolYear` é um campo digitado de forma independente no cadastro
 * de disciplina — não é derivado das turmas escolhidas em `classIds`.
 * Bastava uma disciplina ser cadastrada/editada com o ano "errado"
 * (ex.: criada em Jan/2026 mas ainda com `schoolYear: 2025` porque o
 * campo não foi ajustado) para que ela continuasse aparecendo
 * corretamente em Disciplinas (que já filtra só por `classIds`, sem
 * essa checagem extra), mas sumisse dos seletores de Notas/Frequência/
 * Boletim — exatamente o sintoma relatado ("existem disciplinas
 * cadastradas e vinculadas, mas nenhuma aparece").
 * Como cada turma já pertence a um único `schoolYear` (campo de
 * `SchoolClass`), o relacionamento `classIds` já escopa a disciplina
 * pelo ano correto automaticamente — repetir a comparação com
 * `discipline.schoolYear` era redundante e frágil. Esta função passa a
 * ser a ÚNICA fonte de verdade para "quais disciplinas pertencem a
 * esta turma", reaproveitada por todas as telas que precisam disso.
 */
export function getDisciplinesForClass(disciplines: Discipline[], classId: string): Discipline[] {
  return disciplines.filter((d) => d.classIds.includes(classId));
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
