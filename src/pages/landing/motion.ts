import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useInView, type Variants } from "framer-motion";

/**
 * Camada de animação da Landing Page (framer-motion).
 *
 * Princípios (ver briefing "Camada de Animação e UX de Impacto"):
 *  - Só `transform` e `opacity` são animados (sem width/height/top/left).
 *  - Toda animação de entrada dispara uma única vez, via viewport
 *    (`whileInView` + `viewport={{ once: true }}`), nunca por scroll
 *    listener recalculando a cada frame.
 *  - `prefers-reduced-motion` é resolvido de forma centralizada aqui
 *    (`EASE`/`durations` ficam artificialmente curtos e sem
 *    deslocamento quando o usuário pediu menos movimento — ver
 *    `useReducedMotionSafe`), nunca depende só do CSS.
 */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const VIEWPORT_ONCE = { once: true, margin: "-10% 0px -10% 0px" } as const;

/** Fade + subida leve — a unidade básica de entrada usada em quase toda a página. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

/** Container que escalona a entrada dos filhos (usa junto de `fadeUp` nos filhos). */
export function staggerContainer(staggerChildren = 0.09, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren, delayChildren },
    },
  };
}

/** Entrada com leve escala — reservado para o elemento de assinatura (H1 do Hero, ícone do CTA final). */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE_OUT } },
};

/**
 * Hook central de `prefers-reduced-motion`. Usado nos componentes para
 * decidir entre a transição animada e a versão instantânea — nunca só
 * via CSS, porque animações orientadas por JS (count-up, "sinal" na
 * trajetória, gráfico de barras) precisam desse sinal em tempo de
 * execução para não rodar de forma alguma.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useLayoutEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Garante o valor certo já no primeiro paint (não só depois do
    // primeiro efeito), para nunca deixar uma animação começar a
    // rodar e só ser cancelada depois — o requisito é que quem pediu
    // menos movimento nunca veja o movimento, nem por um instante.
    if (mql.matches !== reduced) setReduced(mql.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return reduced;
}

/**
 * Conta de 0 até `value` quando o elemento entra na viewport (uma
 * única vez). Com `prefers-reduced-motion`, mostra o valor final
 * direto — nunca depende da animação para o número ficar visível.
 */
export function useCountUp(value: number, options?: { duration?: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, VIEWPORT_ONCE);
  const reducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(reducedMotion ? value : 0);
  const duration = options?.duration ?? 1200;
  const decimals = options?.decimals ?? 0;

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      return;
    }
    if (!inView) return;

    let raf = 0;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutCubic — desacelera perto do fim, sem overshoot.
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reducedMotion]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();

  return { ref, formatted };
}

/**
 * Liga/desliga uma animação contínua (ex.: pulso no último ponto da
 * trajetória) conforme o elemento está ou não na tela — evita gastar
 * CPU/GPU com algo que o usuário não está vendo, e nunca roda se
 * `prefers-reduced-motion` estiver ativo.
 */
export function useLoopWhileVisible<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reducedMotion = usePrefersReducedMotion();
  return { ref, active: inView && !reducedMotion };
}
