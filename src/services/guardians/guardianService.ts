import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth, createStaffAuthAccount, db } from "@/lib/firebase";
import { logAuditEvent } from "@/services/audit/auditService";
import { sendFirstAccessEmail } from "@/services/email/emailService";
import { generateLoginKey, generateTempPassword, TEMP_CREDENTIALS_TTL_MS } from "@/lib/credentials";
import { getActiveAdmins } from "@/services/users/userService";
import { createNotifications } from "@/services/notifications/notificationService";
import type { UserProfile } from "@/types/user";

const usersCollection = collection(db, "users");

/**
 * PARTE 2/3 do plano de evolução — Portal do Responsável.
 *
 * ADAPTAÇÃO DE MODELO (documentada aqui porque diverge do prompt
 * original): o plano descrevia uma coleção própria
 * `guardians/{guardianUid}` com os campos `{uid, name, email, role,
 * active, createdAt}` — um espelho quase idêntico ao que
 * `users/{uid}` já guarda para TODA role (ver `types/user.ts`,
 * `UserProfile`). Criar essa segunda coleção duplicaria a identidade
 * do responsável em dois documentos que precisariam ser mantidos
 * sincronizados a cada edição (nome, ativação/desativação), sem
 * nenhum dado genuinamente novo — na prática, uma "segunda
 * arquitetura paralela" para a mesma informação, que a REGRA
 * FUNDAMENTAL do plano pede explicitamente para evitar.
 *
 * Este serviço usa `users/{uid}` (role: "guardian") como ÚNICA fonte
 * de verdade da identidade do responsável — exatamente como já
 * acontece para professor/aluno — e modela a única coisa que de fato
 * não existia em lugar nenhum: a RELAÇÃO responsável↔aluno, guardada
 * em `students/{studentId}.guardianUids` (ver `types/student.ts`).
 * O "conceito" pedido pelo plano (responsável como entidade própria,
 * com um vínculo claro e seguro ao aluno) continua todo presente —
 * só sem duplicar o que já existia.
 */

/**
 * Cadastra um novo responsável E já o vincula ao aluno informado.
 * Espelha (deliberadamente, ver `userService.createTeacher`) o mesmo
 * ciclo de vida de conta estilo SUAP: o admin nunca digita senha, o
 * sistema gera credencial temporária + chave de primeiro acesso de 8
 * caracteres (responsável não tem matrícula, mesma situação do
 * professor) e envia por e-mail ANTES de criar qualquer coisa no
 * Firebase — mesma ordem e mesmo racional de robustez a falha
 * documentados em `createTeacher` (evita conta "zumbi" se o e-mail
 * falhar).
 *
 * REQUISITO EXTERNO: `firestore.rules` precisa permitir que um admin
 * ativo crie `users/{uid}` com `role == 'guardian'` (ver extensão da
 * regra original de `users`/`loginKeys`).
 */
export async function createGuardian(
  data: { name: string; email: string },
  studentId: string,
  actor: { id: string; name: string }
): Promise<string> {
  const email = data.email.trim();

  const existingMethods = await fetchSignInMethodsForEmail(auth, email);
  if (existingMethods.length > 0) {
    throw new Error(
      `Já existe uma conta cadastrada com o e-mail ${email}. Use "Vincular responsável existente" em vez de cadastrar um novo.`
    );
  }

  const tempPassword = generateTempPassword();
  const loginKey = generateLoginKey();
  const expiresAt = Timestamp.fromMillis(Date.now() + TEMP_CREDENTIALS_TTL_MS);

  // Mesma ordem proposital de `createTeacher`/`createStudent`: o
  // e-mail sai ANTES de qualquer escrita no Firebase.
  await sendFirstAccessEmail({
    to: email,
    name: data.name,
    role: "guardian",
    loginIdentifierLabel: "Chave de acesso",
    loginIdentifierValue: loginKey,
    tempPassword,
    expiresAtLabel: expiresAt.toDate().toLocaleString("pt-BR"),
  });

  const uid = await createStaffAuthAccount(email, tempPassword);
  await setDoc(doc(db, "users", uid), {
    uid,
    name: data.name,
    email,
    role: "guardian",
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
    role: "guardian",
    expiresAt,
  });

  // Vínculo com o aluno (ver nota de adaptação acima) — se esta
  // chamada falhar depois da conta já criada com sucesso, o
  // responsável fica com login válido mas sem nenhum filho vinculado
  // ainda; a UI (`GuardianManagementCard`) permite tentar vincular de
  // novo sem precisar recriar a conta (ver `linkGuardianToStudent`).
  await linkGuardianToStudent(studentId, uid);

  logAuditEvent({
    type: "guardian_created",
    actorId: actor.id,
    actorName: actor.name,
    before: null,
    after: `${data.name} <${email}>`,
    studentId,
  });

  // Reaproveita o tipo de notificação "teacher_created" (rótulo "Novo
  // usuário") em vez de criar mais um tipo só para esta variação —
  // o texto de `title`/`message` abaixo já deixa claro que se trata
  // de um responsável; nenhuma tela filtra notificações por tipo de
  // forma que essa distinção mais fina faria diferença hoje.

  getActiveAdmins(actor.id)
    .then((admins) => {
      createNotifications(
        admins.map((admin) => ({
          recipientUid: admin.uid,
          type: "teacher_created",
          title: "Novo responsável cadastrado",
          message: `${actor.name} cadastrou ${data.name} como responsável.`,
          link: `/alunos/${studentId}`,
        }))
      );
    })
    .catch((error) => {
      console.error("[guardianService] Falha ao notificar admins sobre novo responsável", error);
    });

  return uid;
}

