/**
 * Papéis suportados pela aplicação.
 * Este union type é a "fonte da verdade" no frontend — ele espelha
 * (mas não substitui) a validação feita nas Firestore Security Rules.
 */
export type UserRole = "student" | "teacher" | "admin";

/**
 * Formato do documento em: users/{uid}
 * Este documento é criado no momento do cadastro/login inicial e é
 * a ponte entre a identidade (Firebase Authentication) e os dados
 * acadêmicos armazenados no Firestore.
 */
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: unknown; // Firestore Timestamp

  /**
   * Ciclo de vida de conta estilo SUAP (Etapa 9).
   *
   * `true` desde a criação da conta (por `createTeacher`/`createStudent`)
   * até o usuário concluir o primeiro acesso (`FirstAccessPage`), quando
   * passa a `false`. `ProtectedRoute` usa este campo para forçar a rota
   * `/primeiro-acesso` antes de liberar qualquer outra tela.
   *
   * `undefined` é tratado como `false` (contas de admin criadas
   * manualmente via Firebase Console, ou qualquer documento anterior a
   * esta mudança, nunca passam pelo fluxo de primeiro acesso).
   */
  mustSetPassword?: boolean;

  /**
   * Identificador de primeiro acesso: matrícula (aluno) ou chave
   * aleatória de 8 caracteres (professor, sem matrícula). Espelha o
   * `id` do documento em `loginKeys/{loginKey}` usado para resolver
   * matrícula/chave → e-mail ANTES do login (usuário ainda não está
   * autenticado nesse momento — ver `firestore.rules`).
   * `null`/`undefined` depois que `mustSetPassword` vira `false`: a
   * chave é de uso único e é apagada (junto com `loginKeys/{loginKey}`)
   * assim que o primeiro acesso é concluído.
   */
  loginKey?: string | null;

  /** Quando a senha/chave temporária foi gerada (para o prazo de validade). */
  tempPasswordSetAt?: unknown; // Firestore Timestamp | null

  /**
   * Prazo de validade da credencial temporária (Decisão 3: 48h a
   * partir da criação). Depois desse prazo, a tela de login recusa a
   * usar a matrícula/chave para resolver o e-mail — ver nota de
   * limitação em `FIREBASE_SETUP.md`: sem Cloud Functions/Admin SDK,
   * isso é uma barreira de UX, não uma invalidação real da senha no
   * Firebase Authentication.
   */
  tempCredentialsExpireAt?: unknown; // Firestore Timestamp | null
}
