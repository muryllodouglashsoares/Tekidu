import { getDisciplines, getDisciplinesForClass } from "@/services/disciplines/disciplineService";
import { getRecordsByContext } from "@/services/attendance/attendanceRecordService";
import { getAcademicSettings } from "@/services/academicSettings/academicSettingsService";
import {
  calculateAttendanceRate,
  calculateAttendanceStatus,
  type AttendanceStatus,
} from "@/types/attendance";
import { ALL_ASSESSMENT_TERMS } from "@/types/boletim";
import type { Discipline } from "@/types/discipline";

/**
 * "Minha Frequência" (seção 10 do plano multi-role) precisa dos
 * números BRUTOS de presença (presenças/faltas/aulas), não só do
 * percentual já calculado por `boletimService.getStudentBoletim`
 * (que expõe `attendanceRate`, mas não `present`/`total`). Em vez de
 * duplicar a leitura de `attendanceRecords` que o boletim já faz, esta
 * função reaproveita a MESMA consulta por contexto
 * (`attendanceRecordService.getRecordsByContext`, com `studentId` —
 * a única forma permitida pela Security Rule para o próprio aluno
 * ler seus registros, ver `firestore.rules: isOwnStudentRecord`) e
 * apenas soma os totais que faltavam.
 *
 * NÃO usa `attendanceSessions`/`assessments` (a Security Rule restringe
 * a leitura dessas duas coleções a `isActiveStaff()` — um aluno não
 * pode listá-las), então esta tela nunca mostra "aula por aula", só o
 * agregado por disciplina/geral — o mesmo limite já respeitado pelo
 * Boletim do aluno.
 */
export interface DisciplineAttendanceRow {
  discipline: Discipline;
  present: number;
  absent: number;
  total: number;
  rate: number | null;
  status: AttendanceStatus | null;
}

export interface StudentAttendanceOverview {
  disciplines: DisciplineAttendanceRow[];
  overallPresent: number;
  overallAbsent: number;
  overallTotal: number;
  overallRate: number | null;
  overallStatus: AttendanceStatus | null;
  minAttendanceRate: number;
}

export async function getStudentAttendanceOverview(
  studentId: string,
  classId: string,
  schoolYear: number
): Promise<StudentAttendanceOverview> {
  const [allDisciplines, settings] = await Promise.all([
    getDisciplines(),
    getAcademicSettings(schoolYear),
  ]);
  const disciplines = getDisciplinesForClass(allDisciplines, classId);

  const rows: DisciplineAttendanceRow[] = await Promise.all(
    disciplines.map(async (discipline): Promise<DisciplineAttendanceRow> => {
      const recordsByTerm = await Promise.all(
        ALL_ASSESSMENT_TERMS.map((term) =>
          getRecordsByContext(discipline.id, classId, schoolYear, term, studentId)
        )
      );
      const records = recordsByTerm.flat();
      const present = records.filter((r) => r.status === "present").length;
      const total = records.length;
      const rate = calculateAttendanceRate(present, total);

      return {
        discipline,
        present,
        absent: total - present,
        total,
        rate,
        status: calculateAttendanceStatus(rate, settings.minAttendanceRate),
      };
    })
  );

  const overallPresent = rows.reduce((acc, r) => acc + r.present, 0);
  const overallTotal = rows.reduce((acc, r) => acc + r.total, 0);
  const overallRate = calculateAttendanceRate(overallPresent, overallTotal);

  return {
    disciplines: rows,
    overallPresent,
    overallAbsent: overallTotal - overallPresent,
    overallTotal,
    overallRate,
    overallStatus: calculateAttendanceStatus(overallRate, settings.minAttendanceRate),
    minAttendanceRate: settings.minAttendanceRate,
  };
}
