import { useEffect, useState } from "react";

/**
 * Assina um media query nativo (`matchMedia`) e devolve se ele
 * "bate" agora, atualizando em tempo real quando a viewport muda
 * (resize, rotação de tela, DevTools). Preferido a medir
 * `window.innerWidth` manualmente: usa o mesmo mecanismo do CSS,
 * então nunca diverge dos breakpoints do Tailwind.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    function onChange(e: MediaQueryListEvent) {
      setMatches(e.matches);
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/**
 * Breakpoint único usado por toda a camada mobile do Tekidu (Bottom
 * Navigation, Header contextual, cards no lugar de tabela...) — mesmo
 * valor do `md` do Tailwind (768px), para nunca divergir entre a
 * lógica em JS (este hook) e o `hidden md:block`/`md:hidden` usado no
 * restante do app.
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
