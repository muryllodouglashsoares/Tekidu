/**
 * Situação acadêmica do aluno.
 * Espelha os rótulos já usados no protótipo do Figma (Dashboard →
 * "Distribuição por situação"): Ativos, Em recuperação, Reprovados,
 * Inativos.
 */
export type StudentStatus = "active" | "recovery" | "failed" | "inactive";

export const STUDENT_STATUS_LABEL: Record<StudentStatus, string> = {
  active: "Ativo",
  recovery: "Em Recuperação",
  failed: "Reprovado",
  inactive: "Inativo",
};

/**
 * Formato do documento em: students/{studentId}
 *
 * NOTA IMPORTANTE sobre `classId` e `average`:
 * - `classId` referencia diretamente o ID de um documento em `classes`
 *   (mesmo padrão usado por `disciplines.classIds`), em vez do antigo
 *   texto livre `turma`. A relação é estabelecida por SELEÇÃO de uma
 *   turma já cadastrada, não por digitação — o que elimina o problema
 *   de nomes de turma divergentes (ex.: "9º Ano B" vs "9 ano B") que o
 *   texto livre tinha. `null` significa "sem turma vinculada".
 * - `average` é armazenado diretamente no aluno por enquanto porque o
 *   módulo de Notas ainda não calcula uma média consolidada por aluno.
 *   Quando isso existir, este campo passará a ser CALCULADO a partir
 *   de `grades/*` em vez de digitado manualmente. Até lá, ele é
 *   opcional e apenas informativo.
 */
export interface Student {
  id: string;
  name: string;
  email: string;
  registrationNumber: string;
  classId: string | null;
  status: StudentStatus;
  average: number | null;
  createdAt: unknown; // Firestore Timestamp
  updatedAt: unknown; // Firestore Timestamp
}

/** Payload aceito pelo formulário de criação/edição de aluno. */
export interface StudentInput {
  name: string;
  email: string;
  registrationNumber: string;
  classId: string | null;
  status: StudentStatus;
  average: number | null;
}
