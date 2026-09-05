import { useIsMobile } from "@/hooks/useMediaQuery";

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

/**
 * Skeleton para a lista de `MobileDataCard` (ver "SKELETON LOADING"
 * no briefing mobile: "os skeletons devem representar a estrutura
 * real" — uma tabela larga de N colunas não é a estrutura real em
 * mobile, já que essas telas viram cards; usar `TableSkeleton` ali
 * criaria um flash de layout errado no meio de um segundo). Reproduz
 * a silhueta de `MobileDataCard`: avatar circular, título, subtítulo
 * e uma linha de metadados.
 */
export function MobileCardListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Carregando dados" className="flex flex-col gap-2.5 p-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-card border border-line bg-surface p-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Wrapper de conveniência: escolhe automaticamente entre
 * `MobileCardListSkeleton` (mobile) e `TableSkeleton` (desktop) sem
 * exigir que cada tela repita `isMobile ? ... : ...` — usado nos
 * pontos de carregamento cujo conteúdo final vira cards em mobile
 * (Boletim, Frequência, Relatórios, Perfil do aluno). Evita duplicar
 * a mesma checagem em vários componentes/telas diferentes.
 */
export function AdaptiveTableSkeleton({ columns = 5, rows }: { columns?: number; rows?: number }) {
  const isMobile = useIsMobile();
  return isMobile ? <MobileCardListSkeleton rows={rows} /> : <TableSkeleton columns={columns} rows={rows} />;
}
