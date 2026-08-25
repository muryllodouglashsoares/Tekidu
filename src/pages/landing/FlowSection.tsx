import { Database, Sparkles, TrendingUp, Eye, ArrowRight } from "lucide-react";
import { Reveal, SectionEyebrow } from "./LandingPrimitives";

const STEPS = [
  { icon: Database, title: "Dados acadêmicos", detail: "Notas · Frequência · Avaliações", active: false },
  { icon: Sparkles, title: "Tekidu", detail: "Centralização e análise", active: true },
  { icon: TrendingUp, title: "Desenvolvimento", detail: "Indicadores · Contexto · Histórico", active: false },
  { icon: Eye, title: "Visão do aluno", detail: "Trajetória completa e visível", active: false },
];

const RESULT_STATS = [
  { label: "Notas", value: "8,2", delta: "+0.6" },
  { label: "Frequência", value: "94%", delta: "+2%" },
  { label: "Avaliações", value: "4/4", delta: "Concluídas" },
];

/**
 * "Tekidu em movimento": mesma ideia do Hero (dados → evolução), agora
 * como um fluxo horizontal explícito — o "como funciona" da plataforma.
 */
export function FlowSection() {
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

      <Reveal delay={160} className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <div key={step.title} className="relative">
            <div
              className={`h-full rounded-2xl border p-6 text-left transition-colors ${
                step.active ? "border-success/40 bg-success/10" : "border-line bg-surface"
              }`}
            >
              <step.icon className={`h-5 w-5 ${step.active ? "text-success" : "text-ink-400"}`} />
              <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-ink900">{step.title}</p>
              <p className="mt-1 text-xs text-ink-500">{step.detail}</p>
            </div>
            {i < STEPS.length - 1 && (
              <ArrowRight
                className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-ink-300 lg:block"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </Reveal>

      <Reveal delay={240} className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-4">
        {RESULT_STATS.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-surface px-4 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">{stat.label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular text-ink900">{stat.value}</p>
            <p className="mt-0.5 text-xs font-medium text-success">{stat.delta}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
