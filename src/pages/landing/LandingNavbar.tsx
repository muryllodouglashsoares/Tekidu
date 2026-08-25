import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { TrajectoryMark } from "./LandingPrimitives";

const NAV_LINKS = [
  { href: "#plataforma", label: "Plataforma" },
  { href: "#evolucao", label: "Evolução" },
  { href: "#perfis", label: "Perfis" },
  { href: "#seguranca", label: "Segurança" },
];

/**
 * Navbar flutuante em formato de pílula, replicando a composição do
 * Figma: logo + links centrais + CTA "Entrar", tudo dentro de uma
 * cápsula com fundo translúcido e blur, fixa no topo.
 */
export function LandingNavbar() {
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-4 z-50 px-4 sm:px-6">
      <div
        className={`mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-full border border-line/70 bg-surface/80 px-5 py-3 backdrop-blur-md transition-shadow duration-300 ${
          scrolled ? "shadow-card" : ""
        }`}
      >
        <a href="#topo" className="flex items-center gap-2.5 shrink-0">
          <TrajectoryMark className="h-5 w-5 text-success" />
          <span className="font-heading text-lg font-bold tracking-wide text-ink900">Tekidu</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-semibold uppercase tracking-widest text-ink-500 transition-colors hover:text-ink900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            className="hidden rounded-full p-2 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink900 sm:inline-flex"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            to="/login"
            className="hidden items-center gap-1.5 rounded-full bg-success px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-transform hover:scale-[1.03] sm:inline-flex"
          >
            Entrar
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            className="rounded-full p-2 text-ink-500 hover:bg-ink-100 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mx-auto mt-2 flex max-w-5xl flex-col gap-1 rounded-3xl border border-line/70 bg-surface/95 p-4 backdrop-blur-md md:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50"
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/login"
            className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-success px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white"
          >
            Entrar
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </header>
  );
}
