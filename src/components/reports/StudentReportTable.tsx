import { BarChart3 } from "lucide-react";
import type { StudentReportSummary } from "@/services/reports/reportsService";
import { calculateAttendanceStatus } from "@/types/attendance";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { MobileDataCard } from "@/components/mobile/MobileDataCard";

interface StudentReportTableProps {
  summaries: StudentReportSummary[];
  onSelectStudent: (studentId: string) => void;
}

/**
 * Tabela "Turma → Alunos" dos Relatórios (item 15 do briefing): nome,
 * matrícula, média, frequência e um indicativo simples de
 * desenvolvimento (a partir da situação de frequência já calculada em
 * `types/attendance`, mesmo padrão usado em Frequência/Boletim). Clicar
 * na linha ou em "Ver relatório" abre o relatório individual do aluno.
 *
 * Em mobile, a mesma fonte de dados vira cards (ver "MOBILE DATA
 * CARDS" no briefing) em vez de uma tabela de 5 colunas espremida.
 */
export function StudentReportTable({ summaries, onSelectStudent }: StudentReportTableProps) {
  const isMobile = useIsMobile();

  function initials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  }

  if (isMobile) {
    return (
      <div className="flex flex-col gap-2.5 p-3">
        {summaries.map(({ student, average, attendanceRate }) => {
          const attendanceStatus = calculateAttendanceStatus(attendanceRate);
          return (
            <MobileDataCard
              key={student.id}
              onClick={() => onSelectStudent(student.id)}
              leading={
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                  {initials(student.name)}
                </span>
              }
              title={student.name}
              subtitle={student.registrationNumber || "Sem matrícula"}
              meta={
                <>
                  <span className="text-xs tabular text-ink-500">
                    Média: {average === null ? "—" : average.toFixed(1)}
                  </span>
                  <span className="text-xs tabular text-ink-500">
                    Frequência: {attendanceRate === null ? "—" : `${attendanceRate}%`}
                  </span>
                  {attendanceStatus === "critical" && (
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                      Atenção
                    </span>
                  )}
                </>
              }
              actions={
                <span className="flex h-9 w-9 items-center justify-center rounded-card text-ink-400">
                  <BarChart3 className="h-4 w-4" />
                </span>
              }
            />
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
            <th className="px-4 py-3 font-medium">Matrícula</th>
            <th className="px-4 py-3 font-medium">Média</th>
            <th className="px-4 py-3 font-medium">Frequência</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {summaries.map(({ student, average, attendanceRate }) => {
            const attendanceStatus = calculateAttendanceStatus(attendanceRate);
            return (
              <tr
                key={student.id}
                onClick={() => onSelectStudent(student.id)}
                className="cursor-pointer border-b border-line last:border-0 hover:bg-ink-50"
              >
                <td className="px-4 py-3 font-medium text-ink900">{student.name}</td>
                <td className="px-4 py-3 tabular text-ink-600">{student.registrationNumber || "—"}</td>
                <td className="px-4 py-3 tabular text-ink-600">{average === null ? "—" : average.toFixed(1)}</td>
                <td className="px-4 py-3 tabular text-ink-600">
                  {attendanceRate === null ? "—" : `${attendanceRate}%`}
                  {attendanceStatus === "critical" && (
                    <span className="ml-2 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                      Atenção
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      aria-label={`Ver relatório de ${student.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStudent(student.id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-card px-2.5 py-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
                    >
                      <BarChart3 className="h-4 w-4" aria-hidden="true" />
                      Ver relatório
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
