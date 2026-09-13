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
const PROJECT_ID = "tekidu-rules-test-justifications";

/**
 * Testes de Security Rules da funcionalidade "Justificativas de
 * Faltas" (`absenceJustifications/{attendanceRecordId}`).
 *
 * Cobre exatamente as garantias descritas nos comentários do bloco
 * correspondente em `firestore.rules`: um aluno só cria/lê as
 * PRÓPRIAS justificativas, nunca aponta para a falta de outro aluno
 * nem para uma presença, nunca define os próprios campos de revisão,
 * nunca duplica solicitação para a mesma falta (ID determinístico) e
 * nunca aprova/recusa a própria solicitação — isso é reservado ao
 * staff (`isOwnDiscipline`/admin), que por sua vez só pode transicionar
 * de `pending` para `approved`/`rejected`, sem alterar o conteúdo
 * original da solicitação.
 *
 * Requer o Firestore Emulator — não roda no `npm test` padrão. Rodar
 * com:
 *
 *   npm run test:rules
 */

let testEnv: RulesTestEnvironment;

const ADMIN_UID = "admin-uid";
const TEACHER_UID = "teacher-uid";
const OTHER_TEACHER_UID = "other-teacher-uid";
const STUDENT_UID = "student-uid";
const OTHER_STUDENT_UID = "other-student-uid";

const STUDENT_ID = "student-1";
const OTHER_STUDENT_ID = "student-2";
const DISCIPLINE_ID = "discipline-1";
const OTHER_DISCIPLINE_ID = "discipline-2";
const CLASS_ID = "class-1";

const ABSENT_RECORD_ID = "record-absent-1";
const PRESENT_RECORD_ID = "record-present-1";
const OTHER_STUDENT_RECORD_ID = "record-absent-other-student";

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    studentId: STUDENT_ID,
    attendanceRecordId: ABSENT_RECORD_ID,
    sessionId: "session-1",
    disciplineId: DISCIPLINE_ID,
    classId: CLASS_ID,
    schoolYear: 2026,
    term: "1",
    absenceDate: "2026-08-12",
    sessionLabel: "Aula 03",
    reason: "Consulta médica agendada com antecedência.",
    documentData: "data:application/pdf;base64,JVBERi0xLjQK",
    documentName: "atestado.pdf",
    documentType: "pdf",
    documentSize: 102400,
    status: "pending",
    // 48h no futuro — dentro da janela [36h, 60h] que a Rule exige
    // (ver `isValidJustificationPayload`/`JUSTIFICATION_WINDOW_DAYS`).
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    ...overrides,
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

    await db.doc(`users/${ADMIN_UID}`).set({ role: "admin", active: true, name: "Admin de Teste" });
    await db
      .doc(`users/${TEACHER_UID}`)
      .set({ role: "teacher", active: true, name: "Professor de Teste" });
    await db
      .doc(`users/${OTHER_TEACHER_UID}`)
      .set({ role: "teacher", active: true, name: "Outro Professor" });
    await db
      .doc(`users/${STUDENT_UID}`)
      .set({ role: "student", active: true, name: "Aluno de Teste" });
    await db
      .doc(`users/${OTHER_STUDENT_UID}`)
      .set({ role: "student", active: true, name: "Outro Aluno" });

    await db.doc(`students/${STUDENT_ID}`).set({ uid: STUDENT_UID, name: "Aluno de Teste", classId: CLASS_ID });
    await db
      .doc(`students/${OTHER_STUDENT_ID}`)
      .set({ uid: OTHER_STUDENT_UID, name: "Outro Aluno", classId: CLASS_ID });

    await db.doc(`classes/${CLASS_ID}`).set({ name: "Turma A", shift: "morning" });
    await db.doc(`disciplines/${DISCIPLINE_ID}`).set({
      name: "Matemática",
      classIds: [CLASS_ID],
      teacherId: TEACHER_UID,
    });
    await db.doc(`disciplines/${OTHER_DISCIPLINE_ID}`).set({
      name: "História",
      classIds: [CLASS_ID],
      teacherId: OTHER_TEACHER_UID,
    });

    // A falta que pode ser justificada.
    await db.doc(`attendanceRecords/${ABSENT_RECORD_ID}`).set({
      studentId: STUDENT_ID,
      sessionId: "session-1",
      disciplineId: DISCIPLINE_ID,
      classId: CLASS_ID,
      schoolYear: 2026,
      term: "1",
      status: "absent",
      date: "2026-08-12",
      label: "Aula 03",
    });
    // Uma PRESENÇA — nunca deve poder virar uma justificativa.
    await db.doc(`attendanceRecords/${PRESENT_RECORD_ID}`).set({
      studentId: STUDENT_ID,
      sessionId: "session-2",
      disciplineId: DISCIPLINE_ID,
      classId: CLASS_ID,
      schoolYear: 2026,
      term: "1",
      status: "present",
      date: "2026-08-13",
      label: "Aula 04",
    });
    // Uma falta de OUTRO aluno.
    await db.doc(`attendanceRecords/${OTHER_STUDENT_RECORD_ID}`).set({
      studentId: OTHER_STUDENT_ID,
      sessionId: "session-3",
      disciplineId: DISCIPLINE_ID,
      classId: CLASS_ID,
      schoolYear: 2026,
      term: "1",
      status: "absent",
      date: "2026-08-14",
      label: "Aula 05",
    });
  });
});

