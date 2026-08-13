import type { ReactNode } from "react";
import { AlertTriangle, CalendarCheck, UserCheck, UserX, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { AttendanceSummary } from "@/types/attendance";

interface AttendanceStatsProps {
  /** Resumo (presenças/faltas/frequência) de cada aluno no contexto selecionado. */
  summaries: AttendanceSummary[];
  /** Presentes/ausentes da aula atualmente selecionada (aba Registro), se houver. */
  currentSession?: { present: number; absent: number } | null;
}

/**
 * Indicadores dinâmicos da seção 11 do briefing (Total de alunos,
 * Presentes, Ausentes, Frequência média) + o alerta de baixa frequência
 * da seção 12. Nenhum valor é fixo: tudo é derivado de `summaries`
 * (calculado a partir dos registros reais em `AttendancePage`).
 */
export function AttendanceStats({ summaries, currentSession }: AttendanceStatsProps) {
  const total = summaries.length;
  const ratesWithData = summaries.filter((s) => s.rate !== null);
  const averageRate =
    ratesWithData.length > 0
      ? Math.round((ratesWithData.reduce((sum, s) => sum + (s.rate ?? 0), 0) / ratesWithData.length) * 10) / 10
      : null;
  const lowAttendanceCount = summaries.filter((s) => s.status === "critical" || s.status === "attention").length;

  return (
    <div className="mb-4 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total de alunos"
          value={total}
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5" />}
          label="Presentes"
          value={currentSession ? currentSession.present : "—"}
          hint={currentSession ? "nesta aula" : "selecione uma aula"}
        />
        <StatCard
          icon={<UserX className="h-5 w-5" />}
          label="Ausentes"
          value={currentSession ? currentSession.absent : "—"}
          hint={currentSession ? "nesta aula" : "selecione uma aula"}
        />
        <StatCard
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Frequência média"
          value={averageRate !== null ? `${String(averageRate).replace(".", ",")}%` : "—"}
          hint={averageRate === null ? "sem aulas registradas" : "no bimestre"}
        />
      </div>

      {lowAttendanceCount > 0 && (
        <div className="flex items-center gap-2 rounded-card border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{lowAttendanceCount}</strong> aluno{lowAttendanceCount === 1 ? "" : "s"} est
            {lowAttendanceCount === 1 ? "á" : "ão"} com frequência abaixo do mínimo recomendado.
          </span>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-card bg-ink-50 text-ink-600">
        {icon}
      </div>
      <p className="text-xs text-ink-500 sm:text-sm">{label}</p>
      <p className="mt-0.5 font-display text-xl font-semibold text-ink900 sm:text-2xl">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-400">{hint}</p>}
    </Card>
  );
}
