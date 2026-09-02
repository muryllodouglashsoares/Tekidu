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
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth, createStaffAuthAccount, db } from "@/lib/firebase";
import { sendFirstAccessEmail } from "@/services/email/emailService";
import { generateTempPassword, TEMP_CREDENTIALS_TTL_MS } from "@/lib/credentials";
import type { Student, StudentInput } from "@/types/student";

const studentsCollection = collection(db, "students");

/**
 * Payload aceito ao CADASTRAR um novo aluno (Tarefa 2, Fase 1 pós-
 * auditoria V8). Idêntico a `StudentInput` desde a Etapa 9: o campo
 * `password` foi removido — o sistema gera a senha temporária
 * internamente (ciclo de vida de conta estilo SUAP), o admin não digita
 * mais senha nenhuma. Mantido como alias explícito (em vez de apontar
 * direto para `StudentInput` nos imports) para não obrigar quem já
 * importa `StudentCreateInput` a trocar o nome do tipo.
 */
export type StudentCreateInput = StudentInput;

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
 *
 * CICLO DE VIDA DE CONTA ESTILO SUAP (Etapa 9, Decisão 2 = Opção B(i)):
 * a senha nunca é digitada por quem cadastra — é gerada aqui
 * (`generateTempPassword`) e enviada só por e-mail. O identificador de
 * primeiro acesso do aluno é a própria matrícula (`registrationNumber`,
 * já um campo natural do cadastro — Decisão 1), então, diferente do
 * professor, não é preciso gerar uma chave extra: `loginKeys/{matrícula}`
 * é criado usando o valor já digitado no formulário. Isso reaproveita
 * exatamente o mesmo mecanismo de resolução "identificador → e-mail"
 * ANTES do login usado para professores — ver `userService.ts`
 * (`resolveLoginKey`/`completeFirstAccess`, compartilhadas pelas duas
 * roles) e `firestore.rules` (`match /loginKeys/{key}`).
 *
 * MATRÍCULA PRECISA SER ÚNICA (correção pós-primeira versão da Etapa
 * 9): como a matrícula vira o ID do documento `loginKeys/{matrícula}`,
 * cadastrar dois alunos com a mesma matrícula faria o segundo
 * `setDoc` SOBRESCREVER silenciosamente a chave do primeiro — o
 * primeiro aluno passaria a resolver para a conta do segundo e nunca
 * mais conseguiria fazer o primeiro acesso. `assertRegistrationNumberIsUnique`
 * below bloqueia isso ANTES de gerar qualquer credencial ou enviar
 * e-mail. Nunca existia essa checagem antes desta correção — não é
 * algo que a Etapa 9 introduziu, mas que ela tornou crítico (antes, a
 * matrícula duplicada era só um dado inconsistente; agora ela quebra
 * o login de outra pessoa).
 *
 * SE O E-MAIL FALHAR: mesma correção de `userService.createTeacher` —
 * o e-mail é enviado ANTES de criar qualquer coisa no Firebase, então
 * uma falha aqui não deixa rastro (nem conta, nem `users/{uid}`, nem
 * `loginKeys/{matrícula}`) e uma nova tentativa funciona normalmente.
 */
export async function createStudent(data: StudentCreateInput): Promise<string> {
  const studentInput = data;
  const loginKey = studentInput.registrationNumber.trim();
  const email = studentInput.email.trim();

  // PREFLIGHT 1/3 — matrícula única (ver comentário acima).
  await assertRegistrationNumberIsUnique(loginKey);

  // PREFLIGHT 2/3 — e-mail já cadastrado, mesmo raciocínio de
  // `userService.createTeacher`.
  const existingMethods = await fetchSignInMethodsForEmail(auth, email);
  if (existingMethods.length > 0) {
    throw new Error(
      `Já existe uma conta cadastrada com o e-mail ${email}. Verifique se este aluno já foi cadastrado.`
    );
  }

  const tempPassword = generateTempPassword();
  const expiresAt = Timestamp.fromMillis(Date.now() + TEMP_CREDENTIALS_TTL_MS);

  // PREFLIGHT 3/3 (na prática, o passo principal) — envia o e-mail
  // ANTES de criar qualquer coisa no Firebase. Ver nota "SE O E-MAIL
  // FALHAR" acima.
  await sendFirstAccessEmail({
    to: email,
    name: studentInput.name,
    role: "student",
    loginIdentifierLabel: "Matrícula",
    loginIdentifierValue: loginKey,
    tempPassword,
    expiresAtLabel: expiresAt.toDate().toLocaleString("pt-BR"),
  });

  const uid = await createStaffAuthAccount(email, tempPassword);
  await setDoc(doc(db, "users", uid), {
    uid,
    name: studentInput.name,
    email,
    role: "student",
    active: true,
    createdAt: serverTimestamp(),
    mustSetPassword: true,
    loginKey,
    tempPasswordSetAt: serverTimestamp(),
    tempCredentialsExpireAt: expiresAt,
  });
  await setDoc(doc(db, "loginKeys", loginKey), {
    uid,
    email,
    role: "student",
    expiresAt,
  });
  const ref = await addDoc(studentsCollection, {
    ...studentInput,
    email,
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

/**
 * Garante que nenhum outro aluno já usa esta matrícula. Consulta
 * direta em `students` (não em `loginKeys`, que só guarda a matrícula
 * ENQUANTO `mustSetPassword` for `true` — depois do primeiro acesso a
 * chave é apagada, então checar só ali deixaria passar duplicatas
 * envolvendo alunos que já concluíram o primeiro acesso).
 *
 * Corrida (race condition) entre duas checagens simultâneas continua
 * teoricamente possível — o SDK do cliente não tem transação que
 * abranja `students` (coleção com ID autogerado) e `loginKeys` (ID =
 * matrícula) de forma atômica. Aceitável para o volume de uso de um
 * cadastro manual feito por um admin por vez; uma garantia realmente
 * atômica exigiria Cloud Functions (mesma limitação já reconhecida na
 * Decisão 2).
 */
async function assertRegistrationNumberIsUnique(registrationNumber: string): Promise<void> {
  const snapshot = await getDocs(
    query(studentsCollection, where("registrationNumber", "==", registrationNumber), limit(1))
  );
  if (!snapshot.empty) {
    throw new Error(`A matrícula "${registrationNumber}" já está em uso por outro aluno.`);
  }
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
