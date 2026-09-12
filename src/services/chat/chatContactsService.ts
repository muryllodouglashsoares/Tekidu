import { getDisciplines, getDisciplinesForClass } from "@/services/disciplines/disciplineService";
import { getTeacherStudentsOverview } from "@/services/academic/teacherOverviewService";
import type { Discipline } from "@/types/discipline";
import type { Student } from "@/types/student";
import type { SchoolClass } from "@/types/schoolClass";

/**
 * PARTE 1 do plano de evolução — Mensageria.
 *
 * REGRA FUNDAMENTAL do plano: "não crie duplicação de lógica". A
 * elegibilidade "professor pode falar com este aluno" é EXATAMENTE a
 * mesma relação já usada por "Meus Alunos" do Portal do Professor
 * (`teacherOverviewService.getTeacherStudentsOverview` — um aluno
 * aparece se está matriculado em alguma turma de alguma disciplina
 * deste professor). Este arquivo não recalcula essa relação; apenas
 * reaproveita o resultado e o adapta ao formato que a UI de chat
 * precisa (um contato por aluno, com a disciplina "âncora" usada para
 * comprovar o vínculo na criação da conversa — ver `chatService.
 * getOrCreateConversation`/`firestore.rules`).
 */
export interface TeacherContact {
  student: Student;
  schoolClass: SchoolClass;
  /** Disciplina usada como referência do vínculo ao iniciar a conversa (a primeira em comum). */
  discipline: Discipline;
}

export async function getTeacherContacts(teacherUid: string, schoolYear: number): Promise<TeacherContact[]> {
  const overview = await getTeacherStudentsOverview(teacherUid, schoolYear);
  return overview
    // `student.uid == null` = aluno cadastrado sem conta de login
    // vinculada ainda (ver nota em `types/student.ts`) — sem conta,
    // não há como conversar com ele (não existe `participantUids`
    // possível), então ele não aparece como contato disponível.
    .filter((o) => o.disciplines.length > 0 && o.student.uid !== null)
    .map((o) => ({ student: o.student, schoolClass: o.schoolClass, discipline: o.disciplines[0] }));
}

/**
 * Elegibilidade do lado do aluno: "professores disponíveis para
 * contato" é o mesmo relacionamento já usado por "Minhas Disciplinas"
 * do Portal do Aluno (`disciplineService.getDisciplinesForClass` —
 * disciplinas vinculadas à turma do aluno). Um professor aparece uma
 * vez por disciplina (não deduplicado por professor): cada linha já
 * carrega a disciplina "âncora" certa para `getOrCreateConversation`,
 * evitando o aluno "escolher" uma disciplina qualquer na hora de
 * iniciar a conversa quando o mesmo professor leciona mais de uma
 * disciplina da turma.
 */
export interface StudentContact {
  discipline: Discipline;
}

export async function getStudentContacts(classId: string): Promise<StudentContact[]> {
  const allDisciplines = await getDisciplines();
  const disciplines = getDisciplinesForClass(allDisciplines, classId).filter(
    (d) => d.teacherId !== null && d.status === "active"
  );
  return disciplines.map((discipline) => ({ discipline }));
}
