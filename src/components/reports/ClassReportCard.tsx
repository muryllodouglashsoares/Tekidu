import { ArrowRight, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ClassReportSummary } from "@/services/reports/reportsService";

interface ClassReportCardProps {
  summary: ClassReportSummary;
  onSelect: () => void;
}

/**
 * Card de turma exibido abaixo do gráfico geral (item 14 do briefing):
 * quantidade de alunos, média e frequência da turma, calculadas em
 * `reportsService.computeClassSummaries` a partir de notas/frequência
 * reais. Ponto de entrada do fluxo Turma → Alunos → Relatório
 * individual (item 15).
 */
export function ClassReportCard({ summary, onSelect }: ClassReportCardProps) {
  const { schoolClass, studentCount, average, attendanceRate } = summary;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="min-w-0">
        <p className="truncate font-display text-base font-semibold text-ink900">{schoolClass.name}</p>
        <p className="flex items-center gap-1.5 text-sm text-ink-500">
          <Users className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
          {studentCount} aluno{studentCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div>
          <p className="text-xs text-ink-400">Média</p>
          <p className="font-display text-lg font-semibold text-ink900">
            {average === null ? "—" : average.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-400">Frequência</p>
          <p className="font-display text-lg font-semibold text-ink900">
            {attendanceRate === null ? "—" : `${attendanceRate}%`}
          </p>
        </div>
      </div>

      <Button variant="secondary" onClick={onSelect} className="mt-1 w-full justify-center">
        Ver alunos
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Card>
  );
}
