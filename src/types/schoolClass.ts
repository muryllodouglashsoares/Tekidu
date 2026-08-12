/**
 * Turno em que a turma acontece.
 * Espelha os rótulos do protótipo do Figma (Turmas → coluna "Turno").
 */
export type ClassShift = "manha" | "tarde" | "noite";

export const CLASS_SHIFT_LABEL: Record<ClassShift, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

/**
 * Situação da turma.
 * Espelha os rótulos do protótipo do Figma (Turmas → coluna "Status"):
 * "ATIVA" / "INATIVA".
 */
export type ClassStatus = "active" | "inactive";

export const CLASS_STATUS_LABEL: Record<ClassStatus, string> = {
  active: "Ativa",
  inactive: "Inativa",
};

/**
 * Opções de série exibidas no formulário e no filtro "Série".
 * O protótipo do Figma não define a lista completa (os dados de exemplo
 * usam apenas "1º ano" a "3º ano") — esta lista cobre o Ensino
 * Fundamental/Médio/Técnico de forma genérica. Caso a instituição use
 * uma nomenclatura diferente, este é o único lugar a ajustar.
 */
export const CLASS_GRADE_OPTIONS = [
  "1º ano",
  "2º ano",
  "3º ano",
  "4º ano",
  "5º ano",
  "6º ano",
  "7º ano",
  "8º ano",
  "9º ano",
] as const;

/**
 * Formato do documento em: classes/{classId}
 *
 * NOTA SOBRE A RELAÇÃO COM ALUNOS:
 * Esta coleção não guarda uma lista de IDs de alunos. A quantidade de
 * alunos exibida na listagem é DERIVADA em tempo de consulta, contando
 * os documentos de `students` cujo campo `turma` (texto livre) é igual
 * a `name` desta turma — reaproveitando a relação que já existe hoje em
 * `students`, em vez de duplicar essa informação em dois lugares.
 * Quando o relacionamento Turma↔Aluno precisar ficar mais robusto (ex.:
 * um aluno mudar de turma preservando histórico), o caminho recomendado
 * é migrar `students.turma` (string) para `students.classId` (referência
 * ao id de `classes`), sem quebrar os dados já cadastrados.
 */
export interface SchoolClass {
  id: string;
  name: string;
  grade: string;
  schoolYear: number;
  shift: ClassShift;
  status: ClassStatus;
  createdAt: unknown; // Firestore Timestamp
  updatedAt: unknown; // Firestore Timestamp
}

/** Payload aceito pelo formulário de criação/edição de turma. */
export interface ClassInput {
  name: string;
  grade: string;
  schoolYear: number;
  shift: ClassShift;
  status: ClassStatus;
}
