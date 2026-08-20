import type { ReactNode } from "react";
import { X } from "lucide-react";

interface BulkActionsBarProps {
  count: number;
  onClear: () => void;
  children: ReactNode;
}

/**
 * Toolbar contextual exibida após selecionar registros (Fase 4 —
 * "ações em lote"). As ações em si (mudar status, excluir, exportar
 * ...) são passadas como children pela página, porque cada entidade
 * tem ações diferentes; este componente só cuida do "X selecionados +
 * cancelar seleção", que é idêntico em toda tela.
 */
export function BulkActionsBar({ count, onClear, children }: BulkActionsBarProps) {
  if (count === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-ink-200 bg-ink-50 px-4 py-3">
      <span className="text-sm font-medium text-ink900">
        {count} selecionado{count === 1 ? "" : "s"}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-700"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        Cancelar seleção
      </button>
    </div>
  );
}
