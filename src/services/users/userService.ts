import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { createStaffAuthAccount, db } from "@/lib/firebase";
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

/**
 * Lista TODOS os professores (ativos e inativos), para a tela de
 * cadastro/gerenciamento de professores. Diferente de `getTeachers`,
 * que só traz ativos (uso restrito ao seletor de "Professor
 * responsável" em Disciplinas).
 */
export async function getAllTeachers(): Promise<UserProfile[]> {
  const q = query(usersCollection, where("role", "==", "teacher"));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => d.data() as UserProfile)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Payload aceito pelo formulário de cadastro de professor. */
export interface TeacherCreateInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Cadastra um novo professor: cria a conta de login (Firebase
 * Authentication, via App secundário — ver `createStaffAuthAccount`
 * em `lib/firebase.ts`) e o documento correspondente em `users/{uid}`
 * com `role: "teacher"`.
 *
 * REQUISITO EXTERNO: a Security Rule de `users/{userId}` precisa
 * permitir que um admin ativo crie este documento (ver `firestore.rules`
 * — por padrão a coleção só permite leitura). Sem isso, a chamada a
 * `setDoc` abaixo é rejeitada pelo servidor mesmo com a conta de
 * Authentication já criada.
 */
export async function createTeacher(data: TeacherCreateInput): Promise<string> {
  const uid = await createStaffAuthAccount(data.email, data.password);
  await setDoc(doc(db, "users", uid), {
    uid,
    name: data.name,
    email: data.email,
    role: "teacher",
    active: true,
    createdAt: serverTimestamp(),
  });
  return uid;
}

/**
 * Atualiza nome e status (ativo/inativo) de um professor já cadastrado.
 * E-mail e senha não são editáveis por aqui: alterá-los exigiria agir
 * sobre a própria conta de Authentication do professor (reautenticação),
 * o que o SDK do cliente não permite fazer em nome de outro usuário.
 */
export async function updateTeacherProfile(
  uid: string,
  data: { name: string; active: boolean }
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    name: data.name,
    active: data.active,
  });
}
