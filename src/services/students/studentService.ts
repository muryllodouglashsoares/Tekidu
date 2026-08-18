import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { createStaffAuthAccount, db } from "@/lib/firebase";
import type { Student, StudentInput } from "@/types/student";

const studentsCollection = collection(db, "students");

/**
 * Payload aceito ao CADASTRAR um novo aluno (Tarefa 2, Fase 1 pós-
 * auditoria V8). Estende `StudentInput` com a senha provisória da
 * conta de Authentication — mesmo padrão de `TeacherCreateInput`
 * (`services/users/userService.ts`). Só existe no momento da criação:
 * uma edição posterior nunca recria nem troca a senha da conta (ver
 * `updateStudent`, que usa `StudentInput` puro, sem senha).
 */
export interface StudentCreateInput extends StudentInput {
  password: string;
}

function toStudent(id: string, data: Record<string, unknown>): Student {
  return {
    id,
    name: (data.name as string) ?? "",
    email: (data.email as string) ?? "",
    registrationNumber: (data.registrationNumber as string) ?? "",
    classId: (data.classId as string | null) ?? null,
    status: (data.status as Student["status"]) ?? "active",
    average: (data.average as number | null) ?? null,
    // `uid` não existe nos documentos cadastrados antes desta mudança
    // (Tarefa 2) — `?? null` trata a ausência do campo exatamente
    // como o estado "sem conta vinculada ainda", sem exigir migração.
    uid: (data.uid as string | null) ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Lista todos os alunos ordenados por data de matrícula (mais recentes
 * primeiro). Consulta simples de campo único — não exige a criação de
 * nenhum índice composto no Firestore.
 */
export async function getStudents(): Promise<Student[]> {
  const q = query(studentsCollection, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toStudent(d.id, d.data()));
}

export async function getStudentById(id: string): Promise<Student | null> {
  const snapshot = await getDoc(doc(db, "students", id));
  if (!snapshot.exists()) return null;
  return toStudent(snapshot.id, snapshot.data());
}

/**
 * Resolve o documento `students/{studentId}` do aluno autenticado a
 * partir do `uid` do Firebase Authentication (Tarefa 3, Fase 1
 * pós-auditoria V8) — pré-requisito do Portal do Aluno: a tela do
 * aluno precisa descobrir "qual documento de students é o meu" sem
 * exigir que ele escolha manualmente (diferente do fluxo de staff em
 * Boletim, que escolhe turma → aluno).
 *
 * A query `where('uid', '==', uid)` é o padrão exigido pela Security
 * Rule de `students/{studentId}` (Tarefa 2): o filtro de igualdade
 * bate exatamente com a condição da regra (`resource.data.uid ==
 * request.auth.uid`), o que permite ao Firestore validar a consulta
 * sem precisar de um `list` irrestrito. `limit(1)` porque `uid` é
 * único por aluno (definido na criação, nunca duplicado).
 */
export async function getStudentByUid(uid: string): Promise<Student | null> {
  const q = query(studentsCollection, where("uid", "==", uid), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const first = snapshot.docs[0];
  return toStudent(first.id, first.data());
}

/**
 * Cadastra um novo aluno: cria a conta de login (Firebase
 * Authentication, via App secundário — ver `createStaffAuthAccount`
 * em `lib/firebase.ts`, reaproveitada do fluxo de professores), grava
 * o `uid` retornado no documento `students/{studentId}` e cria o
 * documento espelho `users/{uid}` com `role: "student"` (Tarefa 2,
 * Fase 1 pós-auditoria V8).
 *
 * POR QUE TAMBÉM `users/{uid}`: todo o sistema de rotas/permissões
 * (`AuthContext`, `ProtectedRoute`) decide o que renderizar a partir
 * de `profile.role`, lido de `users/{uid}` — NUNCA a partir de
 * `students/{studentId}`. Gravar `uid` apenas no documento de aluno
 * não seria suficiente: o aluno conseguiria autenticar no Firebase,
 * mas cairia em "perfil ausente" (`/sem-perfil`, ver
 * `ProtectedRoute.tsx`) por não existir `users/{uid}` — o mesmo
 * documento que já é a "ponte" entre Authentication e a role da
 * aplicação para admin/teacher. Este é o mesmo padrão de
 * `userService.createTeacher`, só que com `role: "student"`.
 *
 * `active: true` é fixo aqui porque a coleção `students` não tem hoje
 * um fluxo de ativar/desativar login do aluno (diferente de
 * `TeachersPage`, que tem `Power`/`updateTeacherProfile`) — isso fica
 * fora do escopo desta tarefa; se for necessário revogar o acesso de
 * um aluno no futuro, é uma extensão a fazer sobre este mesmo campo.
 *
 * REQUISITO EXTERNO: a Security Rule de `users/{userId}` precisa
 * permitir que staff ativo (admin OU professor, o mesmo que já pode
 * cadastrar um aluno em `students`) crie um documento com
 * `role == 'student'` — ver `firestore.rules`.
 */
export async function createStudent(data: StudentCreateInput): Promise<string> {
  const { password, ...studentInput } = data;
  const uid = await createStaffAuthAccount(studentInput.email, password);
  await setDoc(doc(db, "users", uid), {
    uid,
    name: studentInput.name,
    email: studentInput.email,
    role: "student",
    active: true,
    createdAt: serverTimestamp(),
  });
  const ref = await addDoc(studentsCollection, {
    ...studentInput,
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Atualiza os dados de um aluno já cadastrado. NUNCA toca em `uid`:
 * o vínculo com a conta de Authentication é definido uma única vez,
 * no cadastro (`createStudent`) — uma edição não recria nem
 * transfere a conta. Alunos cadastrados antes da Tarefa 2 permanecem
 * com `uid: null` até serem migrados (fora do escopo desta fase);
 * editar qualquer outro campo deles continua funcionando normalmente.
 */
export async function updateStudent(id: string, data: StudentInput): Promise<void> {
  await updateDoc(doc(db, "students", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteStudent(id: string): Promise<void> {
  await deleteDoc(doc(db, "students", id));
}
