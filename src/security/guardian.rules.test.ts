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
const PROJECT_ID = "tekidu-rules-test-guardian";

/**
 * Testes de Security Rules do Portal do Responsável (Fase 2/3 do
 * plano de evolução — "PARTE 10: Testes de Segurança / Guardian").
 *
 * Cenário-base: GUARDIAN_UID é responsável só por STUDENT_A (não por
 * STUDENT_B, matriculado na mesma turma). Cada teste comprova que essa
 * fronteira é respeitada mesmo quando os dois alunos compartilham
 * turma/disciplina — a elegibilidade do responsável depende SÓ de
 * `guardianUids`, nunca da turma.
 *
 * Requer o Firestore Emulator rodando — `npm run test:rules`.
 */

let testEnv: RulesTestEnvironment;

const ADMIN_UID = "admin-uid";
const TEACHER_UID = "teacher-uid";
const GUARDIAN_UID = "guardian-uid";
const OTHER_GUARDIAN_UID = "other-guardian-uid";

const CLASS_ID = "class-1";
const DISCIPLINE_ID = "discipline-1";
const STUDENT_A_ID = "student-a";
const STUDENT_B_ID = "student-b";
const GRADE_A_ID = "grade-a";
const ATTENDANCE_A_ID = "attendance-a";

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
    await db.doc(`users/${ADMIN_UID}`).set({ role: "admin", active: true, name: "Admin" });
    await db.doc(`users/${TEACHER_UID}`).set({ role: "teacher", active: true, name: "Professor" });
    await db.doc(`users/${GUARDIAN_UID}`).set({ role: "guardian", active: true, name: "Responsável A" });
    await db
      .doc(`users/${OTHER_GUARDIAN_UID}`)
      .set({ role: "guardian", active: true, name: "Responsável de Outro Aluno" });

    await db.doc(`classes/${CLASS_ID}`).set({ name: "Turma A", shift: "morning" });
    await db.doc(`disciplines/${DISCIPLINE_ID}`).set({
      name: "Matemática",
      classIds: [CLASS_ID],
      teacherId: TEACHER_UID,
    });

    // STUDENT_A tem GUARDIAN_UID como responsável; STUDENT_B, não —
    // apesar dos dois estarem na MESMA turma.
    await db.doc(`students/${STUDENT_A_ID}`).set({
      name: "Aluno A",
      classId: CLASS_ID,
      uid: null,
      guardianUids: [GUARDIAN_UID],
    });
    await db.doc(`students/${STUDENT_B_ID}`).set({
      name: "Aluno B",
      classId: CLASS_ID,
      uid: null,
      guardianUids: [],
    });

    await db.doc(`grades/${GRADE_A_ID}`).set({
      studentId: STUDENT_A_ID,
      disciplineId: DISCIPLINE_ID,
      score: 8.5,
    });
    await db.doc(`attendanceRecords/${ATTENDANCE_A_ID}`).set({
      studentId: STUDENT_A_ID,
      disciplineId: DISCIPLINE_ID,
      status: "present",
      date: "2026-03-10",
    });
  });
});

describe("students/{studentId} — leitura pelo responsável", () => {
  it("permite ao responsável ler o próprio filho vinculado", async () => {
    const guardianDb = testEnv.authenticatedContext(GUARDIAN_UID, { role: "guardian" }).firestore();
    await assertSucceeds(guardianDb.doc(`students/${STUDENT_A_ID}`).get());
  });

  it("nega ao responsável ler um aluno ao qual não está vinculado (mesma turma)", async () => {
    const guardianDb = testEnv.authenticatedContext(GUARDIAN_UID, { role: "guardian" }).firestore();
    await assertFails(guardianDb.doc(`students/${STUDENT_B_ID}`).get());
  });

  it("nega a um responsável de outro aluno ler este aluno", async () => {
    const otherGuardianDb = testEnv
      .authenticatedContext(OTHER_GUARDIAN_UID, { role: "guardian" })
      .firestore();
    await assertFails(otherGuardianDb.doc(`students/${STUDENT_A_ID}`).get());
  });
});

