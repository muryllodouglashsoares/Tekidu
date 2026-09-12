import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = "tekidu-rules-test-chat";

/**
 * Testes de Security Rules da mensageria (Parte 1 do plano de
 * evolução — "PARTE 10: Testes de Segurança / Chat").
 *
 * Cenário-base: TEACHER_UID leciona DISCIPLINE_ID, vinculada a
 * CLASS_ID. STUDENT_UID é o aluno de STUDENT_ID, matriculado em
 * CLASS_ID — este é o único par elegível para conversar. Todos os
 * outros uids abaixo existem para provar que o par ERRADO (professor
 * sem vínculo, aluno de outra turma, terceiro se declarando
 * participante) é sempre negado.
 *
 * Requer o Firestore Emulator rodando — `npm run test:rules`.
 */

let testEnv: RulesTestEnvironment;

const TEACHER_UID = "teacher-uid";
const OTHER_TEACHER_UID = "other-teacher-uid";
const STUDENT_UID = "student-uid";
const INELIGIBLE_STUDENT_UID = "ineligible-student-uid";

const CLASS_ID = "class-1";
const OTHER_CLASS_ID = "class-2";
const DISCIPLINE_ID = "discipline-1";

const STUDENT_ID = "student-doc-1";
const INELIGIBLE_STUDENT_ID = "student-doc-2";

const CONVERSATION_ID = `${TEACHER_UID}_${STUDENT_ID}`;

function validConversationPayload() {
  return {
    participantUids: [TEACHER_UID, STUDENT_UID],
    studentId: STUDENT_ID,
    studentUid: STUDENT_UID,
    studentName: "Aluno de Teste",
    teacherUid: TEACHER_UID,
    teacherName: "Professor de Teste",
    classId: CLASS_ID,
    disciplineId: DISCIPLINE_ID,
    disciplineName: "Matemática",
    lastMessage: null,
    lastMessageAt: null,
    lastMessageSenderUid: null,
    unreadCount: { [TEACHER_UID]: 0, [STUDENT_UID]: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`users/${TEACHER_UID}`).set({ role: "teacher", active: true, name: "Professor de Teste" });
    await db
      .doc(`users/${OTHER_TEACHER_UID}`)
      .set({ role: "teacher", active: true, name: "Outro Professor" });
    await db.doc(`users/${STUDENT_UID}`).set({ role: "student", active: true, name: "Aluno de Teste" });
    await db
      .doc(`users/${INELIGIBLE_STUDENT_UID}`)
      .set({ role: "student", active: true, name: "Aluno Inelegível" });

    await db.doc(`classes/${CLASS_ID}`).set({ name: "Turma A", shift: "morning" });
    await db.doc(`classes/${OTHER_CLASS_ID}`).set({ name: "Turma B", shift: "afternoon" });

    await db.doc(`disciplines/${DISCIPLINE_ID}`).set({
      name: "Matemática",
      classIds: [CLASS_ID],
      teacherId: TEACHER_UID,
    });

    await db.doc(`students/${STUDENT_ID}`).set({
      name: "Aluno de Teste",
      classId: CLASS_ID,
      uid: STUDENT_UID,
    });
    // Matriculado em OUTRA turma — nenhuma disciplina de TEACHER_UID
    // está vinculada a `OTHER_CLASS_ID`, então este aluno nunca deve
    // conseguir formar um par válido com TEACHER_UID.
    await db.doc(`students/${INELIGIBLE_STUDENT_ID}`).set({
      name: "Aluno Inelegível",
      classId: OTHER_CLASS_ID,
      uid: INELIGIBLE_STUDENT_UID,
    });
  });
});

