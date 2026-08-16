import { Gauge, TrendingDown, TrendingUp, Users, Percent } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface ReportIndicatorCardsProps {
  overallAverage: number | null;
  evolution: number | null;
  studentCount: number;
  averageAttendanceRate: number | null;
}

/**
 * Indicadores do topo dos Relatórios (item 13 do briefing): média
 * global, evolução, quantidade de alunos e frequência média — todos
 * calculados a partir de dados reais em `reportsService.computeReportOverview`,
 * nunca hardcoded.
 */
export function ReportIndicatorCards({
  overallAverage,
  evolution,
  studentCount,
  averageAttendanceRate,
}: ReportIndicatorCardsProps) {
  const evolutionPositive = evolution !== null && evolution >= 0;

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card className="p-5">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
          <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
          Média global
        </span>
        <p className="mt-1 font-display text-2xl font-semibold text-ink900">
          {overallAverage === null ? "—" : overallAverage.toFixed(1)}
        </p>
      </Card>

      <Card className="p-5">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
          {evolutionPositive ? (
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Evolução
        </span>
        <p
          className={`mt-1 font-display text-2xl font-semibold ${
            evolution === null ? "text-ink900" : evolutionPositive ? "text-success" : "text-danger"
          }`}
        >
          {evolution === null ? "—" : `${evolution > 0 ? "+" : ""}${evolution.toFixed(1)}`}
        </p>
        {evolution !== null && <p className="mt-0.5 text-xs text-ink-400">vs período anterior</p>}
      </Card>

      <Card className="p-5">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          Alunos
        </span>
        <p className="mt-1 font-display text-2xl font-semibold text-ink900">{studentCount}</p>
      </Card>

      <Card className="p-5">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
          <Percent className="h-3.5 w-3.5" aria-hidden="true" />
          Frequência média
        </span>
        <p className="mt-1 font-display text-2xl font-semibold text-honors-600">
          {averageAttendanceRate === null ? "—" : `${averageAttendanceRate}%`}
        </p>
      </Card>
    </div>
  );
}
