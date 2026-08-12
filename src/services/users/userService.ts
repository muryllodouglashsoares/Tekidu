import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/types/user";

const usersCollection = collection(db, "users");

/**
 * Lista os professores ativos, para uso no seletor "Professor responsável"
 * do formulário de Disciplinas.
 *
 * Reaproveita a coleção `users` já existente (ponte com o Firebase
 * Authentication) em vez de criar uma coleção de professores separada.
 * Requer que `firestore.rules` permita a membros de staff ativos ler
 * (get/list) qualquer documento em `users` — ver a nota em
 * `firestore.rules` sobre essa extensão da regra original (que só
 * permitia cada usuário ler o próprio documento).
 */
export async function getTeachers(): Promise<UserProfile[]> {
  const q = query(
    usersCollection,
    where("role", "==", "teacher"),
    where("active", "==", true)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as UserProfile);
}
