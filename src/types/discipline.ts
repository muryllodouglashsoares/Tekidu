/**
 * Situação da disciplina.
 * Espelha o mesmo padrão de `ClassStatus` (ver `schoolClass.ts`):
 * "active" / "inactive", rotulados como "Ativa" / "Inativa" no Figma.
 */
export type DisciplineStatus = "active" | "inactive";

export const DISCIPLINE_STATUS_LABEL: Record<DisciplineStatus, string> = {
  active: "Ativa",
  inactive: "Inativa",
};

/**
 * Formato do documento em: disciplines/{disciplineId}
 *
 * NOTA SOBRE A RELAÇÃO COM TURMAS:
 * `classIds` referencia diretamente os IDs de documentos de `classes`
 * (não os nomes), pois a coleção `classes` já possui IDs estáveis —
 * o mesmo padrão usado por `students.classId`.
 *
 * NOTA SOBRE A RELAÇÃO COM ALUNOS:
 * Esta coleção NÃO guarda uma lista/contagem de alunos. A quantidade
 * de alunos de uma disciplina é DERIVADA em tempo de consulta a partir
 * das turmas vinculadas (`classIds`), reaproveitando a relação já
 * existente entre `students.classId` e `classes/{classId}` (ver
 * `classService.getStudentCountsByClassId`).
 *
 * NOTA SOBRE O PROFESSOR:
 * `teacherId` é o UID do documento em `users` (role "teacher"), não uma
 * coleção de professores separada. `teacherName` é um snapshot do nome
 * no momento do cadastro/edição, usado para exibir a listagem sem
 * precisar buscar cada usuário individualmente — o mesmo motivo pelo
 * qual `classes` guarda `name` em vez de só um ID em outros contextos.
 * Se o nome do professor mudar depois, o snapshot fica desatualizado
 * até a próxima edição da disciplina; isso é aceitável nesta fase.
 */
export interface Discipline {
  id: string;
  name: string;
  code: string;
  workload: number;
  schoolYear: number;
  status: DisciplineStatus;
  teacherId: string | null;
  teacherName: string;
  classIds: string[];
  createdAt: unknown; // Firestore Timestamp
  updatedAt: unknown; // Firestore Timestamp
}

/** Payload aceito pelo formulário de criação/edição de disciplina. */
export interface DisciplineInput {
  name: string;
  code: string;
  workload: number;
  schoolYear: number;
  status: DisciplineStatus;
  teacherId: string | null;
  teacherName: string;
  classIds: string[];
}