function studentDb(uid: string) {
  return testEnv.authenticatedContext(uid, { role: "student" }).firestore();
}
function teacherDb(uid: string) {
  return testEnv.authenticatedContext(uid, { role: "teacher" }).firestore();
}
function adminDb() {
  return testEnv.authenticatedContext(ADMIN_UID, { role: "admin" }).firestore();
}

describe("absenceJustifications/{attendanceRecordId} — criação pelo aluno", () => {
  it("permite ao aluno criar uma justificativa para a PRÓPRIA falta", async () => {
    await assertSucceeds(
      studentDb(STUDENT_UID).doc(`absenceJustifications/${ABSENT_RECORD_ID}`).set(basePayload())
    );
  });

  it("nega criar justificativa apontando para uma falta de OUTRO aluno", async () => {
    await assertFails(
      studentDb(STUDENT_UID)
        .doc(`absenceJustifications/${OTHER_STUDENT_RECORD_ID}`)
        .set(basePayload({ attendanceRecordId: OTHER_STUDENT_RECORD_ID }))
    );
  });

  it("nega criar justificativa para um registro marcado como PRESENÇA", async () => {
    await assertFails(
      studentDb(STUDENT_UID)
        .doc(`absenceJustifications/${PRESENT_RECORD_ID}`)
        .set(
          basePayload({
            attendanceRecordId: PRESENT_RECORD_ID,
            absenceDate: "2026-08-13",
          })
        )
    );
  });

  it("nega um aluno criar em nome de outro aluno (studentId falsificado)", async () => {
    await assertFails(
      studentDb(OTHER_STUDENT_UID).doc(`absenceJustifications/${ABSENT_RECORD_ID}`).set(basePayload())
    );
  });

  it("nega criar já com status diferente de pending", async () => {
    await assertFails(
      studentDb(STUDENT_UID)
        .doc(`absenceJustifications/${ABSENT_RECORD_ID}`)
        .set(basePayload({ status: "approved" }))
    );
  });

  it("nega criar já definindo campos de revisão (reviewedBy)", async () => {
    await assertFails(
      studentDb(STUDENT_UID)
        .doc(`absenceJustifications/${ABSENT_RECORD_ID}`)
        .set(basePayload({ reviewedBy: STUDENT_UID }))
    );
  });

  it("nega motivo abaixo do tamanho mínimo (10 caracteres)", async () => {
    await assertFails(
      studentDb(STUDENT_UID)
        .doc(`absenceJustifications/${ABSENT_RECORD_ID}`)
        .set(basePayload({ reason: "gripe" }))
    );
  });

  it("nega documento (base64) acima do limite permitido", async () => {
    await assertFails(
      studentDb(STUDENT_UID)
        .doc(`absenceJustifications/${ABSENT_RECORD_ID}`)
        .set(basePayload({ documentData: `data:application/pdf;base64,${"A".repeat(900001)}` }))
    );
  });

  it("nega documentData que não é uma data URI válida", async () => {
    await assertFails(
      studentDb(STUDENT_UID)
        .doc(`absenceJustifications/${ABSENT_RECORD_ID}`)
        .set(basePayload({ documentData: "https://example.com/nao-e-base64.pdf" }))
    );
  });

  it("nega expiresAt manipulado para expirar quase imediatamente (esconderia da análise)", async () => {
    await assertFails(
      studentDb(STUDENT_UID)
        .doc(`absenceJustifications/${ABSENT_RECORD_ID}`)
        .set(basePayload({ expiresAt: new Date(Date.now() + 5 * 60 * 1000) }))
    );
  });

  it("nega expiresAt manipulado para nunca expirar (muito distante no futuro)", async () => {
    await assertFails(
      studentDb(STUDENT_UID)
        .doc(`absenceJustifications/${ABSENT_RECORD_ID}`)
        .set(basePayload({ expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }))
    );
  });

  it("nega uma segunda solicitação para a MESMA falta (ID determinístico já existente)", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(`absenceJustifications/${ABSENT_RECORD_ID}`).set(basePayload());
    });

    await assertFails(
      studentDb(STUDENT_UID).doc(`absenceJustifications/${ABSENT_RECORD_ID}`).set(basePayload())
    );
  });
});