describe("students/{studentId} — escrita: só admin altera guardianUids", () => {
  it("permite a admin vincular/desvincular guardianUids", async () => {
    const adminDb = testEnv.authenticatedContext(ADMIN_UID, { role: "admin" }).firestore();
    await assertSucceeds(
      adminDb.doc(`students/${STUDENT_B_ID}`).update({ guardianUids: [OTHER_GUARDIAN_UID] })
    );
  });

  it("nega a professor alterar guardianUids, mesmo podendo editar outros campos do aluno", async () => {
    const teacherDb = testEnv.authenticatedContext(TEACHER_UID, { role: "teacher" }).firestore();
    await assertFails(
      teacherDb.doc(`students/${STUDENT_B_ID}`).update({ guardianUids: [OTHER_GUARDIAN_UID] })
    );
  });

  it("permite a professor editar o aluno normalmente quando NÃO toca em guardianUids", async () => {
    const teacherDb = testEnv.authenticatedContext(TEACHER_UID, { role: "teacher" }).firestore();
    await assertSucceeds(teacherDb.doc(`students/${STUDENT_B_ID}`).update({ name: "Aluno B Editado" }));
  });

  it("nega ao próprio responsável alterar o vínculo (mesmo sendo o aluno 'dele')", async () => {
    const guardianDb = testEnv.authenticatedContext(GUARDIAN_UID, { role: "guardian" }).firestore();
    await assertFails(guardianDb.doc(`students/${STUDENT_A_ID}`).update({ guardianUids: [] }));
  });

  it("nega criação de aluno com guardianUids não vazio por quem não é admin", async () => {
    const teacherDb = testEnv.authenticatedContext(TEACHER_UID, { role: "teacher" }).firestore();
    await assertFails(
      teacherDb.doc("students/student-new").set({
        name: "Aluno Novo",
        classId: CLASS_ID,
        uid: null,
        guardianUids: [OTHER_GUARDIAN_UID],
      })
    );
  });
});

describe("grades/{gradeId} e attendanceRecords/{recordId} — leitura pelo responsável", () => {
  it("permite ao responsável ler a nota do próprio filho", async () => {
    const guardianDb = testEnv.authenticatedContext(GUARDIAN_UID, { role: "guardian" }).firestore();
    await assertSucceeds(guardianDb.doc(`grades/${GRADE_A_ID}`).get());
  });

  it("permite ao responsável ler a frequência do próprio filho", async () => {
    const guardianDb = testEnv.authenticatedContext(GUARDIAN_UID, { role: "guardian" }).firestore();
    await assertSucceeds(guardianDb.doc(`attendanceRecords/${ATTENDANCE_A_ID}`).get());
  });

  it("nega ao responsável de outro aluno ler nota deste aluno", async () => {
    const otherGuardianDb = testEnv
      .authenticatedContext(OTHER_GUARDIAN_UID, { role: "guardian" })
      .firestore();
    await assertFails(otherGuardianDb.doc(`grades/${GRADE_A_ID}`).get());
  });

  it("nega ao responsável criar ou editar uma nota", async () => {
    const guardianDb = testEnv.authenticatedContext(GUARDIAN_UID, { role: "guardian" }).firestore();
    await assertFails(
      guardianDb.doc("grades/grade-new").set({ studentId: STUDENT_A_ID, disciplineId: DISCIPLINE_ID, score: 10 })
    );
    await assertFails(guardianDb.doc(`grades/${GRADE_A_ID}`).update({ score: 10 }));
  });

  it("nega ao responsável criar ou editar um registro de frequência", async () => {
    const guardianDb = testEnv.authenticatedContext(GUARDIAN_UID, { role: "guardian" }).firestore();
    await assertFails(
      guardianDb.doc("attendanceRecords/attendance-new").set({
        studentId: STUDENT_A_ID,
        disciplineId: DISCIPLINE_ID,
        status: "absent",
        date: "2026-03-11",
      })
    );
    await assertFails(guardianDb.doc(`attendanceRecords/${ATTENDANCE_A_ID}`).update({ status: "absent" }));
  });
});

describe("users/{userId} — conta de responsável e auto-alteração de role", () => {
  it("permite a admin criar a conta de um responsável", async () => {
    const adminDb = testEnv.authenticatedContext(ADMIN_UID, { role: "admin" }).firestore();
    await assertSucceeds(
      adminDb.doc("users/new-guardian-uid").set({
        uid: "new-guardian-uid",
        name: "Novo Responsável",
        email: "novo@example.com",
        role: "guardian",
        active: true,
      })
    );
  });

  it("nega a professor criar a conta de um responsável", async () => {
    const teacherDb = testEnv.authenticatedContext(TEACHER_UID, { role: "teacher" }).firestore();
    await assertFails(
      teacherDb.doc("users/new-guardian-uid-2").set({
        uid: "new-guardian-uid-2",
        name: "Novo Responsável",
        email: "novo2@example.com",
        role: "guardian",
        active: true,
      })
    );
  });

  it("nega ao responsável alterar a própria role", async () => {
    const guardianDb = testEnv.authenticatedContext(GUARDIAN_UID, { role: "guardian" }).firestore();
    await assertFails(guardianDb.doc(`users/${GUARDIAN_UID}`).update({ role: "admin" }));
  });
});
