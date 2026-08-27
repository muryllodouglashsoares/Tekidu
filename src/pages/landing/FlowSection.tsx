import { Database, Sparkles, TrendingUp, Eye, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal, SectionEyebrow } from "./LandingPrimitives";
import { EASE_OUT, VIEWPORT_ONCE, useCountUp } from "./motion";

const STEPS = [
  { icon: Database, title: "Dados acadêmicos", detail: "Notas · Frequência · Avaliações", active: false },
  { icon: Sparkles, title: "Tekidu", detail: "Centralização e análise", active: true },
  { icon: TrendingUp, title: "Desenvolvimento", detail: "Indicadores · Contexto · Histórico", active: false },
  { icon: Eye, title: "Visão do aluno", detail: "Trajetória completa e visível", active: false },
];

const RESULT_STATS = [
  { label: "Notas", value: 8.2, decimals: 1, delta: "+0.6" },
  { label: "Frequência", value: 94, suffix: "%", delta: "+2%" },
  { label: "Avaliações", value: 4, suffix: "/4", delta: "Concluídas" },
];

/**
 * "Tekidu em movimento": mesma ideia do Hero (dados → evolução), agora
 * como um fluxo horizontal explícito — o "como funciona" da plataforma.
 * Os 4 cartões entram em cascata própria (não como um bloco só) e as
 * setas avançam na mesma sequência, reforçando a direção do fluxo. O
 * cartão "Tekidu" (etapa central/ativa) pulsa algumas vezes ao entrar
 * em foco — nunca em loop indefinido.
 */
export function FlowSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section id="plataforma" className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
      <Reveal>
        <SectionEyebrow>Tekidu em movimento</SectionEyebrow>
      </Reveal>
      <Reveal delay={80} as="h2" className="mx-auto mt-4 max-w-2xl font-heading text-3xl font-bold leading-tight tracking-tight text-ink900 sm:text-4xl">
        Dados entram.
        <br />
        <span className="text-success">Evolução emerge.</span>
      </Reveal>

      <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <div key={step.title} className="relative">
            <motion.div
              initial={reducedMotion ? undefined : { opacity: 0, y: 24 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: 0.55, ease: EASE_OUT, delay: 0.15 + i * 0.12 }}
              whileHover={reducedMotion ? undefined : { y: -3 }}
              className={`h-full rounded-2xl border p-6 text-left transition-colors ${
                step.active ? "border-success/40 bg-success/10" : "border-line bg-surface"
              }`}
            >
              {step.active && !reducedMotion ? (
                <motion.div
                  className="inline-flex"
                  initial={{ scale: 1 }}
                  whileInView={{ scale: [1, 1.15, 1, 1.1, 1] }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ duration: 1.1, delay: 0.6, ease: EASE_OUT }}
                >
                  <step.icon className="h-5 w-5 text-success" />
                </motion.div>
              ) : (
                <step.icon className={`h-5 w-5 ${step.active ? "text-success" : "text-ink-400"}`} />
              )}
              <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-ink900">{step.title}</p>
              <p className="mt-1 text-xs text-ink-500">{step.detail}</p>
            </motion.div>
            {i < STEPS.length - 1 && (
              <motion.div
                initial={reducedMotion ? undefined : { opacity: 0, x: -6 }}
                whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.35 + i * 0.12 }}
                className="absolute -right-3 top-1/2 hidden -translate-y-1/2 lg:block"
              >
                <ArrowRight className="h-5 w-5 text-ink-300" aria-hidden="true" />
              </motion.div>
            )}
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-4">
        {RESULT_STATS.map((stat, i) => (
          <Reveal key={stat.label} delay={240 + i * 80} className="rounded-xl border border-line bg-surface px-4 py-5">
            <FlowStat {...stat} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function FlowStat({
  label,
  value,
  decimals = 0,
  suffix = "",
  delta,
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  delta: string;
}) {
  const { ref, formatted } = useCountUp(value, { decimals });
  const display = decimals > 0 ? formatted.replace(".", ",") : formatted;

  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular text-ink900">
        <span ref={ref}>{display}</span>
        {suffix}
      </p>
      <p className="mt-0.5 text-xs font-medium text-success">{delta}</p>
    </>
  );
}
