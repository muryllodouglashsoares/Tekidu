import type { ElementType, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT, VIEWPORT_ONCE } from "./motion";

/**
 * Envolve qualquer bloco com o scroll-reveal padrão da Landing Page
 * (fade + leve subida, disparado uma única vez ao entrar na viewport).
 * `delay` em segundos-friendly (ms) permite escalonar elementos de uma
 * mesma seção. Internamente usa framer-motion (`whileInView`), que já
 * resolve `prefers-reduced-motion` e nunca depende de scroll listeners.
 */
export function Reveal({
  children,
  delay = 0,
  as = "div",
  className = "",
  ...props
}: {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
} & Record<string, unknown>) {
  const reducedMotion = useReducedMotion();
  const MotionTag = motion(as as ElementType);

  if (reducedMotion) {
    const Tag = as;
    return (
      <Tag className={className} {...props}>
        {children}
      </Tag>
    );
  }

  return (
    <MotionTag
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: 0.7, ease: EASE_OUT, delay: delay / 1000 }}
      className={className}
      {...props}
    >
      {children}
    </MotionTag>
  );
}

/** Rótulo pequeno, maiúsculo e espaçado usado como "olho" de cada seção. */
export function SectionEyebrow({
  children,
  tone = "success",
}: {
  children: ReactNode;
  tone?: "success" | "ink";
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] ${
        tone === "success" ? "text-success" : "text-ink-400"
      }`}
    >
      <span className={`h-px w-6 ${tone === "success" ? "bg-success" : "bg-ink-400"}`} aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * Elemento gráfico de assinatura do Tekidu: um traço diagonal
 * terminando em um ponto — a mesma forma da logo, reaproveitada como
 * motivo visual (trajetória/evolução) em toda a Landing Page.
 * `animate` liga um pequeno scale-in de entrada (usado no CTA final).
 */
export function TrajectoryMark({
  className = "",
  animate = false,
}: {
  className?: string;
  animate?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const svg = (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M5 19 L18 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="18.5" cy="5.5" r="2" fill="currentColor" />
    </svg>
  );

  if (!animate || reducedMotion) return svg;

  return (
    <motion.span
      className="inline-flex"
      initial={{ opacity: 0, scale: 0.5, rotate: -8 }}
      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: 0.5, ease: EASE_OUT }}
    >
      {svg}
    </motion.span>
  );
}

/**
 * Divisor pontilhado com dois marcadores. Os pontos "acendem" em
 * sequência uma única vez quando o divisor entra em foco — reforça o
 * motivo de "pontos de dados" sem virar loop infinito.
 */
export function DottedDivider() {
  const reducedMotion = useReducedMotion();
  const dotProps = (delay: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, scale: 0 },
          whileInView: { opacity: 1, scale: 1 },
          viewport: VIEWPORT_ONCE,
          transition: { duration: 0.4, ease: EASE_OUT, delay },
        };

  return (
    <svg viewBox="0 0 1200 24" className="h-6 w-full text-line" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="12" x2="1200" y2="12" stroke="currentColor" strokeWidth="1" strokeDasharray="2 8" />
      <motion.circle cx="260" cy="12" r="3" className="text-success" fill="currentColor" {...dotProps(0.1)} />
      <motion.circle cx="820" cy="12" r="3" className="text-success" fill="currentColor" {...dotProps(0.3)} />
    </svg>
  );
}

/**
 * Número animado (count-up) — recebe o valor já pronto vindo de
 * `useCountUp` (ver `motion.ts`) para não duplicar a lógica de
 * viewport/reduced-motion em cada seção.
 */
export function AnimatedNumber({
  refEl,
  formatted,
  suffix = "",
  className = "",
}: {
  refEl: React.RefObject<HTMLSpanElement>;
  formatted: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <span ref={refEl} className={`tabular ${className}`}>
      {formatted}
      {suffix}
    </span>
  );
}
