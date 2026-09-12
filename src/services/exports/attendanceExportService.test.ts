import { describe, expect, it } from "vitest";
import {
  buildAttendanceHistoryExcelSheets,
  buildAttendanceHistoryPdfData,
  buildAttendanceRegisterExcelSheets,
  buildAttendanceRegisterPdfData,
  type AttendanceExportContext,
} from "@/services/exports/attendanceExportService";
import type { AttendanceHistoryRow } from "@/components/attendance/AttendanceHistoryTable";
import type { AttendanceRecord, AttendanceSession, AttendanceSummary } from "@/types/attendance";
import type { Student } from "@/types/student";

const student: Student = {
  id: "student-1",
  name: "Maria Souza",
  email: "maria@example.com",
  registrationNumber: "2026002",
  classId: "class-1",
  status: "active",
  average: null,
  uid: "uid-1",
  guardianUids: [],
  createdAt: null,
  updatedAt: null,
};

const summary: AttendanceSummary = {
  studentId: student.id,
  present: 8,
  absent: 2,
  total: 10,
  rate: 80,
  status: "attention",
};

const session: AttendanceSession = {
  id: "session-1",
  disciplineId: "disc-1",
  classId: "class-1",
  schoolYear: 2026,
  term: "2",
  date: "2026-05-04",
  label: "Aula 01",
  order: 0,
  createdAt: null,
  updatedAt: null,
};

const record: AttendanceRecord = {
  id: "record-1",
  studentId: student.id,
  sessionId: session.id,
  disciplineId: "disc-1",
  classId: "class-1",
  schoolYear: 2026,
  term: "2",
  status: "present",
  createdAt: null,
  updatedAt: null,
};

const ctx: AttendanceExportContext = {
  yearFilter: "2026",
  className: "2º Ano A",
  disciplineName: "Informática",
  term: "2",
};

describe("buildAttendanceRegisterPdfData", () => {
  it("gera o resumo por aluno com os mesmos valores já calculados na tela", () => {
    const data = buildAttendanceRegisterPdfData(
      [student],
      { [student.id]: summary },
      [session],
      { [student.id]: { [session.id]: record } },
      ctx,
      new Date()
    );
    expect(data.tables[0].rows).toEqual([["Maria Souza", "8", "2", "80%", "Atenção"]]);
  });

  it("inclui a tabela 'Registros por data' somente quando há aulas registradas", () => {
    const withSessions = buildAttendanceRegisterPdfData(
      [student],
      { [student.id]: summary },
      [session],
      { [student.id]: { [session.id]: record } },
      ctx,
      new Date()
    );
    expect(withSessions.tables).toHaveLength(2);
    expect(withSessions.tables[1].rows[0]).toEqual(["Maria Souza", "P"]);

    const withoutSessions = buildAttendanceRegisterPdfData(
      [student],
      { [student.id]: summary },
      [],
      {},
      ctx,
      new Date()
    );
    expect(withoutSessions.tables).toHaveLength(1);
  });

  it("não inventa dados quando a turma não tem alunos vinculados", () => {
    const data = buildAttendanceRegisterPdfData([], {}, [], {}, ctx, new Date());
    expect(data.tables[0].rows).toEqual([]);
    expect(data.tables[0].emptyMessage).toMatch(/nenhum aluno/i);
  });
});

describe("buildAttendanceRegisterExcelSheets", () => {
  it("gera Resumo + Registros + Filtros quando há aulas registradas", () => {
    const sheets = buildAttendanceRegisterExcelSheets(
      [student],
      { [student.id]: summary },
      [session],
      { [student.id]: { [session.id]: record } },
      ctx
    );
    expect(sheets.map((s) => s.name)).toEqual(["Resumo", "Registros", "Filtros"]);
  });

  it("omite a aba Registros quando não há aulas", () => {
    const sheets = buildAttendanceRegisterExcelSheets([student], { [student.id]: summary }, [], {}, ctx);
    expect(sheets.map((s) => s.name)).toEqual(["Resumo", "Filtros"]);
  });
});

describe("buildAttendanceHistoryPdfData / ExcelSheets", () => {
  const historyRow: AttendanceHistoryRow = {
    session,
    className: "2º Ano A",
    disciplineName: "Informática",
    present: 20,
    absent: 5,
    rate: 80,
  };

  it("reflete exatamente os registros filtrados da aba Histórico", () => {
    const pdfData = buildAttendanceHistoryPdfData([historyRow], "2º Ano A", "Informática", new Date());
    expect(pdfData.tables[0].rows).toEqual([
      ["04/05/2026", "Aula 01", "2º Ano A", "Informática", "20", "5", "80%"],
    ]);

    const sheets = buildAttendanceHistoryExcelSheets([historyRow], "2º Ano A", "Informática");
    expect(sheets.map((s) => s.name)).toEqual(["Histórico", "Filtros"]);
  });

  it("mostra a mensagem de 'nenhuma aula registrada' quando o histórico está vazio", () => {
    const pdfData = buildAttendanceHistoryPdfData([], "Todas", "Todas", new Date());
    expect(pdfData.tables[0].rows).toEqual([]);
    expect(pdfData.tables[0].emptyMessage).toMatch(/nenhuma aula registrada/i);
  });
});
