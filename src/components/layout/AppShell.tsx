import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, X, Search } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/alunos": "Alunos",
  "/turmas": "Turmas",
  "/disciplinas": "Disciplinas",
  "/minhas-turmas": "Minhas Turmas",
  "/meus-alunos": "Meus Alunos",
  "/notas": "Notas",
  "/frequencia": "Frequência",
  "/boletim": "Boletim",
  "/relatorios": "Relatórios",
  "/meu-boletim": "Meu Boletim",
  "/minhas-disciplinas": "Minhas Disciplinas",
  "/minha-frequencia": "Minha Frequência",
  "/meu-desempenho": "Meu Desempenho",
  "/configuracoes": "Configurações",
};

function pageTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  // Rotas com parâmetro (ex.: /alunos/:id) caem no prefixo mais próximo.
  const match = Object.keys(TITLES).find(
    (key) => key !== "/" && pathname.startsWith(key)
  );
  return match ? TITLES[match] : "Tekidu";
}

/**
 * Layout compartilhado por todas as rotas protegidas: sidebar fixa em
 * telas médias/grandes (preserva a navegação do protótipo do Figma) e
 * menu retrátil em telas pequenas.
 */
export function AppShell() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Fase 2 — Command Palette: Ctrl+K (Windows/Linux) e Cmd+K (Mac)
  // abrem a busca global de qualquer lugar dentro das rotas protegidas.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Sidebar — fixa em desktop */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Sidebar — drawer em mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <Sidebar />
          <button
            aria-label="Fechar menu"
            className="flex-1 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between px-4 py-4 md:px-8 md:pt-6 md:pb-2">
          <div className="flex items-center gap-4">
            <button
              className="rounded-full p-2 text-ink-600 hover:bg-ink-100 md:hidden bg-surface shadow-sm"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Abrir menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <h1 className="hidden md:block font-display text-xl font-bold text-ink900">
              {pageTitle(location.pathname)}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink-400 shadow-sm transition-colors hover:text-ink-600 md:w-64"
              aria-label="Buscar (Ctrl+K)"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="hidden truncate md:inline">Buscar...</span>
              <kbd className="ml-auto hidden shrink-0 rounded border border-line bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-400 md:inline">
                Ctrl+K
              </kbd>
            </button>
            <div className="text-sm font-medium text-ink-500 hidden lg:block">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
            <NotificationCenter />
          </div>
        </header>

        <main className="flex-1 px-4 py-4 md:px-8 md:py-6">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
