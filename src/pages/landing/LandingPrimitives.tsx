import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";
import { useScrollReveal } from "./useScrollReveal";

/**
 * Envolve qualquer bloco com o scroll-reveal padrão da Landing Page.
 * `delay` em ms permite escalonar elementos de uma mesma seção (ex.:
 * itens de uma lista aparecendo em sequência).
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
  ...props
}: {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  const { ref, visible } = useScrollReveal<HTMLElement>();
  const style = { "--reveal-delay": `${delay}ms` } as CSSProperties;

  return (
    <Tag
      ref={ref}
      style={style}
      className={`reveal ${visible ? "reveal-visible" : ""} ${className}`}
      {...props}
    >
      {children}
    </Tag>
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
 * motivo visual (trajetória/evolução) em toda a Landing Page, conforme
 * item 10 do briefing ("elemento visual de assinatura").
 */
export function TrajectoryMark({ className = "" }: { className?: string }) {
  return (
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
}

/** Divisor pontilhado com dois marcadores, usado entre Hero/CTA final e o rodapé. */
export function DottedDivider() {
  return (
    <svg viewBox="0 0 1200 24" className="h-6 w-full text-line" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="12" x2="1200" y2="12" stroke="currentColor" strokeWidth="1" strokeDasharray="2 8" />
      <circle cx="260" cy="12" r="3" className="text-success" fill="currentColor" />
      <circle cx="820" cy="12" r="3" className="text-success" fill="currentColor" />
    </svg>
  );
}
