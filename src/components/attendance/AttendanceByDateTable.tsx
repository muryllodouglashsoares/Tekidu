import { Check, X } from "lucide-react";
import type { Student } from "@/types/student";
import type { AttendanceRecord, AttendanceSession } from "@/types/attendance";

interface AttendanceByDateTableProps {
  students: Student[];
  sessions: AttendanceSession[];
  /** studentId -> sessionId -> registro (ausente do mapa = ainda não lançado) */
  recordsByStudentAndSession: Record<string, Record<string, AttendanceRecord | undefined>>;
}

/**
 * Tabela "Por data" (seção 10 do briefing): Aluno nas linhas, uma coluna
 * por aula já registrada no contexto. Cada célula usa ícone + cor (não
 * só cor, ver seção de acessibilidade) para indicar Presente/Ausente.
 */
export function AttendanceByDateTable({
  students,
  sessions,
  recordsByStudentAndSession,
}: AttendanceByDateTableProps) {
  if (students.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-ink-500">
        Nenhum aluno vinculado a esta turma.
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-ink-500">
        Nenhuma aula registrada neste bimestre ainda.
      </div>
    );
  }

  const orderedSessions = [...sessions].sort((a, b) => a.order - b.order);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-400">
            <th className="sticky left-0 bg-surface px-4 py-3 font-medium">Aluno</th>
            {orderedSessions.map((session) => (
              <th key={session.id} className="whitespace-nowrap px-3 py-3 text-center font-medium">
                <span className="block">{session.label}</span>
                <span className="block font-normal normal-case text-ink-400">
                  {formatDate(session.date)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id} className="border-b border-line last:border-0">
              <td className="sticky left-0 bg-surface px-4 py-3">
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
              {orderedSessions.map((session) => {
                const record = recordsByStudentAndSession[student.id]?.[session.id];
                return (
                  <td key={session.id} className="px-3 py-3 text-center">
                    {!record ? (
                      <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-line text-[11px] text-ink-300">
                        —
                      </span>
                    ) : record.status === "present" ? (
                      <span
                        aria-label="Presente"
                        title="Presente"
                        className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-success/10 text-success"
                      >
                        <Check className="h-4 w-4" />
                      </span>
                    ) : (
                      <span
                        aria-label="Ausente"
                        title="Ausente"
                        className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-danger/10 text-danger"
                      >
                        <X className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(isoDate: string): string {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}`;
}
