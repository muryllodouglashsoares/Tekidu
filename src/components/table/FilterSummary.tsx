import { X } from "lucide-react";

interface FilterSummaryProps {
  activeCount: number;
  onClear: () => void;
}

/**
 * "A interface deve mostrar claramente: filtro ativo; quantidade de
 * filtros; possibilidade de limpar filtros" (Fase 3). Renderiza nada
 * quando não há filtro ativo, para não ocupar espaço à toa.
 */
export function FilterSummary({ activeCount, onClear }: FilterSummaryProps) {
  if (activeCount === 0) return null;
  return (
    <button
      type="button"
      onClick={onClear}
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-ink-50 px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100"
    >
      {activeCount} filtro{activeCount === 1 ? "" : "s"} ativo{activeCount === 1 ? "" : "s"}
      <X className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}
