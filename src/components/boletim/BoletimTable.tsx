import { SituationBadge } from "@/components/notes/SituationBadge";
import type { DisciplineBoletimRow } from "@/services/boletim/boletimService";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface BoletimTableProps {
  rows: DisciplineBoletimRow[];
}

/**
 * "Desempenho por disciplina" (item 10 do briefing). Em desktop segue
 * como tabela; em mobile vira uma lista de cards por disciplina com
 * barra de progresso da média (ver "BOLETIM MOBILE" do briefing) —
 * mesma fonte de dados (`DisciplineBoletimRow`), só muda a apresentação.
 */
export function BoletimTable({ rows }: BoletimTableProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex flex-col divide-y divide-line">
        {rows.map((row) => {
          const pct = row.average === null ? 0 : Math.max(0, Math.min(100, (row.average / 10) * 100));
          return (
            <div key={row.discipline.id} className="flex flex-col gap-2 px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink900">{row.discipline.name}</p>
                  <p className="truncate text-xs text-ink-400">{row.discipline.teacherName || "—"}</p>
                </div>
                <p className="shrink-0 font-display text-lg font-semibold text-ink900">
                  {row.average === null ? "—" : row.average.toFixed(1)}
                </p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className={`h-full rounded-full ${
                    row.situation === "failed" ? "bg-danger" : row.situation === "approved" ? "bg-success" : "bg-honors-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-ink-500">
                  Frequência: {row.attendanceRate === null ? "—" : `${row.attendanceRate}%`}
                </span>
                <SituationBadge situation={row.situation} />
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
            <th className="px-4 py-3 font-medium">Disciplina</th>
            <th className="px-4 py-3 font-medium">Professor</th>
            <th className="px-4 py-3 font-medium">Média</th>
            <th className="px-4 py-3 font-medium">Frequência</th>
            <th className="px-4 py-3 font-medium">Situação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.discipline.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 font-medium text-ink900">{row.discipline.name}</td>
              <td className="px-4 py-3 text-ink-600">{row.discipline.teacherName || "—"}</td>
              <td className="px-4 py-3 tabular text-ink-600">
                {row.average === null ? "—" : row.average.toFixed(1)}
              </td>
              <td className="px-4 py-3 tabular text-ink-600">
                {row.attendanceRate === null ? "—" : `${row.attendanceRate}%`}
              </td>
              <td className="px-4 py-3">
                <SituationBadge situation={row.situation} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
