import { SituationBadge } from "@/components/notes/SituationBadge";
import type { DisciplineBoletimRow } from "@/services/boletim/boletimService";

interface BoletimTableProps {
  rows: DisciplineBoletimRow[];
}

/**
 * Tabela "Desempenho por disciplina" (item 10 do briefing): disciplina,
 * média, frequência e situação — uma linha por disciplina vinculada à
 * turma do aluno. A situação de cada disciplina reaproveita
 * `SituationBadge`, já usado em Notas; a frequência reaproveita
 * `AttendanceStatusBadge`, já usado em Frequência.
 */
export function BoletimTable({ rows }: BoletimTableProps) {
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
