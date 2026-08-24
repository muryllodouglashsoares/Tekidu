import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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
import { createNotifications } from "@/services/notifications/notificationService";
import { sendFirstAccessEmail } from "@/services/email/emailService";
import { generateLoginKey, generateTempPassword, TEMP_CREDENTIALS_TTL_MS } from "@/lib/credentials";
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

/**
 * Lista os admins com conta ativa, exceto (opcionalmente) um deles —
 * usado para notificar "os outros admins" quando um evento
 * administrativo acontece (Fase 5 — "novo usuário"), sem notificar o
 * próprio autor da ação.
 */
export async function getActiveAdmins(excludeUid?: string): Promise<UserProfile[]> {
  const q = query(usersCollection, where("role", "==", "admin"), where("active", "==", true));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => d.data() as UserProfile)
    .filter((admin) => admin.uid !== excludeUid);
}

/** Payload aceito pelo formulário de cadastro de professor. */
export interface TeacherCreateInput {
  name: string;
  email: string;
}

/**
 * Cadastra um novo professor: cria a conta de login (Firebase
 * Authentication, via App secundário — ver `createStaffAuthAccount`
 * em `lib/firebase.ts`) e o documento correspondente em `users/{uid}`
 * com `role: "teacher"`.
 *
 * CICLO DE VIDA DE CONTA ESTILO SUAP (Etapa 9, Decisão 2 = Opção B(i)):
 * o admin NÃO digita mais senha nenhuma. O sistema gera uma senha
 * temporária (`generateTempPassword`) e, como o professor não tem
 * matrícula, uma chave de primeiro acesso de 8 caracteres
 * (`generateLoginKey`, Decisão 1 = opção "a"). Grava:
 * - `users/{uid}` com `mustSetPassword: true`, `loginKey` e o prazo de
 *   validade (`tempCredentialsExpireAt`, Decisão 3 = 48h);
 * - `loginKeys/{loginKey}` — coleção auxiliar que existe SÓ para
 *   permitir resolver "chave → e-mail" ANTES do login (usuário ainda
 *   não está autenticado nesse momento). Usar o valor da própria chave
 *   como ID do documento (em vez de uma query) é o que permite à
 *   Security Rule liberar um `get` anônimo estreito, sem nunca abrir
 *   `list` — ver `firestore.rules`.
 * Nenhuma das duas credenciais é retornada para a UI: elas só existem
 * no Firebase Authentication e no corpo do e-mail (ver
 * `sendFirstAccessEmail`, chamado no fim desta função).
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
 *
 * SE O E-MAIL FALHAR: como o envio acontece ANTES de criar qualquer
 * coisa no Firebase (ver comentário no corpo da função, correção pós-
 * primeira versão da Etapa 9), uma falha aqui não deixa NENHUM rastro
 * — nem conta de Authentication, nem `users/{uid}`, nem
 * `loginKeys/{loginKey}`. O erro é relançado para a UI avisar o admin
 * explicitamente (regra "sem dado fake" da Etapa 9), e uma nova
 * tentativa de cadastro com o mesmo e-mail funciona normalmente assim
 * que a causa do erro (EmailJS não configurada, limite mensal, rede) for
 * corrigida — sem precisar limpar nada manualmente antes.
 */
