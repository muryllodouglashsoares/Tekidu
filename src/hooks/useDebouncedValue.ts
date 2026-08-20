import { useEffect, useState } from "react";

/**
 * Retorna uma versão "atrasada" de `value`, atualizada somente depois
 * que o usuário para de digitar por `delayMs`. Usado nos campos de
 * busca das telas de listagem (Fase 3 — "busca por texto; debounce
 * quando necessário") para evitar refiltrar a cada tecla digitada.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
