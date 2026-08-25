import { Link } from "react-router-dom";
import { TrajectoryMark } from "./LandingPrimitives";

const PLATAFORMA_LINKS = [
  { label: "Recursos", href: "#plataforma" },
  { label: "Evolução", href: "#evolucao" },
  { label: "Perfis", href: "#perfis" },
  { label: "Segurança", href: "#seguranca" },
];

const ACESSO_LINKS = [
  { label: "Entrar", href: "/login" },
  { label: "Primeiro acesso", href: "/primeiro-acesso" },
  { label: "Recuperar senha", href: "/esqueci-a-senha" },
];

export function LandingFooter() {
  return (
    <footer className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <div className="flex flex-col gap-12 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <TrajectoryMark className="h-5 w-5 text-success" />
            <span className="font-heading text-lg font-bold tracking-wide text-ink900">Tekidu</span>
          </div>
          <p className="mt-3 text-sm text-ink-500">
            Plataforma de gestão escolar e acompanhamento do desenvolvimento acadêmico.
          </p>
        </div>

        <div className="flex gap-16">
          <FooterColumn title="Plataforma" links={PLATAFORMA_LINKS} />
          <FooterColumn title="Acesso" links={ACESSO_LINKS} />
        </div>

        <div className="text-sm text-ink-400 sm:text-right">
          <p>© 2026 Tekidu</p>
          <p>Gestão Escolar</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">{title}</p>
      <ul className="mt-3 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            {link.href.startsWith("#") ? (
              <a href={link.href} className="text-sm text-ink-500 transition-colors hover:text-ink900">
                {link.label}
              </a>
            ) : (
              <Link to={link.href} className="text-sm text-ink-500 transition-colors hover:text-ink900">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
