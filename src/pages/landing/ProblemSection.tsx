import { Reveal, SectionEyebrow } from "./LandingPrimitives";

const BULLETS = [
  "Informações acadêmicas sem conexão",
  "Professores sem visão do contexto do aluno",
  "Gestão reativa, não proativa",
  "Alunos sem consciência da própria evolução",
];

const FRAGMENTS = [
  { label: "Frequência", value: "??", hint: "Sem atualização", top: "6%", left: "4%" },
  { label: "Nota — Mat.", value: "7.4", hint: "Planilha local", top: "0%", left: "58%" },
  { label: "Avaliação", value: "—", hint: "Não registrado", top: "42%", left: "0%" },
  { label: "Boletim", value: "?", hint: "Pendente", top: "30%", left: "48%" },
  { label: "Presença", value: "3/8", hint: "Dado antigo", top: "72%", left: "18%" },
  { label: "Média geral", value: "—", hint: "Indisponível", top: "60%", left: "62%" },
];

// Conexões pontilhadas entre alguns dos cartões — sugerem dados que
// deveriam se relacionar, mas não se relacionam (o problema).
const LINKS: Array<[number, number]> = [
  [0, 2],
  [1, 3],
  [3, 5],
  [2, 4],
];

/**
 * "O problema": mesma linguagem visual do Hero (pontos, linhas), mas
 * aqui desconectada e neutra/apagada — o oposto da trajetória verde,
 * contínua, do restante da página.
 */
export function ProblemSection() {
  return (
    <section id="problema" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div className="grid items-center gap-16 lg:grid-cols-2">
        <div>
          <Reveal>
            <SectionEyebrow tone="ink">O problema</SectionEyebrow>
          </Reveal>
          <Reveal delay={80} as="h2" className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight text-ink900 sm:text-4xl">
            Dados fragmentados.
            <br />
            <span className="text-ink-400">Evolução invisível.</span>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 text-base text-ink-500">
              Planilhas, cadernos, diários dispersos. Notas em um sistema, frequência em outro, avaliações
              perdidas. A trajetória do aluno existe — mas ninguém consegue enxergá-la com clareza.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <ul className="mt-6 space-y-3">
              {BULLETS.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 text-sm text-ink-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" aria-hidden="true" />
                  {bullet}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={200} className="relative h-[360px] sm:h-[420px]">
          <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
            {LINKS.map(([a, b], i) => {
              const from = FRAGMENTS[a];
              const to = FRAGMENTS[b];
              return (
                <line
                  key={i}
                  x1={`${parseFloat(from.left) + 10}%`}
                  y1={`${parseFloat(from.top) + 10}%`}
                  x2={`${parseFloat(to.left) + 10}%`}
                  y2={`${parseFloat(to.top) + 10}%`}
                  stroke="rgb(var(--tk-line))"
                  strokeWidth="1"
                  strokeDasharray="3 6"
                />
              );
            })}
          </svg>

          {FRAGMENTS.map((f) => (
            <div
              key={f.label}
              className="absolute w-32 rounded-xl border border-line bg-surface/70 p-3 text-left opacity-80 shadow-sm backdrop-blur-sm sm:w-36"
              style={{ top: f.top, left: f.left }}
            >
              <p className="text-[9px] font-semibold uppercase tracking-widest text-ink-400">{f.label}</p>
              <p className="mt-1 font-mono text-lg font-semibold tabular text-ink-500">{f.value}</p>
              <p className="text-[10px] text-ink-400">{f.hint}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
