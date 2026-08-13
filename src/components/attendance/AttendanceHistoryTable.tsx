import type { AttendanceSession } from "@/types/attendance";

export interface AttendanceHistoryRow {
  session: AttendanceSession;
  className: string;
  disciplineName: string;
  present: number;
  absent: number;
  rate: number | null;
}

interface AttendanceHistoryTableProps {
  rows: AttendanceHistoryRow[];
}

/**
 * Reproduz a tabela da aba "Histórico" do protótipo do Figma: uma linha
 * por aula registrada (não por aluno), com Data, Aula, Turma,
 * Disciplina, Presentes, Ausentes e Frequência da aula — filtrável por
 * turma/disciplina em `AttendancePage`.
 */
export function AttendanceHistoryTable({ rows }: AttendanceHistoryTableProps) {
  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-ink-500">
        Nenhuma aula registrada ainda.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-400">
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3 font-medium">Aula</th>
            <th className="px-4 py-3 font-medium">Turma</th>
            <th className="px-4 py-3 font-medium">Disciplina</th>
            <th className="px-4 py-3 text-center font-medium">Presentes</th>
            <th className="px-4 py-3 text-center font-medium">Ausentes</th>
            <th className="px-4 py-3 text-center font-medium">Freq.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ session, className, disciplineName, present, absent, rate }) => (
            <tr key={session.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 font-medium text-ink900">{formatDate(session.date)}</td>
              <td className="px-4 py-3 text-ink-600">{session.label}</td>
              <td className="px-4 py-3 text-ink-600">{className}</td>
              <td className="px-4 py-3 text-ink-600">{disciplineName}</td>
              <td className="px-4 py-3 text-center font-semibold text-success">{present}</td>
              <td className="px-4 py-3 text-center font-semibold text-danger">{absent}</td>
              <td className="px-4 py-3 text-center">
                <RateBadge rate={rate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-4 py-2.5 text-xs text-ink-400">
        {rows.length} registro{rows.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function RateBadge({ rate }: { rate: number | null }) {
  if (rate === null) {
    return <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-500">—</span>;
  }
  const tone = rate >= 90 ? "bg-success/10 text-success" : rate >= 75 ? "bg-honors-400/20 text-honors-600" : "bg-danger/10 text-danger";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {String(rate).replace(".", ",")}%
    </span>
  );
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}
