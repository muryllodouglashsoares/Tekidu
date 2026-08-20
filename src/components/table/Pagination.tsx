import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import type { ReactNode } from "react";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

/**
 * Rodapé de paginação (Fase 4 — "página atual; total; quantidade por
 * página; próxima; anterior; primeira; última"). Componente único
 * reaproveitado por todas as tabelas de listagem.
 */
export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}: PaginationProps) {
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <span>
          {start}–{end} de {totalItems}
        </span>
        <span className="hidden sm:inline">·</span>
        <label className="hidden items-center gap-1.5 sm:flex">
          <span className="sr-only">Itens por página</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-card border border-line bg-surface px-1.5 py-1 text-sm text-ink-700 outline-none focus:border-ink-400"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} por página
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <PageButton label="Primeira página" onClick={() => onPageChange(1)} disabled={page === 1}>
          <ChevronsLeft className="h-4 w-4" />
        </PageButton>
        <PageButton label="Página anterior" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
          <ChevronLeft className="h-4 w-4" />
        </PageButton>
        <span className="px-2 text-sm text-ink-600">
          Página {page} de {totalPages}
        </span>
        <PageButton label="Próxima página" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
          <ChevronRight className="h-4 w-4" />
        </PageButton>
        <PageButton label="Última página" onClick={() => onPageChange(totalPages)} disabled={page === totalPages}>
          <ChevronsRight className="h-4 w-4" />
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-card p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
