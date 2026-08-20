import { useEffect, useMemo, useState } from "react";

/**
 * Paginação (Fase 4). Opera sobre um array já filtrado/ordenado em
 * memória — coerente com a arquitetura atual do Tekidu, em que cada
 * service (`getStudents`, `getClasses`, etc.) já carrega a coleção
 * inteira uma vez por visita à página, e todas as buscas/filtros são
 * aplicados no cliente sobre esse array (ver `StudentsPage`,
 * `ClassesPage`...). Paginar de fato no Firestore (cursors por
 * combinação de filtro) exigiria reescrever essa camada de dados
 * página a página, o que não faz parte desta etapa — aqui a paginação
 * evita renderizar centenas de linhas de uma vez e dá a UX profissional
 * pedida (página atual/total, anterior/próxima/primeira/última), sem
 * fingir uma paginação que não existe.
 */
export function usePagination<T>(items: T[], initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  function changePageSize(size: number) {
    setPageSize(size);
    setPage(1);
  }

  return {
    page,
    pageSize,
    totalPages,
    totalItems,
    pageItems,
    setPage,
    changePageSize,
    resetPage: () => setPage(1),
  };
}
