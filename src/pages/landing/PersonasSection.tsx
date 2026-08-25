import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal, SectionEyebrow } from "./LandingPrimitives";

type PersonaKey = "administrador" | "professor" | "aluno";

const TABS: { key: PersonaKey; label: string }[] = [
  { key: "administrador", label: "Administrador" },
  { key: "professor", label: "Professor" },
  { key: "aluno", label: "Aluno" },
];

const ACCENT: Record<PersonaKey, { text: string; bg: string; ring: string; tab: string }> = {
  administrador: { text: "text-ink-700", bg: "bg-ink-700", ring: "ring-ink-700/30", tab: "bg-ink-700 text-white" },
  professor: { text: "text-violet", bg: "bg-violet", ring: "ring-violet/30", tab: "bg-violet text-white" },
  aluno: { text: "text-success", bg: "bg-success", ring: "ring-success/30", tab: "bg-success text-white" },
};

const CONTENT: Record<
  PersonaKey,
  { title: string; tagline: string; description: string }
> = {
  administrador: {
    title: "Administrador",
    tagline: "Visão completa da instituição.",
    description:
      "Gerencie usuários, turmas, disciplinas e acompanhe o desempenho institucional com dashboards centralizados e relatórios consolidados.",
  },
  professor: {
    title: "Professor",
    tagline: "Contexto real de cada turma.",
    description:
      "Registre avaliações, acompanhe presença e veja o desempenho individual e coletivo dos seus alunos com clareza e agilidade.",
  },
  aluno: {
    title: "Aluno",
    tagline: "Sua própria trajetória, visível.",
    description:
      "Acompanhe notas, frequência e progresso em cada disciplina. Entenda onde está e visualize para onde está caminhando.",
  },
};

export function PersonasSection() {
  const [active, setActive] = useState<PersonaKey>("administrador");
  const accent = ACCENT[active];
  const content = CONTENT[active];

  return (
    <section id="perfis" className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
      <Reveal>
        <SectionEyebrow tone="ink">Para quem é o Tekidu</SectionEyebrow>
      </Reveal>
      <Reveal delay={80} as="h2" className="mx-auto mt-4 max-w-2xl font-heading text-3xl font-bold leading-tight tracking-tight text-ink900 sm:text-4xl">
        Uma experiência
        <br />
        <span className={`transition-colors duration-300 ${accent.text}`}>para cada perfil.</span>
      </Reveal>

      <Reveal delay={160} className="mt-10 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
              active === tab.key ? ACCENT[tab.key].tab : "text-ink-500 hover:text-ink900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </Reveal>

      <div className="mt-14 grid gap-10 text-left lg:grid-cols-2 lg:items-center">
        <div>
          <h3 className={`font-heading text-4xl font-bold transition-colors duration-300 ${accent.text}`}>{content.title}</h3>
          <p className="mt-2 text-lg font-medium text-ink-500">{content.tagline}</p>
          <p className="mt-6 max-w-md text-base text-ink-500">{content.description}</p>
          <a
            href="#seguranca"
            className={`mt-8 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest transition-colors ${accent.text}`}
          >
            Conhecer experiência
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className={`rounded-2xl border border-line bg-surface p-6 shadow-sm ring-1 ${accent.ring} sm:p-8`}>
          {active === "administrador" && <AdministradorCard />}
          {active === "professor" && <ProfessorCard />}
          {active === "aluno" && <AlunoCard />}
        </div>
      </div>
    </section>
  );
}

function AdministradorCard() {
  const rows = [
    { label: "Alunos matriculados", value: "248", delta: "+12" },
    { label: "Média institucional", value: "7,9", delta: "+0.3" },
    { label: "Frequência média", value: "91%", delta: "+2%" },
    { label: "Turmas ativas", value: "14", delta: null },
  ];
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">Visão institucional</p>
      <ul className="mt-4 divide-y divide-line">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between py-3">
            <span className="text-sm text-ink-600">{row.label}</span>
            <span className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-semibold tabular text-ink900">{row.value}</span>
              {row.delta && <span className="text-xs font-medium text-success">{row.delta}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfessorCard() {
  const students = [
    { initials: "JS", name: "João Silva", value: "8,4", freq: "97%", status: "Destaque" },
    { initials: "MC", name: "Maria Costa", value: "7,1", freq: "88%", status: "Atenção" },
    { initials: "PA", name: "Pedro Alves", value: "9,0", freq: "99%", status: "Excelente" },
    { initials: "AF", name: "Ana Ferreira", value: "6,5", freq: "80%", status: "Atenção" },
  ];
  const statusTone: Record<string, string> = {
    Destaque: "text-success",
    Excelente: "text-success",
    Atenção: "text-honors-500",
  };
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">Dashboard da turma — 3º Ano A</p>
      <ul className="mt-4 divide-y divide-line">
        {students.map((s) => (
          <li key={s.name} className="flex items-center justify-between py-3">
            <span className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet/10 text-xs font-semibold text-violet">
                {s.initials}
              </span>
              <span className="text-sm text-ink-600">{s.name}</span>
            </span>
            <span className="flex items-baseline gap-2 text-right">
              <span className="font-mono text-sm font-semibold tabular text-ink900">{s.value}</span>
              <span className={`text-xs font-medium ${statusTone[s.status]}`}>
                {s.freq} · {s.status}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlunoCard() {
  const subjects = [
    { label: "Matemática", value: 8.4 },
    { label: "Português", value: 7.2 },
    { label: "Física", value: 9.1 },
    { label: "História", value: 7.8 },
  ];
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">Meu desempenho — João Silva</p>
      <ul className="mt-5 space-y-4">
        {subjects.map((s) => (
          <li key={s.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-600">{s.label}</span>
              <span className="font-mono font-semibold tabular text-ink900">{s.value.toFixed(1)}</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-success" style={{ width: `${(s.value / 10) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
