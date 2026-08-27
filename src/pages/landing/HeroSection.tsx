import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Reveal } from "./LandingPrimitives";
import { EASE_OUT, VIEWPORT_ONCE, useCountUp, useLoopWhileVisible, usePrefersReducedMotion } from "./motion";

const PRODUCT_STEPS = ["Início", "Disciplinas", "Avaliações", "Frequência", "Desempenho", "Evolução"];

const TRAIL_POINTS = [
  { x: 40, y: 210, label: "8,0", tag: null as string | null },
  { x: 260, y: 150, label: "7,8", tag: "NOTA MÉDIA" },
  { x: 480, y: 92, label: "94%", tag: "FREQUÊNCIA" },
  { x: 700, y: 40, label: "+23%", tag: "EVOLUÇÃO — SEMESTRAL" },
];

const pathD = TRAIL_POINTS.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

// Duração do "desenho" da linha — usada tanto no path quanto para
// calcular quando os pontos/tags de cada trecho devem aparecer.
const LINE_DURATION = 1.3;

/**
 * Hero — composição própria (não é "texto à esquerda + dashboard à
 * direita"): headline central, seguida da "linha de evolução" como
 * elemento gráfico de assinatura, com pontos de dados flutuantes.
 */
export function HeroSection() {
  const reducedMotion = usePrefersReducedMotion();

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

        {/* Headline — leve escala + desfoque na entrada, além do fade+subida
            padrão, para dar mais peso ao elemento mais importante da página. */}
        <motion.h1
          initial={reducedMotion ? undefined : { opacity: 0, y: 20, scale: 0.98, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.08 }}
          className="mt-6 font-heading text-4xl font-bold leading-[1.1] tracking-tight text-ink900 sm:text-5xl lg:text-6xl"
        >
          A trajetória de cada aluno.
          <br />
          <span className="text-success">Finalmente visível.</span>
        </motion.h1>

        <Reveal delay={160}>
          <p className="mx-auto mt-6 max-w-2xl text-base text-ink-500 sm:text-lg">
            O Tekidu transforma dados acadêmicos em uma visão clara da trajetória e desenvolvimento de cada
            estudante — conectando escola, professores e alunos.
          </p>
        </Reveal>

        <Reveal delay={240} className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/login"
            className="group inline-flex items-center gap-2 rounded-full bg-success px-7 py-3.5 text-sm font-semibold uppercase tracking-widest text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Entrar na plataforma
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
          <a
            href="#problema"
            className="text-sm font-semibold uppercase tracking-widest text-ink-500 transition-colors hover:text-ink900"
          >
            Como funciona ↓
          </a>
        </Reveal>

        <Reveal delay={320} className="mx-auto mt-14 flex max-w-md items-center justify-center gap-8 sm:gap-14">
          <HeroStat value={8.2} decimals={1} label="Média geral" />
          <div className="h-8 w-px bg-line" aria-hidden="true" />
          <HeroStat value={94} suffix="%" label="Frequência" />
          <div className="h-8 w-px bg-line" aria-hidden="true" />
          <HeroStat value={32} label="Alunos ativos" />
        </Reveal>
      </div>

      {/* Linha de evolução — elemento de assinatura do Hero */}
      <Reveal delay={200} className="relative mx-auto mt-20 max-w-5xl px-4 sm:px-6">
        <TrajectoryGraphic reducedMotion={reducedMotion} />

        {/* Trilha de seções do produto — reforça a ponte marketing → produto */}
        <div className="mt-4 flex items-center justify-between gap-4 overflow-x-auto border-t border-line pt-4 text-[10px] font-semibold uppercase tracking-widest text-ink-400 sm:gap-0 sm:text-xs">
          {PRODUCT_STEPS.map((step, i) => (
            <span key={step} className={`shrink-0 ${i === PRODUCT_STEPS.length - 1 ? "text-success" : ""}`}>
              {step}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/**
 * Efeito de assinatura do Hero: a linha se desenha (path drawing),
 * os pontos de dados aparecem em cascata conforme a linha "chega"
 * neles, e um pequeno sinal percorre o trajeto inteiro uma única vez
 * ao final — encerrando em um pulso contido sobre o último ponto
 * (a evolução mais recente), pausado sempre que a seção sai da tela.
 */
function TrajectoryGraphic({ reducedMotion }: { reducedMotion: boolean }) {
  const { ref, active: pulseActive } = useLoopWhileVisible<HTMLDivElement>();
  const [signalDone, setSignalDone] = useState(reducedMotion);
  const last = TRAIL_POINTS[TRAIL_POINTS.length - 1];

  return (
    <div ref={ref} className="relative h-[240px] sm:h-[300px]">
      <svg
        viewBox="0 0 760 260"
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <motion.path
          d={pathD}
          fill="none"
          stroke="rgb(var(--tk-success-500))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reducedMotion ? undefined : { pathLength: 0 }}
          whileInView={reducedMotion ? undefined : { pathLength: 1 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: LINE_DURATION, ease: EASE_OUT }}
        />

        {TRAIL_POINTS.map((p, i) => (
          <motion.circle
            key={p.label}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="rgb(var(--tk-success-500))"
            initial={reducedMotion ? undefined : { opacity: 0, scale: 0 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, scale: 1 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.15 + (i / (TRAIL_POINTS.length - 1)) * LINE_DURATION }}
            style={{ transformOrigin: `${p.x}px ${p.y}px` }}
          />
        ))}

        {/* Sinal que percorre a linha já desenhada, uma única vez */}
        {!reducedMotion && (
          <motion.circle
            r="5"
            fill="rgb(var(--tk-success-300))"
            stroke="rgb(var(--tk-success-600))"
            strokeWidth="1.5"
            initial={{ cx: TRAIL_POINTS[0].x, cy: TRAIL_POINTS[0].y, opacity: 0 }}
            whileInView={{
              cx: TRAIL_POINTS.map((p) => p.x),
              cy: TRAIL_POINTS.map((p) => p.y),
              opacity: [0, 1, 1, 1],
            }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: 1, ease: "easeInOut", delay: LINE_DURATION + 0.1 }}
            onAnimationComplete={() => setSignalDone(true)}
          />
        )}

        {/* Pulso contido no último ponto — só roda enquanto o Hero está visível */}
        {signalDone && (
          <motion.circle
            cx={last.x}
            cy={last.y}
            r="4"
            fill="none"
            stroke="rgb(var(--tk-success-500))"
            strokeWidth="1.5"
            initial={{ opacity: 0.6, scale: 1 }}
            animate={pulseActive ? { opacity: [0.6, 0, 0.6], scale: [1, 2.4, 1] } : { opacity: 0, scale: 1 }}
            transition={pulseActive ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
            style={{ transformOrigin: `${last.x}px ${last.y}px` }}
          />
        )}
      </svg>

      {/* Chip do aluno, ancorado no primeiro ponto da linha */}
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
        whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={VIEWPORT_ONCE}
        transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.15 }}
        className="absolute left-0 top-[78%] hidden w-44 -translate-y-1/2 rounded-xl border border-line bg-surface/90 p-3 text-left shadow-sm backdrop-blur-sm sm:block sm:w-48"
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">Aluno</p>
        <p className="mt-0.5 text-sm font-semibold text-ink900">João Silva</p>
        <p className="text-xs text-ink-500">3º Ano A · Matemática</p>
      </motion.div>

      {/* Tags flutuantes ancoradas nos pontos seguintes — entram logo
          depois que a linha "chega" em cada ponto correspondente. A
          última (mais próxima da borda direita) ancora direto em
          `right-0` do container, garantindo que nunca vaze da viewport
          em nenhuma largura — em vez de depender de matemática de
          porcentagem/translate, que é frágil perto das bordas. */}
      {TRAIL_POINTS.slice(1).map((p, i) => {
        const xPct = p.x / 760;
        const isLast = i === TRAIL_POINTS.length - 2;
        const positionStyle = isLast
          ? { right: 0, top: `${(p.y / 260) * 100}%` }
          : { left: `${xPct * 100}%`, top: `${(p.y / 260) * 100}%` };
        const anchorClass = isLast ? "" : xPct < 0.2 ? "translate-x-0" : "-translate-x-1/2";
        return (
          <motion.div
            key={p.tag}
            initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{
              duration: 0.4,
              ease: EASE_OUT,
              delay: 0.35 + ((i + 1) / (TRAIL_POINTS.length - 1)) * LINE_DURATION,
            }}
            className={`absolute -translate-y-[calc(100%+12px)] hidden max-w-[180px] whitespace-nowrap rounded-lg border border-line bg-surface/90 px-3 py-1.5 text-left shadow-sm backdrop-blur-sm sm:block ${anchorClass}`}
            style={positionStyle}
          >
            <p className="text-[9px] font-semibold uppercase tracking-widest text-ink-400">{p.tag}</p>
            <p className="font-mono text-sm font-semibold tabular text-ink900">{p.label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

function HeroStat({
  value,
  label,
  decimals = 0,
  suffix = "",
}: {
  value: number;
  label: string;
  decimals?: number;
  suffix?: string;
}) {
  const { ref, formatted } = useCountUp(value, { decimals });
  const display = decimals > 0 ? formatted.replace(".", ",") : formatted;

  return (
    <div className="text-center">
      <p className="font-mono text-2xl font-semibold tabular text-ink900 sm:text-3xl">
        <span ref={ref}>{display}</span>
        {suffix}
      </p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-ink-400 sm:text-xs">{label}</p>
    </div>
  );
}
