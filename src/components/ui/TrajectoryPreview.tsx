/**
 * Preview estático da "linha de evolução" (mesmo motivo gráfico da
 * Landing Page), usado no painel de marca do Login. Sem
 * framer-motion — CSS puro (stroke-dashoffset com transição no
 * mount) para não puxar a dependência da landing para o bundle
 * principal do app.
 */
export function TrajectoryPreview({ className = "" }: { className?: string }) {
  const points = [
    { x: 12, y: 92, label: null },
    { x: 96, y: 64, label: "7,8" },
    { x: 180, y: 34, label: "94%" },
    { x: 264, y: 10, label: "+23%" },
  ];
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg viewBox="0 0 280 112" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-success [stroke-dasharray:420] [stroke-dashoffset:420] animate-[tk-draw_1.3s_0.2s_ease-out_forwards]"
      />
      {points.map((p, i) => (
        <g key={i} style={{ animation: `tk-pop 0.4s ${0.4 + i * 0.25}s ease-out backwards` }}>
          <circle cx={p.x} cy={p.y} r="4" className="fill-success" />
          {p.label && (
            <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="11" fontWeight="600" className="fill-current opacity-90">
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
