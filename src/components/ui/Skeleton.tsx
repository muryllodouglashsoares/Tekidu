/**
 * Bloco base de skeleton (placeholder animado). Usado para compor
 * layouts de carregamento que antecipam a estrutura real da página
 * (Fase 6 — "utilizar skeleton quando a estrutura da página puder ser
 * antecipada", em vez de um spinner genérico centralizado).
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-md bg-ink-100 ${className}`}
    />
  );
}

/**
 * Skeleton de tabela: replica cabeçalho + N linhas com colunas
 * proporcionais, para as telas de listagem (Alunos, Professores,
 * Turmas, Disciplinas, Notas, Frequência, Boletim...). `columns`
 * controla quantas "células" cada linha simula.
 */
export function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div
      role="status"
      aria-label="Carregando dados"
      className="w-full animate-pulse divide-y divide-line"
    >
      <div className="flex items-center gap-4 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`head-${i}`} className={`h-3 ${i === 0 ? "w-32" : "w-16"}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex items-center gap-4 px-4 py-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className={colIndex === 0 ? "h-4 w-full max-w-[180px]" : "h-4 w-14"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton de cards (grade de indicadores), usado em telas como
 * Dashboard/Relatórios enquanto os números ainda não chegaram.
 */
export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Carregando indicadores"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-card border border-line bg-surface p-5 shadow-card">
          <Skeleton className="mb-3 h-3 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
