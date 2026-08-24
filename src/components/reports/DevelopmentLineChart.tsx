interface LineChartPoint {
  label: string;
  value: number | null;
}

interface DevelopmentLineChartProps {
  points: LineChartPoint[];
  min?: number;
  max?: number;
  height?: number;
  emptyMessage?: string;
}

/**
 * Gráfico de linhas em SVG puro, sem biblioteca externa (o projeto não
 * tinha nenhuma lib de gráficos instalada — ver item 9 do briefing:
 * "NÃO adicione uma biblioteca nova se não for necessário"). Usado
 * tanto pelo gráfico geral de Relatórios quanto pelo gráfico
 * individual do aluno (item 19: "criar um componente reutilizável"),
 * evitando duplicar a mesma lógica de desenho em dois lugares.
 */
export function DevelopmentLineChart({
  points,
  min = 0,
  max = 10,
  height = 260,
  emptyMessage = "Nenhum dado de desenvolvimento disponível.",
}: DevelopmentLineChartProps) {
  const width = 700;
  const paddingLeft = 34;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 26;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  function yFor(value: number) {
    const clamped = Math.max(min, Math.min(max, value));
    return paddingTop + plotHeight - ((clamped - min) / (max - min)) * plotHeight;
  }
  function xFor(index: number) {
    if (points.length <= 1) return paddingLeft + plotWidth / 2;
    return paddingLeft + (index / (points.length - 1)) * plotWidth;
  }

  const validPoints = points
    .map((p, index) => ({ ...p, index }))
    .filter((p): p is { label: string; value: number; index: number } => p.value !== null);

  if (validPoints.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex w-full items-center justify-center text-sm text-ink-400"
      >
        {emptyMessage}
      </div>
    );
  }

  const pathD = validPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.index).toFixed(1)} ${yFor(p.value).toFixed(1)}`)
    .join(" ");

  const tickCount = 4;
  const tickValues = Array.from({ length: tickCount + 1 }, (_, i) => min + ((max - min) / tickCount) * i);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Gráfico de evolução do desenvolvimento acadêmico"
    >
      {tickValues.map((tick) => (
        <g key={tick}>
          <line
            x1={paddingLeft}
            x2={width - paddingRight}
            y1={yFor(tick)}
            y2={yFor(tick)}
            style={{ stroke: "rgb(var(--tk-line))" }}
            strokeDasharray="4 4"
          />
          <text
            x={paddingLeft - 8}
            y={yFor(tick) + 4}
            textAnchor="end"
            fontSize="11"
            style={{ fill: "rgb(var(--tk-ink-400))" }}
          >
            {tick.toFixed(0)}
          </text>
        </g>
      ))}

      {/* Linha de evolução em VERDE — este gráfico representa o
          desenvolvimento/progresso do aluno, o conceito central que o
          verde da identidade do Tekidu deve reforçar (grid/eixos
          permanecem neutros). */}
      <path
        d={pathD}
        fill="none"
        style={{ stroke: "rgb(var(--tk-success-500))" }}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {validPoints.map((p) => (
        <circle
          key={p.index}
          cx={xFor(p.index)}
          cy={yFor(p.value)}
          r="4"
          style={{ fill: "rgb(var(--tk-success-500))" }}
        />
      ))}

      {points.map((p, i) => (
        <text
          key={p.label}
          x={xFor(i)}
          y={height - 6}
          textAnchor="middle"
          fontSize="11"
          style={{ fill: "rgb(var(--tk-ink-400))" }}
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}
