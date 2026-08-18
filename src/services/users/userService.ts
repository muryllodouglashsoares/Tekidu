import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { createStaffAuthAccount, db } from "@/lib/firebase";
import { logAuditEvent } from "@/services/audit/auditService";
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
 *
 * Registra um evento de auditoria (Tarefa 4, Fase 1 pós-auditoria V8):
 * antes desta mudança, criar um professor (e, com isso, uma conta de
 * acesso ao sistema) não deixava nenhum rastro. Não há "antes" (o
 * documento não existia) — `before: null`. Segue o comportamento
 * "fire-and-forget" já documentado em `auditService.ts`.
 */
export async function createTeacher(
  data: TeacherCreateInput,
  actor: { id: string; name: string }
): Promise<string> {
  const uid = await createStaffAuthAccount(data.email, data.password);
  await setDoc(doc(db, "users", uid), {
    uid,
    name: data.name,
    email: data.email,
    role: "teacher",
    active: true,
    createdAt: serverTimestamp(),
  });
  logAuditEvent({
    type: "teacher_created",
    actorId: actor.id,
    actorName: actor.name,
    before: null,
    after: `${data.name} <${data.email}>`,
  });
  return uid;
}

/**
 * Atualiza nome e status (ativo/inativo) de um professor já cadastrado.
 * E-mail e senha não são editáveis por aqui: alterá-los exigiria agir
 * sobre a própria conta de Authentication do professor (reautenticação),
 * o que o SDK do cliente não permite fazer em nome de outro usuário.
 *
 * Registra um evento de auditoria (Tarefa 4, Fase 1 pós-auditoria V8)
 * SOMENTE quando `active` de fato muda — uma edição que só altera o
 * nome não gera log de ativação/desativação. Busca o estado ANTERIOR
 * (`getDoc`) antes de aplicar a atualização, para comparar contra o
 * valor realmente salvo no servidor (não um valor em memória que o
 * chamador possa ter desatualizado).
 */
export async function updateTeacherProfile(
  uid: string,
  data: { name: string; active: boolean },
  actor: { id: string; name: string }
): Promise<void> {
  const beforeSnapshot = await getDoc(doc(db, "users", uid));
  const wasActive = beforeSnapshot.exists()
    ? ((beforeSnapshot.data() as UserProfile).active as boolean)
    : null;

  await updateDoc(doc(db, "users", uid), {
    name: data.name,
    active: data.active,
  });

  if (wasActive !== null && wasActive !== data.active) {
    logAuditEvent({
      type: "teacher_status_changed",
      actorId: actor.id,
      actorName: actor.name,
      before: wasActive ? "Ativo" : "Inativo",
      after: data.active ? "Ativo" : "Inativo",
    });
  }
}

/**
 * Auto-atualização do nome de exibição, usada pela aba "Perfil" de
 * Configurações (item 23 do briefing). Diferente de
 * `updateTeacherProfile` (que só um admin pode chamar, e só para
 * professores), esta função é para o PRÓPRIO usuário editar o
 * PRÓPRIO nome — por isso grava apenas `name`, nunca `role`/`active`.
 * Requer a extensão de `firestore.rules` documentada em
 * `match /users/{userId}` (auto-edição restrita ao campo `name`).
 */
export async function updateOwnName(uid: string, name: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { name });
}
