import { Check } from "lucide-react";
import { CLASS_SHIFT_LABEL } from "@/types/schoolClass";
import type { SchoolClass } from "@/types/schoolClass";

interface ClassMultiSelectProps {
  /** Turmas disponíveis para seleção. */
  classes: SchoolClass[];
  /** Quantidade de alunos por ID de turma (mesma fonte usada em Turmas). */
  studentCounts: Record<string, number>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Seleção múltipla de turmas para o formulário de Disciplinas.
 * Implementada com React + Tailwind puros (sem biblioteca de terceiros),
 * reaproveitando os tokens de cor/borda/tipografia já usados no resto
 * do projeto — apenas substitui o `<select multiple>` nativo, que não
 * comunicaria bem quais turmas já estão selecionadas.
 */
export function ClassMultiSelect({
  classes,
  studentCounts,
  selectedIds,
  onChange,
}: ClassMultiSelectProps) {
  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  if (classes.length === 0) {
    return (
      <p className="rounded-card border border-line bg-paper px-3.5 py-4 text-center text-sm text-ink-500">
        Nenhuma turma cadastrada ainda.
      </p>
    );
  }

  return (
    <div
      role="group"
      aria-label="Turmas vinculadas à disciplina"
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
    >
      {classes.map((schoolClass) => {
        const checked = selectedIds.includes(schoolClass.id);
        const count = studentCounts[schoolClass.id] ?? 0;
        return (
          <label
            key={schoolClass.id}
            className={`flex cursor-pointer items-start gap-2.5 rounded-card border px-3.5 py-2.5 text-sm transition-colors ${
              checked
                ? "border-ink-700 bg-ink-50"
                : "border-line bg-surface hover:bg-ink-50/60"
            }`}
          >
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                checked ? "border-ink-700 bg-ink-700 text-white" : "border-line bg-surface"
              }`}
              aria-hidden="true"
            >
              {checked && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={checked}
              onChange={() => toggle(schoolClass.id)}
            />
            <span className="min-w-0">
              <span className="block truncate font-medium text-ink900">{schoolClass.name}</span>
              <span className="block text-xs text-ink-400">
                {CLASS_SHIFT_LABEL[schoolClass.shift]} · {count} aluno{count === 1 ? "" : "s"}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
