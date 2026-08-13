import { Filter } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { BOLETIM_PERIOD_LABEL, type BoletimPeriod } from "@/types/boletim";
import type { SchoolClass } from "@/types/schoolClass";
import type { Student } from "@/types/student";

interface BoletimFiltersProps {
  yearOptions: number[];
  yearFilter: string;
  onYearChange: (value: string) => void;

  classOptions: SchoolClass[];
  classId: string;
  onClassChange: (value: string) => void;

  studentOptions: Student[];
  studentId: string;
  onStudentChange: (value: string) => void;

  period: BoletimPeriod;
  onPeriodChange: (value: BoletimPeriod) => void;
}

/**
 * Pesquisa/filtros de acesso direto ao boletim (item 11 do briefing):
 * ano letivo → turma → aluno → período. Continua disponível
 * independentemente da navegação Turma → Aluno → Boletim (item 3): os
 * dois fluxos escrevem no MESMO estado (ver BoletimPage), então
 * escolher aqui ou clicar num ClassCard/linha de aluno leva ao mesmo
 * lugar.
 */
export function BoletimFilters({
  yearOptions,
  yearFilter,
  onYearChange,
  classOptions,
  classId,
  onClassChange,
  studentOptions,
  studentId,
  onStudentChange,
  period,
  onPeriodChange,
}: BoletimFiltersProps) {
  return (
    <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
      <div className="flex items-center gap-2 pb-2.5 text-sm text-ink-500 sm:pb-3">
        <Filter className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Filtros:</span>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
        <Select
          label="Filtrar por ano letivo"
          hideLabel
          value={yearFilter}
          onChange={(e) => onYearChange(e.target.value)}
          disabled={yearOptions.length === 0}
        >
          {yearOptions.length === 0 && <option value="">—</option>}
          {yearOptions.map((year) => (
            <option key={year} value={String(year)}>
              {year}
            </option>
          ))}
        </Select>

        <Select
          label="Selecionar turma"
          hideLabel
          value={classId}
          onChange={(e) => onClassChange(e.target.value)}
          disabled={classOptions.length === 0}
        >
          <option value="">Selecionar turma</option>
          {classOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Select
          label="Selecionar aluno"
          hideLabel
          value={studentId}
          onChange={(e) => onStudentChange(e.target.value)}
          disabled={!classId}
        >
          <option value="">{classId ? "Selecionar aluno" : "Selecione uma turma primeiro"}</option>
          {studentOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>

        <Select
          label="Filtrar por período"
          hideLabel
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as BoletimPeriod)}
        >
          {Object.entries(BOLETIM_PERIOD_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
    </Card>
  );
}
