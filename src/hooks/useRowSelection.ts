import { useMemo, useState } from "react";

/**
 * Seleção múltipla de linhas (Fase 4 — "ações em lote"). Guarda um
 * Set de ids selecionados que sobrevive à paginação/filtros (um item
 * selecionado na página 1 continua selecionado se o usuário for para
 * a página 2), o que é o comportamento esperado de tabelas
 * profissionais. `visibleIds` é a lista de ids da página atual, usada
 * apenas para calcular o estado do checkbox "selecionar tudo".
 */
export function useRowSelection<T>(getId: (item: T) => string) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggle(item: T) {
    const id = getId(item);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isSelected(item: T) {
    return selectedIds.has(getId(item));
  }

  function clear() {
    setSelectedIds(new Set());
  }

  function selectAllVisible(visibleItems: T[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of visibleItems) next.add(getId(item));
      return next;
    });
  }

  function deselectAllVisible(visibleItems: T[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of visibleItems) next.delete(getId(item));
      return next;
    });
  }

  function toggleAllVisible(visibleItems: T[]) {
    const allSelected = visibleItems.length > 0 && visibleItems.every((item) => selectedIds.has(getId(item)));
    if (allSelected) deselectAllVisible(visibleItems);
    else selectAllVisible(visibleItems);
  }

  function visibleSelectionState(visibleItems: T[]): "all" | "some" | "none" {
    if (visibleItems.length === 0) return "none";
    const selectedCount = visibleItems.filter((item) => selectedIds.has(getId(item))).length;
    if (selectedCount === 0) return "none";
    if (selectedCount === visibleItems.length) return "all";
    return "some";
  }

  const count = selectedIds.size;

  return useMemo(
    () => ({
      selectedIds,
      count,
      toggle,
      isSelected,
      clear,
      toggleAllVisible,
      visibleSelectionState,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds]
  );
}
