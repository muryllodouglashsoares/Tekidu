import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export interface SortState<K extends string> {
  key: K | null;
  direction: SortDirection;
}

/**
 * Hook genérico de ordenação (Fase 3/4 — "permitir ordenação por
 * colunas relevantes"). `getValue` extrai o valor comparável de cada
 * coluna a partir do item; `keys` limitam quais colunas podem ser
 * usadas para ordenar (evita ordenar por uma coluna sem sentido).
 * Clicar na mesma coluna alterna asc/desc; trocar de coluna volta
 * para asc.
 */
export function useSort<T, K extends string>(
  items: T[],
  getValue: (item: T, key: K) => string | number | null,
  initial: SortState<K> = { key: null, direction: "asc" }
) {
  const [sort, setSort] = useState<SortState<K>>(initial);

  function toggleSort(key: K) {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
    });
  }

  const sorted = useMemo(() => {
    if (!sort.key) return items;
    const key = sort.key;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...items].sort((a, b) => {
      const va = getValue(a, key);
      const vb = getValue(b, key);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * factor;
      return String(va).localeCompare(String(vb), "pt-BR") * factor;
    });
  }, [items, sort, getValue]);

  return { sort, toggleSort, sorted };
}
