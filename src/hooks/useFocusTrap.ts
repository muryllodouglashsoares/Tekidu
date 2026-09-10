import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Gerenciamento de foco para diálogos/sheets (Modal, MobileSheet,
 * AccessibilityPanel — item 13 do briefing de acessibilidade):
 *
 *  1. Ao abrir, guarda o elemento que tinha foco e move o foco para
 *     dentro do container (primeiro elemento com `data-autofocus`, ou
 *     o primeiro elemento focável, ou o próprio container).
 *  2. Enquanto aberto, prende o `Tab`/`Shift+Tab` dentro do container
 *     (o restante da página fica inacessível por teclado, como um
 *     `<dialog>` nativo em modo modal).
 *  3. Ao fechar, devolve o foco para o elemento que abriu o diálogo.
 *
 * Reutilizado por todo componente do tipo diálogo/sheet do app, em vez
 * de cada um reimplementar sua própria versão (ver item 28 do
 * briefing: "corrigir uma vez → melhorar a aplicação inteira").
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    const timer = setTimeout(() => {
      if (!container) return;
      const autofocusTarget = container.querySelector<HTMLElement>("[data-autofocus]");
      const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (autofocusTarget ?? firstFocusable ?? container).focus();
    }, 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (e.shiftKey) {
        if (current === first || !container.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (current === last || !container.contains(current)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown, true);
      // Restaura o foco para quem abriu o diálogo, se ele ainda
      // existir no documento (pode ter sido removido, ex.: item de
      // lista excluído por dentro do próprio diálogo).
      const previous = previousFocusRef.current;
      if (previous && document.contains(previous)) {
        previous.focus();
      }
    };
  }, [active]);

  return containerRef;
}