export async function createTeacher(
  data: TeacherCreateInput,
  actor: { id: string; name: string }
): Promise<string> {
  const email = data.email.trim();

  // PREFLIGHT 1/2 — checagem de e-mail já cadastrado. Sem isto, uma
  // segunda tentativa de cadastro com o mesmo e-mail (ex.: depois de
  // corrigir a configuração do provedor de e-mail numa tentativa anterior que já
  // tinha criado a conta antes de falhar o e-mail — ver nota abaixo)
  // falharia com um `auth/email-already-in-use` genérico do Firebase,
  // sem explicar o motivo real ao admin.
  const existingMethods = await fetchSignInMethodsForEmail(auth, email);
  if (existingMethods.length > 0) {
    throw new Error(
      `Já existe uma conta cadastrada com o e-mail ${email}. Verifique se este professor já foi cadastrado.`
    );
  }

  const tempPassword = generateTempPassword();
  const loginKey = generateLoginKey();
  const expiresAt = Timestamp.fromMillis(Date.now() + TEMP_CREDENTIALS_TTL_MS);

  // ORDEM PROPOSITAL — corrige inconsistência encontrada após a
  // primeira versão da Etapa 9: o e-mail é enviado ANTES de criar
  // qualquer coisa no Firebase (Authentication, `users/{uid}`,
  // `loginKeys/{loginKey}`). Antes, a conta e os documentos eram
  // criados primeiro e o e-mail por último — se o envio falhasse (ex.:
  // EmailJS não configurada), a conta ficava "zumbi": já existia no
  // Authentication e no Firestore, mas ninguém tinha recebido a
  // credencial, e uma nova tentativa de cadastro com o mesmo e-mail
  // passava a falhar com `auth/email-already-in-use`, sem nenhum jeito
  // de recuperar pela UI. Enviando o e-mail primeiro, uma falha aqui
  // (EmailJS não configurada, limite mensal, rede) não deixa NENHUM rastro no
  // Firebase — o admin corrige o problema e tenta cadastrar de novo
  // normalmente, sem conflito.
  //
  // Contrapartida aceita: se o e-mail for enviado com sucesso mas a
  // criação da conta (linhas abaixo) falhar por algum motivo raro
  // (rede cai exatamente nesse meio-tempo, por exemplo), o e-mail já
  // enviado descreve uma conta que não chegou a existir. Isso é
  // preferível ao cenário anterior porque não bloqueia a próxima
  // tentativa: o e-mail antigo simplesmente vira lixo inofensivo, e um
  // novo cadastro gera uma nova credencial válida.
  await sendFirstAccessEmail({
    to: email,
    name: data.name,
    role: "teacher",
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
    role: "teacher",
    active: true,
    createdAt: serverTimestamp(),
    mustSetPassword: true,
    loginKey,
    tempPasswordSetAt: serverTimestamp(),
    tempCredentialsExpireAt: expiresAt,
  });
  // Documento auxiliar para resolver "chave → e-mail" antes do login
  // (usuário ainda não está autenticado) — ver comentário acima e
  // `firestore.rules` (`match /loginKeys/{key}`).
  await setDoc(doc(db, "loginKeys", loginKey), {
    uid,
    email,
    role: "teacher",
    expiresAt,
  });

  logAuditEvent({
    type: "teacher_created",
    actorId: actor.id,
    actorName: actor.name,
    before: null,
    after: `${data.name} <${email}>`,
  });

  // Fase 5 — notifica os DEMAIS admins ativos ("novo usuário"). Fire-
  // and-forget (ver notificationService): o cadastro do professor já
  // está concluído nesse ponto, independente do resultado disto.
  getActiveAdmins(actor.id)
    .then((admins) => {
      createNotifications(
        admins.map((admin) => ({
          recipientUid: admin.uid,
          type: "teacher_created",
          title: "Novo professor cadastrado",
          message: `${actor.name} cadastrou ${data.name} como professor(a).`,
          link: "/professores",
        }))
      );
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error("[userService] Falha ao notificar admins sobre novo professor", error);
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

/**
 * Resultado da resolução de matrícula/chave → e-mail (Fase 2 do ciclo
 * de vida de conta, Etapa 9). `loginKeys/{loginKey}` é lido de forma
 * ANÔNIMA (usuário ainda não autenticado) — a Security Rule permite um
 * `get` estreito por ID de documento, nunca um `list` (ver
 * `firestore.rules`).
 */
export interface ResolvedLoginKey {
  uid: string;
  email: string;
  role: "teacher" | "student";
  /** true quando a credencial passou do prazo de validade (Decisão 3). */
  expired: boolean;
}

/**
 * Resolve uma matrícula (aluno) ou chave de primeiro acesso (professor)
 * para o e-mail correspondente, ANTES do login — necessário porque o
 * Firebase Authentication só autentica por e-mail
 * (`signInWithEmailAndPassword`), nunca por matrícula/chave.
 *
 * Retorna `null` quando a chave não existe OU já foi consumida (o
 * documento é apagado ao final do primeiro acesso — ver
 * `completeFirstAccess`), sem distinguir os dois casos para quem chama:
 * do ponto de vista de quem está tentando entrar, "não existe" e "já
 * foi usada" merecem a mesma mensagem genérica de erro.
 *
 * `expired: true` é um sinal de UX, não uma barreira real: sem Cloud
 * Functions/Admin SDK não é possível invalidar a senha no Firebase
 * Authentication automaticamente após o prazo — ver limitação
 * documentada em `FIREBASE_SETUP.md`.
 */
export async function resolveLoginKey(loginKey: string): Promise<ResolvedLoginKey | null> {
  const snapshot = await getDoc(doc(db, "loginKeys", loginKey.trim()));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as { uid: string; email: string; role: "teacher" | "student"; expiresAt: Timestamp };
  const expired = data.expiresAt.toMillis() < Date.now();
  return { uid: data.uid, email: data.email, role: data.role, expired };
}

/**
 * Conclui o primeiro acesso (Fase 2 → Fase 3): apaga a chave de uso
 * único (`loginKeys/{loginKey}`) e marca `users/{uid}` como
 * `mustSetPassword: false`. Chamado por `FirstAccessPage` DEPOIS que
 * `updatePassword` (Firebase Authentication) já foi aplicado com
 * sucesso — a ordem importa: só liberamos o resto do app depois que a
 * senha definitiva já está ativa na conta.
 *
 * `loginKey` é opcional porque a Security Rule de `loginKeys` só deixa
 * o PRÓPRIO usuário apagar seu próprio documento (`resource.data.uid
 * == request.auth.uid`) — se por algum motivo o documento já não
 * existir (ex.: reenvio/tentativa duplicada), a exclusão simplesmente
 * não encontra nada para apagar; não é tratado como erro.
 */
export async function completeFirstAccess(uid: string, loginKey: string | null): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    mustSetPassword: false,
    loginKey: null,
    tempPasswordSetAt: null,
    tempCredentialsExpireAt: null,
  });
  if (loginKey) {
    await deleteDoc(doc(db, "loginKeys", loginKey)).catch(() => {
      // Fire-and-forget: a limpeza da chave é desejável, mas o estado
      // que realmente importa (mustSetPassword: false, já gravado
      // acima) não depende dela. Uma chave órfã sem dono válido em
      // `users` não representa risco: `resolveLoginKey` continuaria
      // resolvendo para o e-mail certo, mas o login por senha
      // temporária já não é mais válido — a senha foi trocada.
    });
  }
}