/**
 * Localiza um responsável JÁ CADASTRADO pelo e-mail — usado pelo fluxo
 * "vincular responsável existente" (o admin digita o e-mail de um
 * responsável que já tem conta, por já ser responsável por outro
 * aluno, e só precisa adicionar o vínculo com este novo aluno).
 *
 * Consulta direta em `users` (liberada a qualquer staff ativo pela
 * Security Rule — mesmo padrão já usado por `userService.getAllTeachers`/
 * `getActiveAdmins`), filtrando por `role` E `email` para nunca
 * confundir com uma conta de outra role que use o mesmo e-mail (o
 * Firebase Authentication já garante e-mail único por conta, mas o
 * filtro por role documenta a intenção da consulta).
 */
export async function getGuardianByEmail(email: string): Promise<UserProfile | null> {
  const q = query(
    usersCollection,
    where("role", "==", "guardian"),
    where("email", "==", email.trim()),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as UserProfile;
}

/** Adiciona `guardianUid` a `students/{studentId}.guardianUids` (idempotente — `arrayUnion`). */
export async function linkGuardianToStudent(
  studentId: string,
  guardianUid: string,
  audit?: { actor: { id: string; name: string }; studentName: string; guardianName: string }
): Promise<void> {
  await updateDoc(doc(db, "students", studentId), {
    guardianUids: arrayUnion(guardianUid),
    updatedAt: serverTimestamp(),
  });
  if (audit) {
    logAuditEvent({
      type: "guardian_linked",
      actorId: audit.actor.id,
      actorName: audit.actor.name,
      studentId,
      studentName: audit.studentName,
      before: null,
      after: audit.guardianName,
    });
  }
}

/** Remove `guardianUid` de `students/{studentId}.guardianUids`. */
export async function unlinkGuardianFromStudent(
  studentId: string,
  guardianUid: string,
  audit?: { actor: { id: string; name: string }; studentName: string; guardianName: string }
): Promise<void> {
  await updateDoc(doc(db, "students", studentId), {
    guardianUids: arrayRemove(guardianUid),
    updatedAt: serverTimestamp(),
  });
  if (audit) {
    logAuditEvent({
      type: "guardian_unlinked",
      actorId: audit.actor.id,
      actorName: audit.actor.name,
      studentId,
      studentName: audit.studentName,
      before: audit.guardianName,
      after: null,
    });
  }
}

/**
 * Perfis dos responsáveis vinculados a um aluno (para a seção
 * "Responsáveis" da ficha do aluno no admin) — resolve cada uid de
 * `guardianUids` para o respectivo `users/{uid}` (leitura liberada a
 * qualquer staff ativo). `Promise.all` de `getDoc`s individuais, não
 * uma query: `guardianUids` normalmente tem 1–2 entradas, então o
 * custo de N leituras avulsas é irrelevante, e não existe um operador
 * de query "documento cujo ID está numa lista de uids" além de
 * `where(documentId(), 'in', ...)`, que exigiria montar `DocumentReference`s
 * manualmente sem ganho real aqui.
 */
export async function getGuardiansForStudent(guardianUids: string[]): Promise<UserProfile[]> {
  if (guardianUids.length === 0) return [];
  const snapshots = await Promise.all(guardianUids.map((uid) => getDoc(doc(db, "users", uid))));
  return snapshots.filter((s) => s.exists()).map((s) => s.data() as UserProfile);
}