describe("conversations/{conversationId} — criação", () => {
  it("permite ao professor criar uma conversa com um aluno elegível (mesma turma da disciplina)", async () => {
    const teacherDb = testEnv.authenticatedContext(TEACHER_UID, { role: "teacher" }).firestore();
    await assertSucceeds(
      teacherDb.doc(`conversations/${CONVERSATION_ID}`).set(validConversationPayload())
    );
  });

  it("permite ao aluno criar a mesma conversa (par idêntico, iniciada pelo outro lado)", async () => {
    const studentDb = testEnv.authenticatedContext(STUDENT_UID, { role: "student" }).firestore();
    await assertSucceeds(
      studentDb.doc(`conversations/${CONVERSATION_ID}`).set(validConversationPayload())
    );
  });

  it("nega quando o aluno informado não pertence à turma da disciplina (par inelegível)", async () => {
    const teacherDb = testEnv.authenticatedContext(TEACHER_UID, { role: "teacher" }).firestore();
    const badId = `${TEACHER_UID}_${INELIGIBLE_STUDENT_ID}`;
    await assertFails(
      teacherDb.doc(`conversations/${badId}`).set({
        ...validConversationPayload(),
        participantUids: [TEACHER_UID, INELIGIBLE_STUDENT_UID],
        studentId: INELIGIBLE_STUDENT_ID,
        studentUid: INELIGIBLE_STUDENT_UID,
        classId: OTHER_CLASS_ID,
      })
    );
  });

  it("nega quando um terceiro tenta criar uma conversa em nome de outro par", async () => {
    const outsiderDb = testEnv.authenticatedContext(OTHER_TEACHER_UID, { role: "teacher" }).firestore();
    await assertFails(
      outsiderDb.doc(`conversations/${CONVERSATION_ID}`).set(validConversationPayload())
    );
  });

  it("nega quando o disciplineId informado não corresponde ao professor do par", async () => {
    const teacherDb = testEnv.authenticatedContext(TEACHER_UID, { role: "teacher" }).firestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .doc("disciplines/discipline-other")
        .set({ name: "Outra", classIds: [CLASS_ID], teacherId: OTHER_TEACHER_UID });
    });
    await assertFails(
      teacherDb.doc(`conversations/${CONVERSATION_ID}`).set({
        ...validConversationPayload(),
        disciplineId: "discipline-other",
      })
    );
  });
});

describe("conversations/{conversationId} — leitura e atualização", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(`conversations/${CONVERSATION_ID}`).set(validConversationPayload());
    });
  });

  it("permite leitura pelos dois participantes", async () => {
    const teacherDb = testEnv.authenticatedContext(TEACHER_UID, { role: "teacher" }).firestore();
    const studentDb = testEnv.authenticatedContext(STUDENT_UID, { role: "student" }).firestore();
    await assertSucceeds(teacherDb.doc(`conversations/${CONVERSATION_ID}`).get());
    await assertSucceeds(studentDb.doc(`conversations/${CONVERSATION_ID}`).get());
  });

  it("nega leitura a quem não é participante", async () => {
    const outsiderDb = testEnv.authenticatedContext(OTHER_TEACHER_UID, { role: "teacher" }).firestore();
    await assertFails(outsiderDb.doc(`conversations/${CONVERSATION_ID}`).get());
  });

  it("permite que um participante atualize os campos de resumo (última mensagem/contador)", async () => {
    const teacherDb = testEnv.authenticatedContext(TEACHER_UID, { role: "teacher" }).firestore();
    await assertSucceeds(
      teacherDb.doc(`conversations/${CONVERSATION_ID}`).update({
        lastMessage: "Olá!",
        lastMessageAt: new Date(),
        lastMessageSenderUid: TEACHER_UID,
        updatedAt: new Date(),
        unreadCount: { [TEACHER_UID]: 0, [STUDENT_UID]: 1 },
      })
    );
  });

  it("nega alteração dos participantes/identidade do par", async () => {
    const teacherDb = testEnv.authenticatedContext(TEACHER_UID, { role: "teacher" }).firestore();
    await assertFails(
      teacherDb.doc(`conversations/${CONVERSATION_ID}`).update({
        participantUids: [TEACHER_UID, OTHER_TEACHER_UID],
      })
    );
  });

  it("nega atualização por quem não é participante", async () => {
    const outsiderDb = testEnv.authenticatedContext(OTHER_TEACHER_UID, { role: "teacher" }).firestore();
    await assertFails(
      outsiderDb.doc(`conversations/${CONVERSATION_ID}`).update({ lastMessage: "Invadindo" })
    );
  });
});

