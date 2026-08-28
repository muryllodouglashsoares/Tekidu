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
const PROJECT_ID = "tekidu-rules-test";

/**
 * Teste automatizado do fechamento de gap em `classes`/`disciplines`
 * (prompt "Fechar gap de segurança em classes/disciplines").
 *
 * Antes desta mudança, a restrição de "professor não acessa/edita a
 * visão de escola inteira" existia SÓ na rota/UX (`ProtectedRoute
 * allowedRoles={["admin"]}` em `AppRoutes.tsx`). As Security Rules
 * ainda liberavam `create`/`update` de `classes`/`disciplines` para
 * qualquer `isActiveStaff()` (admin OU teacher) — um professor podia
 * escrever nessas coleções chamando o Firestore diretamente, fora da
 * UI. Este arquivo simula exatamente esse ataque (bypass da UI) e
 * confirma que a Rule agora nega.
 *
 * Requer o Firestore Emulator rodando — não é executado pelo `npm
 * test` padrão (ver `vitest.rules.config.ts`). Rodar com:
 *
 *   npm run test:rules
 *
 * (isso já sobe/derruba o emulator via `firebase emulators:exec`).
 */

let testEnv: RulesTestEnvironment;

const ADMIN_UID = "admin-uid";
const TEACHER_UID = "teacher-uid";
const OTHER_TEACHER_UID = "other-teacher-uid";

const CLASS_ID = "class-1";
const DISCIPLINE_ID = "discipline-1";

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

  // Seed de perfis + dados-base, sem passar pelas Rules (contexto
  // "admin" do próprio emulator, usado só para preparar o cenário).
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`users/${ADMIN_UID}`).set({
      role: "admin",
      active: true,
      name: "Admin de Teste",
    });
    await db.doc(`users/${TEACHER_UID}`).set({
      role: "teacher",
      active: true,
      name: "Professor de Teste",
    });
    await db.doc(`users/${OTHER_TEACHER_UID}`).set({
      role: "teacher",
      active: true,
      name: "Outro Professor de Teste",
    });
    await db.doc(`classes/${CLASS_ID}`).set({
      name: "Turma A",
      shift: "morning",
    });
    await db.doc(`disciplines/${DISCIPLINE_ID}`).set({
      name: "Matemática",
      classIds: [CLASS_ID],
      teacherId: TEACHER_UID,
    });
  });
});

describe("classes/{classId} — gap de create/update por teacher", () => {
  it("nega create direto no Firestore por um professor (bypass da UI)", async () => {
    const teacherDb = testEnv
      .authenticatedContext(TEACHER_UID, { role: "teacher" })
      .firestore();

    await assertFails(
      teacherDb.doc("classes/class-created-by-teacher").set({
        name: "Turma Criada Por Professor",
        shift: "morning",
      })
    );
  });

  it("nega update direto no Firestore por um professor (bypass da UI)", async () => {
    const teacherDb = testEnv
      .authenticatedContext(TEACHER_UID, { role: "teacher" })
      .firestore();

    await assertFails(
      teacherDb.doc(`classes/${CLASS_ID}`).update({ name: "Turma Renomeada" })
    );
  });

  it("continua permitindo leitura por um professor ativo", async () => {
    const teacherDb = testEnv
      .authenticatedContext(TEACHER_UID, { role: "teacher" })
      .firestore();

    await assertSucceeds(teacherDb.doc(`classes/${CLASS_ID}`).get());
  });

  it("continua permitindo create/update por um admin ativo", async () => {
    const adminDb = testEnv
      .authenticatedContext(ADMIN_UID, { role: "admin" })
      .firestore();

    await assertSucceeds(
      adminDb.doc("classes/class-created-by-admin").set({
        name: "Turma Criada Por Admin",
        shift: "afternoon",
      })
    );
    await assertSucceeds(
      adminDb.doc(`classes/${CLASS_ID}`).update({ name: "Turma Renomeada Por Admin" })
    );
  });
});

describe("disciplines/{disciplineId} — gap de create/update por teacher", () => {
  it("nega create direto no Firestore por um professor (bypass da UI)", async () => {
    const teacherDb = testEnv
      .authenticatedContext(TEACHER_UID, { role: "teacher" })
      .firestore();

    await assertFails(
      teacherDb.doc("disciplines/discipline-created-by-teacher").set({
        name: "Disciplina Criada Por Professor",
        classIds: [CLASS_ID],
        teacherId: TEACHER_UID,
      })
    );
  });

  it("nega update de campos não sensíveis (classIds/nome) na PRÓPRIA disciplina por um professor", async () => {
    const teacherDb = testEnv
      .authenticatedContext(TEACHER_UID, { role: "teacher" })
      .firestore();

    // Mesmo sendo o teacherId dono da disciplina, o professor não deve
    // poder editar classIds/nome — só admin edita disciplina agora.
    await assertFails(
      teacherDb.doc(`disciplines/${DISCIPLINE_ID}`).update({ classIds: [] })
    );
  });

  it("nega tentativa de um professor reatribuir teacherId para si mesmo em disciplina alheia", async () => {
    const otherTeacherDb = testEnv
      .authenticatedContext(OTHER_TEACHER_UID, { role: "teacher" })
      .firestore();

    await assertFails(
      otherTeacherDb
        .doc(`disciplines/${DISCIPLINE_ID}`)
        .update({ teacherId: OTHER_TEACHER_UID })
    );
  });

  it("continua permitindo leitura por um professor ativo", async () => {
    const teacherDb = testEnv
      .authenticatedContext(TEACHER_UID, { role: "teacher" })
      .firestore();

    await assertSucceeds(teacherDb.doc(`disciplines/${DISCIPLINE_ID}`).get());
  });

  it("continua permitindo create/update por um admin ativo", async () => {
    const adminDb = testEnv
      .authenticatedContext(ADMIN_UID, { role: "admin" })
      .firestore();

    await assertSucceeds(
      adminDb.doc("disciplines/discipline-created-by-admin").set({
        name: "Disciplina Criada Por Admin",
        classIds: [CLASS_ID],
        teacherId: TEACHER_UID,
      })
    );
    await assertSucceeds(
      adminDb.doc(`disciplines/${DISCIPLINE_ID}`).update({ classIds: [] })
    );
  });
});
