import type { Student } from "@/types/student";
import type { AttendanceSummary } from "@/types/attendance";
import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";

interface AttendanceSummaryTableProps {
  students: Student[];
  /** studentId -> resumo calculado a partir dos registros do contexto. */
  summaryByStudent: Record<string, AttendanceSummary>;
}

/**
 * Tabela "Resumo" (seção 8 do briefing): Aluno, Presenças, Faltas,
 * Frequência, Situação. Mesmo padrão visual/estrutural de `GradesTable`
 * (Notas) — cabeçalho uppercase, avatar de iniciais, linhas zebra-free
 * com borda inferior.
 */
export function AttendanceSummaryTable({ students, summaryByStudent }: AttendanceSummaryTableProps) {
  if (students.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-ink-500">
        Nenhum aluno vinculado a esta turma.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-400">
            <th className="px-4 py-3 font-medium">Aluno</th>
            <th className="px-4 py-3 text-center font-medium">Presenças</th>
            <th className="px-4 py-3 text-center font-medium">Faltas</th>
            <th className="px-4 py-3 text-center font-medium">Frequência</th>
            <th className="px-4 py-3 font-medium">Situação</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const summary = summaryByStudent[student.id];
            return (
              <tr key={student.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                      {student.name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase())
                        .join("")}
                    </span>
                    <span className="truncate font-medium text-ink900">{student.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-medium text-success">
                  {summary?.present ?? 0}
                </td>
                <td className="px-4 py-3 text-center font-medium text-danger">
                  {summary?.absent ?? 0}
                </td>
                <td className="px-4 py-3 text-center font-display font-semibold text-ink900">
                  {summary?.rate !== null && summary?.rate !== undefined
                    ? `${String(summary.rate).replace(".", ",")}%`
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <AttendanceStatusBadge status={summary?.status ?? null} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
