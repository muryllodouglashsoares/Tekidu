import type { Student } from "@/types/student";
import type { AttendanceSummary } from "@/types/attendance";
import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface AttendanceSummaryTableProps {
  students: Student[];
  /** studentId -> resumo calculado a partir dos registros do contexto. */
  summaryByStudent: Record<string, AttendanceSummary>;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/**
 * "Resumo" (seção 8 do briefing): Aluno, Presenças, Faltas, Frequência,
 * Situação. Em mobile, a mesma leitura vira um card por aluno com a
 * frequência em destaque, em vez de uma tabela de 5 colunas.
 */
export function AttendanceSummaryTable({ students, summaryByStudent }: AttendanceSummaryTableProps) {
  const isMobile = useIsMobile();

  if (students.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-ink-500">
        Nenhum aluno vinculado a esta turma.
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex flex-col divide-y divide-line">
        {students.map((student) => {
          const summary = summaryByStudent[student.id];
          return (
            <div key={student.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                {initials(student.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink900">{student.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                  <span className="text-success">{summary?.present ?? 0} presenças</span>
                  <span className="text-danger">{summary?.absent ?? 0} faltas</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <p className="font-display text-sm font-semibold text-ink900">
                  {summary?.rate !== null && summary?.rate !== undefined
                    ? `${String(summary.rate).replace(".", ",")}%`
                    : "—"}
                </p>
                <AttendanceStatusBadge status={summary?.status ?? null} />
              </div>
            </div>
          );
        })}
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
                      {initials(student.name)}
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
