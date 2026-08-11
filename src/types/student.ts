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
 * NOTA IMPORTANTE sobre `turma` e `average`:
 * - `turma` é um texto livre (ex.: "9º Ano B") em vez de uma referência
 *   a `classes/{classId}`. A coleção `classes` ainda não existe (Turmas
 *   está "em breve" no protótipo). Quando a Fase 7 (Turmas/Disciplinas)
 *   for implementada, este campo deve ser migrado para `classId` +
 *   busca em `classes`, sem quebrar os dados já cadastrados.
 * - `average` é armazenado diretamente no aluno por enquanto porque o
 *   módulo de Notas (Fase 8) ainda não existe — não há de onde calcular
 *   uma média real. Quando as notas forem implementadas, este campo
 *   passará a ser CALCULADO a partir de `grades/*` em vez de digitado
 *   manualmente. Até lá, ele é opcional e apenas informativo.
 */
export interface Student {
  id: string;
  name: string;
  email: string;
  registrationNumber: string;
  turma: string;
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
  turma: string;
  status: StudentStatus;
  average: number | null;
}
