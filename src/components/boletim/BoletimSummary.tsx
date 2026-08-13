import { BookOpen, Gauge, Percent, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { AcademicStatusBadge } from "@/components/boletim/AcademicStatusBadge";
import type { StudentBoletim } from "@/services/boletim/boletimService";

interface BoletimSummaryProps {
  boletim: StudentBoletim;
}

/**
 * Card de resumo acadêmico (item 10 do briefing): média geral,
 * frequência, número de disciplinas e situação geral — os quatro
 * indicadores derivados em `boletimService.getStudentBoletim`.
 */
export function BoletimSummary({ boletim }: BoletimSummaryProps) {
  const stats = [
    {
      icon: Gauge,
      label: "Média geral",
      value: boletim.overallAverage === null ? "—" : boletim.overallAverage.toFixed(1),
    },
    {
      icon: Percent,
      label: "Frequência",
      value: boletim.overallAttendanceRate === null ? "—" : `${boletim.overallAttendanceRate}%`,
    },
    {
      icon: BookOpen,
      label: "Disciplinas",
      value: String(boletim.disciplines.length),
    },
  ];

  return (
    <Card className="mb-6 p-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
              <stat.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {stat.label}
            </span>
            <span className="font-display text-xl font-semibold text-ink900">{stat.value}</span>
          </div>
        ))}

        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Situação geral
          </span>
          <AcademicStatusBadge status={boletim.overallStatus} />
        </div>
      </div>
    </Card>
  );
}
