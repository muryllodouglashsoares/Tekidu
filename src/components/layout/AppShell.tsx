import { Suspense, lazy, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Search, Moon, Sun } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";

// lazy(): MobileMoreSheet usa MobileSheet (Framer Motion) — carregado
// só quando o item "Mais" realmente abre em mobile, para não incluir
// o Framer Motion no bundle principal (baixado por 100% das visitas,
// incluindo desktop). Mesma estratégia de code-splitting já usada
// pelas rotas em AppRoutes.tsx.
const MobileMoreSheet = lazy(() =>
  import("@/components/mobile/MobileMoreSheet").then((m) => ({ default: m.MobileMoreSheet }))
);

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
  "/calendario": "Calendário",
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
  const { theme, toggleTheme } = useTheme();
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Fase 2 — Command Palette: Ctrl+K (Windows/Linux) e Cmd+K (Mac)
  // abrem a busca global de qualquer lugar dentro das rotas protegidas.
  // Em mobile o atalho de teclado não existe (ver "COMMAND PALETTE" no
  // briefing) — a mesma busca é alcançada pelo botão de lupa do
  // MobileHeader, que chama `setPaletteOpen(true)` diretamente.
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

  // Fecha o sheet "Mais" automaticamente ao navegar (ex.: usuário toca
  // em voltar do navegador) — evita um sheet "fantasma" reaberto numa
  // rota diferente da que o abriu.
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Sidebar — navegação principal em desktop/tablet. Em mobile a
          navegação estrutural passa a ser a Bottom Navigation (ver
          MobileBottomNav abaixo) — não existe mais drawer duplicando a
          mesma navegação em duas formas (Opção B do briefing). */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {isMobile ? (
          <MobileHeader onOpenSearch={() => setPaletteOpen(true)} />
        ) : (
          <header className="flex items-center justify-between px-8 pb-2 pt-6">
            <h1 className="font-display text-xl font-bold text-ink900">
              {pageTitle(location.pathname)}
            </h1>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="flex w-64 items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink-400 shadow-sm transition-colors hover:text-ink-600"
                aria-label="Buscar (Ctrl+K)"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="truncate">Buscar...</span>
                <kbd className="ml-auto shrink-0 rounded border border-line bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-400">
                  Ctrl+K
                </kbd>
              </button>
              <div className="hidden text-sm font-medium text-ink-500 lg:block">
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
                title={theme === "dark" ? "Modo claro" : "Modo escuro"}
                className="rounded-full border border-line bg-surface p-2.5 text-ink-500 shadow-sm transition-colors hover:bg-ink-100 hover:text-ink-700"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <NotificationCenter />
            </div>
          </header>
        )}

        <main className={`flex-1 px-4 py-4 md:px-8 md:py-6 ${isMobile ? "pb-bottom-nav" : ""}`}>
          <Outlet />
        </main>
      </div>

      {isMobile && profile && (
        <>
          <MobileBottomNav role={profile.role} onOpenMore={() => setMoreOpen(true)} moreActive={moreOpen} />
          <Suspense fallback={null}>
            <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} role={profile.role} />
          </Suspense>
        </>
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
