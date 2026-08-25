import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./LandingPrimitives";
import { useScrollReveal } from "./useScrollReveal";

const PRODUCT_STEPS = ["Início", "Disciplinas", "Avaliações", "Frequência", "Desempenho", "Evolução"];

const TRAIL_POINTS = [
  { x: 40, y: 210, label: "8,0", tag: null as string | null },
  { x: 260, y: 150, label: "7,8", tag: "NOTA MÉDIA" },
  { x: 480, y: 92, label: "94%", tag: "FREQUÊNCIA" },
  { x: 700, y: 40, label: "+23%", tag: "EVOLUÇÃO — SEMESTRAL" },
];

const pathD = TRAIL_POINTS.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

/**
 * Hero — composição própria (não é "texto à esquerda + dashboard à
 * direita"): headline central, seguida da "linha de evolução" como
 * elemento gráfico de assinatura, com pontos de dados flutuantes.
 */
export function HeroSection() {
  const { ref: chartRef, visible: chartVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section id="topo" className="relative overflow-hidden pb-20 pt-16 sm:pb-28 sm:pt-20">
      {/* Glow de fundo — sutil, não uma área grande saturada */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgb(var(--tk-success-500)/0.14),transparent)]"
      />

      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-ink-400">
            <span className="h-px w-6 bg-success" aria-hidden="true" />
            Sistema de gestão escolar · 2026
          </span>
        </Reveal>

        <Reveal delay={80} as="h1" className="mt-6 font-heading text-4xl font-bold leading-[1.1] tracking-tight text-ink900 sm:text-5xl lg:text-6xl">
          A trajetória de cada aluno.
          <br />
          <span className="text-success">Finalmente visível.</span>
        </Reveal>

        <Reveal delay={160}>
          <p className="mx-auto mt-6 max-w-2xl text-base text-ink-500 sm:text-lg">
            O Tekidu transforma dados acadêmicos em uma visão clara da trajetória e desenvolvimento de cada
            estudante — conectando escola, professores e alunos.
          </p>
        </Reveal>

        <Reveal delay={240} className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-success px-7 py-3.5 text-sm font-semibold uppercase tracking-widest text-white shadow-sm transition-transform hover:scale-[1.02]"
          >
            Entrar na plataforma
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#problema"
            className="text-sm font-semibold uppercase tracking-widest text-ink-500 transition-colors hover:text-ink900"
          >
            Como funciona ↓
          </a>
        </Reveal>

        <Reveal delay={320} className="mx-auto mt-14 flex max-w-md items-center justify-center gap-8 sm:gap-14">
          <HeroStat value="8,2" label="Média geral" />
          <div className="h-8 w-px bg-line" aria-hidden="true" />
          <HeroStat value="94%" label="Frequência" />
          <div className="h-8 w-px bg-line" aria-hidden="true" />
          <HeroStat value="32" label="Alunos ativos" />
        </Reveal>
      </div>

      {/* Linha de evolução — elemento de assinatura do Hero */}
      <div
        ref={chartRef}
        className={`reveal ${chartVisible ? "reveal-visible" : ""} relative mx-auto mt-20 max-w-5xl px-4 sm:px-6`}
        style={{ "--reveal-delay": "200ms" } as CSSProperties}
      >
        <div className="relative h-[240px] sm:h-[300px]">
          <svg
            viewBox="0 0 760 260"
            className="h-full w-full overflow-visible"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={pathD}
              fill="none"
              stroke="rgb(var(--tk-success-500))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`reveal-line ${chartVisible ? "reveal-visible" : ""}`}
              style={{ "--line-length": 900 } as CSSProperties}
            />
            {TRAIL_POINTS.map((p) => (
              <circle key={p.label} cx={p.x} cy={p.y} r="4" fill="rgb(var(--tk-success-500))" />
            ))}
          </svg>

          {/* Chip do aluno, ancorado no primeiro ponto da linha */}
          <div className="absolute left-0 top-[78%] hidden w-44 -translate-y-1/2 rounded-xl border border-line bg-surface/90 p-3 text-left shadow-sm backdrop-blur-sm sm:block sm:w-48">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">Aluno</p>
            <p className="mt-0.5 text-sm font-semibold text-ink900">João Silva</p>
            <p className="text-xs text-ink-500">3º Ano A · Matemática</p>
          </div>

          {/* Tags flutuantes ancoradas nos pontos seguintes */}
          {TRAIL_POINTS.slice(1).map((p) => (
            <div
              key={p.tag}
              className="absolute -translate-x-1/2 -translate-y-[calc(100%+12px)] hidden whitespace-nowrap rounded-lg border border-line bg-surface/90 px-3 py-1.5 text-left shadow-sm backdrop-blur-sm sm:block"
              style={{ left: `${(p.x / 760) * 100}%`, top: `${(p.y / 260) * 100}%` }}
            >
              <p className="text-[9px] font-semibold uppercase tracking-widest text-ink-400">{p.tag}</p>
              <p className="font-mono text-sm font-semibold tabular text-ink900">{p.label}</p>
            </div>
          ))}
        </div>

        {/* Trilha de seções do produto — reforça a ponte marketing → produto */}
        <div className="mt-4 flex items-center justify-between gap-4 overflow-x-auto border-t border-line pt-4 text-[10px] font-semibold uppercase tracking-widest text-ink-400 sm:gap-0 sm:text-xs">
          {PRODUCT_STEPS.map((step, i) => (
            <span key={step} className={`shrink-0 ${i === PRODUCT_STEPS.length - 1 ? "text-success" : ""}`}>
              {step}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="font-mono text-2xl font-semibold tabular text-ink900 sm:text-3xl">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-ink-400 sm:text-xs">{label}</p>
    </div>
  );
}
