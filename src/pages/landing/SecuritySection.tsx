import { Fingerprint, KeyRound, ShieldCheck, Database } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal, SectionEyebrow } from "./LandingPrimitives";
import { EASE_OUT, VIEWPORT_ONCE } from "./motion";

const BULLETS = ["Autenticação por perfil", "Auditoria de acessos", "Dados isolados por instituição", "Permissões granulares"];

const LAYERS = [
  { icon: Fingerprint, title: "Identidade", detail: "Autenticação segura por perfil", layer: "Camada 1" },
  { icon: KeyRound, title: "Acesso", detail: "Login com credenciais verificadas", layer: "Camada 2" },
  { icon: ShieldCheck, title: "Permissões", detail: "Cada perfil vê apenas o que precisa", layer: "Camada 3" },
  { icon: Database, title: "Dados", detail: "Informação protegida e auditada", layer: "Camada 4" },
];

/**
 * Camadas de segurança em pilha, com um trilho vertical que se
 * desenha atrás dos cartões (mesmo motivo de "trajetória/progresso"
 * do resto da página, aplicado à ideia de "camadas empilhadas") e um
 * leve levantar no hover de cada cartão.
 */
export function SecuritySection() {
  const reducedMotion = useReducedMotion();

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

        <div className="relative space-y-3 pl-5">
          <motion.span
            aria-hidden="true"
            className="absolute left-0 top-2 h-[calc(100%-16px)] w-px bg-line"
            initial={reducedMotion ? undefined : { scaleY: 0 }}
            whileInView={reducedMotion ? undefined : { scaleY: 1 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: 1, ease: EASE_OUT, delay: 0.1 }}
            style={{ transformOrigin: "top" }}
          />
          {LAYERS.map((layer, i) => (
            <motion.div
              key={layer.title}
              initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              whileHover={reducedMotion ? undefined : { y: -3 }}
              transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.15 + i * 0.1 }}
              className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm"
            >
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
