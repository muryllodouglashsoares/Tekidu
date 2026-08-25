import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { DottedDivider, Reveal, TrajectoryMark } from "./LandingPrimitives";

export function ClosingCtaSection() {
  return (
    <section className="relative overflow-hidden py-24 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_50%_50%_at_50%_20%,rgb(var(--tk-success-500)/0.12),transparent)]"
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal className="flex items-center justify-center gap-3">
          <span className="h-px w-10 bg-line" aria-hidden="true" />
          <TrajectoryMark className="h-4 w-4 text-success" />
          <span className="h-px w-10 bg-line" aria-hidden="true" />
        </Reveal>

        <Reveal delay={80} as="h2" className="mt-6 font-heading text-3xl font-bold leading-tight tracking-tight text-ink900 sm:text-4xl">
          Pronto para ver a
          <br />
          <span className="text-success">evolução de cada aluno?</span>
        </Reveal>

        <Reveal delay={160}>
          <p className="mx-auto mt-5 max-w-lg text-base text-ink-500">
            Acesse a plataforma e descubra como uma gestão acadêmica moderna transforma o dia a dia da sua
            escola.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <Link
            to="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-success px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-white shadow-sm transition-transform hover:scale-[1.02]"
          >
            Entrar na plataforma
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>

        <Reveal delay={300} className="mx-auto mt-14 flex max-w-sm items-center justify-center gap-8">
          <ClosingStat value="248" label="Alunos" />
          <div className="h-8 w-px bg-line" aria-hidden="true" />
          <ClosingStat value="14" label="Turmas" />
          <div className="h-8 w-px bg-line" aria-hidden="true" />
          <ClosingStat value="8" label="Disciplinas" />
        </Reveal>
      </div>

      <div className="mx-auto mt-20 max-w-5xl px-4 sm:px-6">
        <DottedDivider />
      </div>
    </section>
  );
}

function ClosingStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="font-mono text-2xl font-semibold tabular text-ink900">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-ink-400">{label}</p>
    </div>
  );
}