describe("conversations/{conversationId}/messages/{messageId}", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(`conversations/${CONVERSATION_ID}`).set(validConversationPayload());
    });
  });

  it("permite que um participante crie uma mensagem para o outro participante", async () => {
    const teacherDb = testEnv.authenticatedContext(TEACHER_UID, { role: "teacher" }).firestore();
    await assertSucceeds(
      teacherDb.collection(`conversations/${CONVERSATION_ID}/messages`).add({
        senderUid: TEACHER_UID,
        recipientUid: STUDENT_UID,
        content: "Olá, tudo bem?",
        createdAt: new Date(),
        readAt: null,
      })
    );
  });

  it("nega mensagem vazia", async () => {
    const teacherDb = testEnv.authenticatedContext(TEACHER_UID, { role: "teacher" }).firestore();
    await assertFails(
      teacherDb.collection(`conversations/${CONVERSATION_ID}/messages`).add({
        senderUid: TEACHER_UID,
        recipientUid: STUDENT_UID,
        content: "",
        createdAt: new Date(),
        readAt: null,
      })
    );
  });

  it("nega enviar mensagem se declarando como o outro remetente", async () => {
    const teacherDb = testEnv.authenticatedContext(TEACHER_UID, { role: "teacher" }).firestore();
    await assertFails(
      teacherDb.collection(`conversations/${CONVERSATION_ID}/messages`).add({
        senderUid: STUDENT_UID,
        recipientUid: TEACHER_UID,
        content: "Fingindo ser o aluno",
        createdAt: new Date(),
        readAt: null,
      })
    );
  });

  it("nega criação de mensagem por quem não participa da conversa", async () => {
    const outsiderDb = testEnv.authenticatedContext(OTHER_TEACHER_UID, { role: "teacher" }).firestore();
    await assertFails(
      outsiderDb.collection(`conversations/${CONVERSATION_ID}/messages`).add({
        senderUid: OTHER_TEACHER_UID,
        recipientUid: STUDENT_UID,
        content: "Invadindo a conversa",
        createdAt: new Date(),
        readAt: null,
      })
    );
  });

  it("nega leitura das mensagens por quem não participa da conversa", async () => {
    const outsiderDb = testEnv.authenticatedContext(OTHER_TEACHER_UID, { role: "teacher" }).firestore();
    let messageId = "";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const ref = await context
        .firestore()
        .collection(`conversations/${CONVERSATION_ID}/messages`)
        .add({ senderUid: TEACHER_UID, recipientUid: STUDENT_UID, content: "Oi", createdAt: new Date(), readAt: null });
      messageId = ref.id;
    });
    await assertFails(
      outsiderDb.doc(`conversations/${CONVERSATION_ID}/messages/${messageId}`).get()
    );
  });

  it("permite que só o destinatário marque a mensagem como lida", async () => {
    let messageId = "";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const ref = await context
        .firestore()
        .collection(`conversations/${CONVERSATION_ID}/messages`)
        .add({ senderUid: TEACHER_UID, recipientUid: STUDENT_UID, content: "Oi", createdAt: new Date(), readAt: null });
      messageId = ref.id;
    });

    const senderDb = testEnv.authenticatedContext(TEACHER_UID, { role: "teacher" }).firestore();
    await assertFails(
      senderDb.doc(`conversations/${CONVERSATION_ID}/messages/${messageId}`).update({ readAt: new Date() })
    );

    const recipientDb = testEnv.authenticatedContext(STUDENT_UID, { role: "student" }).firestore();
    await assertSucceeds(
      recipientDb.doc(`conversations/${CONVERSATION_ID}/messages/${messageId}`).update({ readAt: new Date() })
    );
  });

  it("nega alterar o conteúdo de uma mensagem já enviada", async () => {
    let messageId = "";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const ref = await context
        .firestore()
        .collection(`conversations/${CONVERSATION_ID}/messages`)
        .add({ senderUid: TEACHER_UID, recipientUid: STUDENT_UID, content: "Oi", createdAt: new Date(), readAt: null });
      messageId = ref.id;
    });

    const recipientDb = testEnv.authenticatedContext(STUDENT_UID, { role: "student" }).firestore();
    await assertFails(
      recipientDb
        .doc(`conversations/${CONVERSATION_ID}/messages/${messageId}`)
        .update({ content: "Conteúdo adulterado" })
    );
  });
});
