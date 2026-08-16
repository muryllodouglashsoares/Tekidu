import { Filter } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { ASSESSMENT_TERM_LABEL } from "@/types/assessment";
import type { SchoolClass } from "@/types/schoolClass";
import type { Discipline } from "@/types/discipline";

interface AttendanceFiltersProps {
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
 * Filtros dependentes da aba "Registro de presença": Ano letivo → Turma
 * → Disciplina → Bimestre — mesma cadeia e o mesmo padrão visual (grid
 * de `Select`s dentro de um `Card`) já usados em `NotesPage`, para que a
 * aba de Frequência pareça parte nativa do Tekidu.
 */
export function AttendanceFilters({
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
}: AttendanceFiltersProps) {
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
          label="Filtrar por turma"
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
          label="Filtrar por disciplina"
          hideLabel
          value={disciplineId}
          onChange={(e) => onDisciplineChange(e.target.value)}
          disabled={!classId || disciplineOptions.length === 0}
        >
          <option value="">
            {!classId
              ? "Selecione uma turma primeiro"
              : disciplineOptions.length === 0
                ? "Nenhuma disciplina vinculada a esta turma"
                : "Selecionar disciplina"}
          </option>
          {disciplineOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>

        <Select
          label="Filtrar por bimestre"
          hideLabel
          value={term}
          onChange={(e) => onTermChange(e.target.value)}
          disabled={!disciplineId}
        >
          <option value="">
            {disciplineId ? "Selecionar bimestre" : "Selecione uma disciplina primeiro"}
          </option>
          {Object.entries(ASSESSMENT_TERM_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
    </Card>
  );
}
