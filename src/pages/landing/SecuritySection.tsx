import { Fingerprint, KeyRound, ShieldCheck, Database } from "lucide-react";
import { Reveal, SectionEyebrow } from "./LandingPrimitives";

const BULLETS = ["Autenticação por perfil", "Auditoria de acessos", "Dados isolados por instituição", "Permissões granulares"];

const LAYERS = [
  { icon: Fingerprint, title: "Identidade", detail: "Autenticação segura por perfil", layer: "Camada 1" },
  { icon: KeyRound, title: "Acesso", detail: "Login com credenciais verificadas", layer: "Camada 2" },
  { icon: ShieldCheck, title: "Permissões", detail: "Cada perfil vê apenas o que precisa", layer: "Camada 3" },
  { icon: Database, title: "Dados", detail: "Informação protegida e auditada", layer: "Camada 4" },
];

export function SecuritySection() {
  return (
    <section id="seguranca" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
        <div>
          <Reveal>
            <SectionEyebrow tone="ink">Segurança</SectionEyebrow>
          </Reveal>
          <Reveal delay={80} as="h2" className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight text-ink900 sm:text-4xl">
            Cada informação
            <br />
            <span className="text-success">no lugar certo.</span>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-md text-base text-ink-500">
              O sistema conta com controle de acesso rigoroso baseado em papéis. Diferentes perfis possuem
              permissões específicas, garantindo que os dados da instituição sejam gerenciados com segurança.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <ul className="mt-6 space-y-3">
              {BULLETS.map((bullet) => (
                <li key={bullet} className="flex items-center gap-3 text-sm text-ink-600">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
                  {bullet}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="space-y-3">
          {LAYERS.map((layer, i) => (
            <Reveal key={layer.title} delay={i * 90}>
              <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                  <layer.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink900">{layer.title}</p>
                  <p className="text-sm text-ink-500">{layer.detail}</p>
                </div>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-ink-400">
                  {layer.layer}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
