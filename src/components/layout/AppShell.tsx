import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/alunos": "Alunos",
  "/turmas": "Turmas",
  "/disciplinas": "Disciplinas",
  "/notas": "Notas",
  "/frequencia": "Frequência",
  "/boletim": "Boletim",
  "/relatorios": "Relatórios",
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
          <div className="text-sm font-medium text-ink-500 hidden md:block">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
          <div className="w-9 md:hidden" aria-hidden="true" />
        </header>

        <main className="flex-1 px-4 py-4 md:px-8 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
