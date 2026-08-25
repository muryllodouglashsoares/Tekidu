import { useEffect, useRef, useState } from "react";

/**
 * Ativa a classe `.reveal-visible` (ver src/index.css) quando o elemento
 * entra na viewport, para o scroll-reveal usado nas seções da Landing
 * Page (item 12/13 do briefing: animação com propósito — direcionar
 * atenção, nunca "preencher espaço"). Dispara uma única vez por
 * elemento; respeita `prefers-reduced-motion` via CSS, não aqui.
 */
export function useScrollReveal<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px", ...options }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, visible };
}