describe("absenceJustifications/{attendanceRecordId} — leitura", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(`absenceJustifications/${ABSENT_RECORD_ID}`).set(basePayload());
    });
  });

  it("permite ao próprio aluno ler a própria justificativa", async () => {
    await assertSucceeds(studentDb(STUDENT_UID).doc(`absenceJustifications/${ABSENT_RECORD_ID}`).get());
  });

  it("nega a outro aluno ler a justificativa alheia", async () => {
    await assertFails(studentDb(OTHER_STUDENT_UID).doc(`absenceJustifications/${ABSENT_RECORD_ID}`).get());
  });

  it("permite ao professor DONO da disciplina ler a justificativa", async () => {
    await assertSucceeds(teacherDb(TEACHER_UID).doc(`absenceJustifications/${ABSENT_RECORD_ID}`).get());
  });

  it("nega a um professor de OUTRA disciplina ler a justificativa", async () => {
    await assertFails(
      teacherDb(OTHER_TEACHER_UID).doc(`absenceJustifications/${ABSENT_RECORD_ID}`).get()
    );
  });

  it("permite ao admin ler qualquer justificativa", async () => {
    await assertSucceeds(adminDb().doc(`absenceJustifications/${ABSENT_RECORD_ID}`).get());
  });
});

describe("absenceJustifications/{attendanceRecordId} — análise (update)", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(`absenceJustifications/${ABSENT_RECORD_ID}`).set(basePayload());
    });
  });

  it("nega o próprio aluno aprovar a própria justificativa", async () => {
    await assertFails(
      studentDb(STUDENT_UID)
        .doc(`absenceJustifications/${ABSENT_RECORD_ID}`)
        .update({ status: "approved", reviewedBy: STUDENT_UID })
    );
  });

  it("permite ao professor DONO da disciplina aprovar, definindo a si mesmo como revisor", async () => {
    await assertSucceeds(
      teacherDb(TEACHER_UID).doc(`absenceJustifications/${ABSENT_RECORD_ID}`).update({
        status: "approved",
        reviewedBy: TEACHER_UID,
        reviewedByName: "Professor de Teste",
        reviewComment: null,
        updatedAt: new Date(),
      })
    );
  });

  it("nega a um professor de OUTRA disciplina aprovar", async () => {
    await assertFails(
      teacherDb(OTHER_TEACHER_UID).doc(`absenceJustifications/${ABSENT_RECORD_ID}`).update({
        status: "approved",
        reviewedBy: OTHER_TEACHER_UID,
      })
    );
  });

  it("nega o professor se marcar como revisor de uma decisão que não é dele (reviewedBy != auth.uid)", async () => {
    await assertFails(
      teacherDb(TEACHER_UID).doc(`absenceJustifications/${ABSENT_RECORD_ID}`).update({
        status: "approved",
        reviewedBy: OTHER_TEACHER_UID,
      })
    );
  });

  it("nega alterar campos além dos de revisão (ex.: reason)", async () => {
    await assertFails(
      teacherDb(TEACHER_UID).doc(`absenceJustifications/${ABSENT_RECORD_ID}`).update({
        status: "approved",
        reviewedBy: TEACHER_UID,
        reason: "Motivo reescrito pelo professor",
      })
    );
  });

  it("nega transicionar para um status que não seja approved/rejected", async () => {
    await assertFails(
      teacherDb(TEACHER_UID).doc(`absenceJustifications/${ABSENT_RECORD_ID}`).update({
        status: "pending",
        reviewedBy: TEACHER_UID,
      })
    );
  });

  it("nega reabrir/alterar uma justificativa que já foi decidida (não está mais pending)", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .doc(`absenceJustifications/${ABSENT_RECORD_ID}`)
        .update({ status: "approved", reviewedBy: TEACHER_UID });
    });

    await assertFails(
      teacherDb(TEACHER_UID).doc(`absenceJustifications/${ABSENT_RECORD_ID}`).update({
        status: "rejected",
        reviewedBy: TEACHER_UID,
      })
    );
  });
});

describe("absenceJustifications/{attendanceRecordId} — exclusão", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(`absenceJustifications/${ABSENT_RECORD_ID}`).set(basePayload());
    });
  });

  it("nega exclusão pelo aluno", async () => {
    await assertFails(studentDb(STUDENT_UID).doc(`absenceJustifications/${ABSENT_RECORD_ID}`).delete());
  });

  it("nega exclusão até mesmo pelo admin", async () => {
    await assertFails(adminDb().doc(`absenceJustifications/${ABSENT_RECORD_ID}`).delete());
  });
});
