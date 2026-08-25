import { Reveal, SectionEyebrow } from "./LandingPrimitives";

const BIMESTERS = [
  { label: "1º Bimestre", status: "Atenção necessária", tone: "warning", value: "6,2", freq: "87% frequência" },
  { label: "2º Bimestre", status: "Melhora consistente", tone: "neutral", value: "7,1", freq: "90% frequência" },
  { label: "3º Bimestre", status: "Em progressão", tone: "neutral", value: "7,8", freq: "94% frequência" },
  { label: "4º Bimestre", status: "Destaque da turma", tone: "success", value: "8,4", freq: "97% frequência" },
] as const;

const BARS = [
  { label: "1º Bim", value: 6.2 },
  { label: "2º Bim", value: 7.1 },
  { label: "3º Bim", value: 7.8 },
  { label: "4º Bim", value: 8.4 },
];

const CHART_H = 200;
const CHART_TOP = 20;
const barX = (i: number) => 30 + i * 130;
const barY = (v: number) => CHART_TOP + CHART_H * (1 - v / 10);

const toneDot: Record<string, string> = {
  warning: "bg-honors-400",
  neutral: "bg-ink-300",
  success: "bg-success",
};

/**
 * "Evolução do aluno": timeline por bimestre (esquerda) + card com
 * gráfico de barras e linha de tendência (direita), reproduzindo a
 * dupla leitura de dados do Figma — narrativa em texto e em gráfico.
 */
export function EvolutionSection() {
  return (
    <section id="evolucao" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div className="grid gap-16 lg:grid-cols-2 lg:items-start">
        <div>
          <Reveal>
            <SectionEyebrow>Evolução do aluno</SectionEyebrow>
          </Reveal>
          <Reveal delay={80} as="h2" className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight text-ink900 sm:text-4xl">
            Notas são dados.
            <br />
            <span className="text-success">Evolução é contexto.</span>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-md text-base text-ink-500">
              O Tekidu cruza frequência, notas, avaliações e histórico para revelar a trajetória real do
              estudante — não apenas um número no boletim.
            </p>
          </Reveal>

          <ol className="mt-10 space-y-6 border-l border-line pl-6">
            {BIMESTERS.map((b, i) => (
              <Reveal key={b.label} delay={220 + i * 80} as="li" className="relative">
                <span
                  className={`absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-paper ${toneDot[b.tone]}`}
                  aria-hidden="true"
                />
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">
                  {b.label} <span className="text-ink-500 normal-case tracking-normal">— {b.status}</span>
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular text-ink900">
                  {b.value} <span className="text-sm font-sans font-normal text-ink-400">{b.freq}</span>
                </p>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal delay={200} className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">Evolução do estudante</p>
              <p className="mt-1 text-sm font-semibold text-ink900">João Silva · 3º Ano A</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              +35% no ano
            </span>
          </div>

          <div className="mt-3 flex items-center gap-4 text-xs text-ink-500">
            <Legend swatch="bg-ink-700" label="Nota média" />
            <Legend swatch="border-t border-dashed border-ink-300" label="Frequência" dash />
            <Legend swatch="border-t border-honors-400" label="Tendência" dash />
          </div>

          <svg viewBox={`0 0 560 ${CHART_TOP + CHART_H + 40}`} className="mt-6 h-56 w-full sm:h-64" aria-hidden="true">
            {[0, 25, 50, 75, 100].map((v) => (
              <line
                key={v}
                x1="0"
                x2="560"
                y1={barY(v / 10)}
                y2={barY(v / 10)}
                stroke="rgb(var(--tk-line))"
                strokeDasharray="3 5"
              />
            ))}

            {/* linha de frequência (tracejada) */}
            <polyline
              points={BARS.map((_, i) => `${barX(i) + 40},${CHART_TOP + 8}`).join(" ")}
              fill="none"
              stroke="rgb(var(--tk-ink-300))"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />

            {/* linha de tendência */}
            <polyline
              points={BARS.map((b, i) => `${barX(i) + 40},${barY(b.value) - 14}`).join(" ")}
              fill="none"
              stroke="rgb(var(--tk-honors-400))"
              strokeWidth="1.5"
              strokeDasharray="2 5"
            />

            {BARS.map((b, i) => {
              const isLast = i === BARS.length - 1;
              const y = barY(b.value);
              return (
                <g key={b.label}>
                  <rect
                    x={barX(i)}
                    y={y}
                    width="80"
                    height={CHART_TOP + CHART_H - y}
                    rx="6"
                    fill={isLast ? "rgb(var(--tk-success-500))" : "rgb(var(--tk-ink-700))"}
                  />
                  <text x={barX(i) + 40} y={y - 10} textAnchor="middle" fontSize="15" fill="rgb(var(--tk-ink900))">
                    {b.value.toFixed(1)}
                  </text>
                  <text
                    x={barX(i) + 40}
                    y={CHART_TOP + CHART_H + 22}
                    textAnchor="middle"
                    fontSize="11"
                    fill="rgb(var(--tk-ink-400))"
                  >
                    {b.label}
                  </text>
                </g>
              );
            })}
          </svg>

          <p className="mt-4 rounded-xl bg-ink-50 p-4 text-xs leading-relaxed text-ink-600">
            <span className="font-semibold text-ink900">Análise de desempenho contínuo: </span>
            crescimento de 2,2 pontos ao longo do ano, com frequência em ascensão. Aluno destacado para
            acompanhamento especial.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Legend({ swatch, label, dash }: { swatch: string; label: string; dash?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {dash ? <span className={`inline-block w-3 ${swatch}`} aria-hidden="true" /> : <span className={`h-2 w-2 rounded-sm ${swatch}`} aria-hidden="true" />}
      {label}
    </span>
  );
}
