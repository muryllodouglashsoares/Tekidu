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
 *
 * NOTA SOBRE `uid` (Fase 1 pós-auditoria V8 — Tarefa 2):
 * Liga este registro acadêmico à conta de login do aluno no Firebase
 * Authentication, análogo ao papel de `UserProfile.uid` (ver
 * `types/user.ts`) — mas aqui o campo mora no PRÓPRIO documento de
 * `students`, e não em um documento separado em `users/{uid}`, porque
 * o aluno já é modelado como `students/{studentId}` (com seu próprio
 * `id` de documento) desde antes de existir a noção de conta de
 * login. `uid` é o elo que permite a um aluno autenticado descobrir
 * qual documento de `students` é o seu — pré-requisito das Security
 * Rules de leitura escopada (`grades`/`attendanceRecords`/`students`)
 * e do Portal do Aluno.
 * `null` = aluno cadastrado mas SEM conta de login vinculada ainda
 * (estado válido e esperado para todo aluno cadastrado antes desta
 * mudança — nunca trate `uid: null` como um erro ou dado incompleto).
 * É preenchido automaticamente no momento do CADASTRO (ver
 * `studentService.createStudent`), nunca editado manualmente pelo
 * formulário.
 */
export interface Student {
  id: string;
  name: string;
  email: string;
  registrationNumber: string;
  classId: string | null;
  status: StudentStatus;
  average: number | null;
  uid: string | null;
  /**
   * URL pública da foto de perfil OFICIAL do aluno (Cloudinary,
   * `public_id` `tekidu/student-photos/{studentId}` — ver
   * `services/students/studentPhotoService.ts`). `null` = aluno ainda
   * sem foto cadastrada (estado válido e esperado).
   *
   * REGRA DE AUTORIDADE (segurança, não só UI): só o ADMIN pode alterar
   * este campo. A Firestore Security Rule de `students/{studentId}`
   * (`firestore.rules`) bloqueia qualquer `update` que toque
   * `photoURL`/`photoUpdatedAt` vindo de quem não é admin ativo — o
   * mesmo vale para o objeto correspondente no Cloudinary, verificado
   * pela Cloudflare Pages Function (`functions/api/student-photo`)
   * antes de assinar qualquer upload. Nunca grave este campo a partir
   * do formulário genérico de aluno (`StudentFormModal`/`updateStudent`);
   * use sempre `uploadStudentPhoto`/`removeStudentPhoto`.
   */
  photoURL: string | null;
  /**
   * Timestamp da última alteração de foto. Existe só para permitir
   * cache-busting determinístico no `<img>` (o token de download do
   * Storage nem sempre muda ao sobrescrever o mesmo caminho) — não tem
   * uso além disso. `null` = nunca teve foto alterada.
   */
  photoUpdatedAt: unknown; // Firestore Timestamp | null
  createdAt: unknown; // Firestore Timestamp
  updatedAt: unknown; // Firestore Timestamp
}

/**
 * Payload aceito pelo formulário de criação/edição de aluno.
 * Não inclui `uid`: esse campo nunca é digitado, é sempre derivado da
 * criação da conta de Authentication (ver `studentService.createStudent`)
 * ou preservado como estava em uma edição (ver `studentService.updateStudent`).
 */
export interface StudentInput {
  name: string;
  email: string;
  registrationNumber: string;
  classId: string | null;
  status: StudentStatus;
  average: number | null;
}
