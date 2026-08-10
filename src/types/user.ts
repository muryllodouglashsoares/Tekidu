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
}
