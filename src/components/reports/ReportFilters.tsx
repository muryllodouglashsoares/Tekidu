import { Filter } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { ASSESSMENT_TERM_LABEL, type AssessmentTerm } from "@/types/assessment";
import type { SchoolClass } from "@/types/schoolClass";
import type { Discipline } from "@/types/discipline";

interface ReportFiltersProps {
  yearOptions: number[];
  yearFilter: string;
  onYearChange: (value: string) => void;

  classOptions: SchoolClass[];
  classId: string;
  onClassChange: (value: string) => void;

  disciplineOptions: Discipline[];
  disciplineId: string;
  onDisciplineChange: (value: string) => void;

  term: string;
  onTermChange: (value: string) => void;
}

/**
 * Filtros do gráfico de Relatórios (item 10 do briefing): TODOS →
 * TURMA → DISCIPLINA → PERÍODO, progressivos — cada nível só fica
 * disponível depois do anterior. Mesmo padrão visual (grid de
 * `Select`s dentro de um `Card`) já usado em Notas/Frequência/Boletim.
 */
export function ReportFilters({
  yearOptions,
  yearFilter,
  onYearChange,
  classOptions,
  classId,
  onClassChange,
  disciplineOptions,
  disciplineId,
  onDisciplineChange,
  term,
  onTermChange,
}: ReportFiltersProps) {
  return (
    <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
      <div className="flex items-center gap-2 pb-2.5 text-sm text-ink-500 sm:pb-3">
        <Filter className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Filtros:</span>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
        <Select label="Filtrar por turma" hideLabel value={classId} onChange={(e) => onClassChange(e.target.value)}>
          <option value="">Todas as turmas</option>
          {classOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Select
          label="Filtrar por disciplina"
          hideLabel
          value={disciplineId}
          onChange={(e) => onDisciplineChange(e.target.value)}
          disabled={!classId}
        >
          <option value="">{classId ? "Todas as disciplinas" : "Selecione uma turma primeiro"}</option>
          {disciplineOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>

        <Select label="Filtrar por período" hideLabel value={term} onChange={(e) => onTermChange(e.target.value)}>
          <option value="">Todos os períodos</option>
          {Object.entries(ASSESSMENT_TERM_LABEL).map(([value, label]) => (
            <option key={value} value={value as AssessmentTerm}>
              {label}
            </option>
          ))}
        </Select>

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
      </div>
    </Card>
  );
}
