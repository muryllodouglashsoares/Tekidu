import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { SortDirection } from "@/hooks/useSort";

interface SortableThProps {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  className?: string;
}

/**
 * Cabeçalho de coluna clicável com indicador visual de ordenação
 * (Fase 4 — "cabeçalho; ordenação"). Reaproveitado por todas as
 * tabelas de listagem em vez de cada página desenhar seu próprio `th`
 * com lógica de seta duplicada.
 */
export function SortableTh({ label, active, direction, onClick, className = "" }: SortableThProps) {
  return (
    <th className={`px-4 py-3 font-medium ${className}`}>
      <button
        type="button"
        onClick={onClick}
        aria-label={`Ordenar por ${label}${active ? (direction === "asc" ? ", crescente" : ", decrescente") : ""}`}
        className={`flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-ink-700 ${
          active ? "text-ink-700" : "text-ink-400"
        }`}
      >
        {label}
        {active ? (
          direction === "asc" ? (
            <ArrowUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ArrowDown className="h-3 w-3" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
        )}
      </button>
    </th>
  );
}
