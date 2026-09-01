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
const STUDENT_UID = "student-uid";
const OTHER_STUDENT_UID = "other-student-uid";
const STUDENT_ID = "student-1";
const OTHER_STUDENT_ID = "student-2";

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
    await db.doc(`users/${STUDENT_UID}`).set({
      role: "student",
      active: true,
      name: "Aluno de Teste",
    });
    await db.doc(`users/${OTHER_STUDENT_UID}`).set({
      role: "student",
      active: true,
      name: "Outro Aluno de Teste",
    });
    await db.doc(`students/${STUDENT_ID}`).set({
      name: "Aluno de Teste",
      email: "aluno@tekidu.test",
      registrationNumber: "0001",
      classId: CLASS_ID,
      status: "active",
      average: null,
      uid: STUDENT_UID,
      photoURL: null,
      photoUpdatedAt: null,
    });
    await db.doc(`students/${OTHER_STUDENT_ID}`).set({
      name: "Outro Aluno de Teste",
      email: "outro-aluno@tekidu.test",
      registrationNumber: "0002",
      classId: CLASS_ID,
      status: "active",
      average: null,
      uid: OTHER_STUDENT_UID,
      photoURL: null,
      photoUpdatedAt: null,
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

describe("students/{studentId} — foto de perfil oficial restrita a admin", () => {
  it("continua permitindo que um professor edite campos normais do aluno (regressão)", async () => {
    const teacherDb = testEnv
      .authenticatedContext(TEACHER_UID, { role: "teacher" })
      .firestore();

    await assertSucceeds(
      teacherDb.doc(`students/${STUDENT_ID}`).update({ status: "recovery" })
    );
  });

  it("nega que um professor altere a foto do aluno diretamente no Firestore", async () => {
    const teacherDb = testEnv
      .authenticatedContext(TEACHER_UID, { role: "teacher" })
      .firestore();

    await assertFails(
      teacherDb.doc(`students/${STUDENT_ID}`).update({ photoURL: "https://example.com/fake.jpg" })
    );
  });

  it("nega que um professor altere a foto junto de outros campos na mesma escrita", async () => {
    const teacherDb = testEnv
      .authenticatedContext(TEACHER_UID, { role: "teacher" })
      .firestore();

    await assertFails(
      teacherDb.doc(`students/${STUDENT_ID}`).update({
        status: "recovery",
        photoURL: "https://example.com/fake.jpg",
      })
    );
  });

  it("permite que um admin altere a foto do aluno", async () => {
    const adminDb = testEnv
      .authenticatedContext(ADMIN_UID, { role: "admin" })
      .firestore();

    await assertSucceeds(
      adminDb.doc(`students/${STUDENT_ID}`).update({
        photoURL: "https://example.com/real.jpg",
        photoUpdatedAt: new Date(),
      })
    );
  });

  it("nega que o próprio aluno altere a própria foto (bypass da UI)", async () => {
    const studentDb = testEnv
      .authenticatedContext(STUDENT_UID, { role: "student" })
      .firestore();

    await assertFails(
      studentDb.doc(`students/${STUDENT_ID}`).update({ photoURL: "https://example.com/self.jpg" })
    );
  });

  it("nega que um aluno altere a foto de outro aluno", async () => {
    const studentDb = testEnv
      .authenticatedContext(STUDENT_UID, { role: "student" })
      .firestore();

    await assertFails(
      studentDb
        .doc(`students/${OTHER_STUDENT_ID}`)
        .update({ photoURL: "https://example.com/other.jpg" })
    );
  });

  it("nega criar um aluno já com foto, mesmo por um admin", async () => {
    const adminDb = testEnv
      .authenticatedContext(ADMIN_UID, { role: "admin" })
      .firestore();

    await assertFails(
      adminDb.doc("students/student-created-with-photo").set({
        name: "Aluno Novo",
        email: "novo@tekidu.test",
        registrationNumber: "0003",
        classId: null,
        status: "active",
        average: null,
        uid: null,
        photoURL: "https://example.com/sneaky.jpg",
        photoUpdatedAt: null,
      })
    );
  });
});
