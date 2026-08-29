import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  LayoutDashboard,
  Users,
  School,
  BookOpen,
  GraduationCap,
  ClipboardList,
  CalendarCheck,
  FileText,
  BarChart3,
  Settings,
  CalendarDays,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCommandPaletteData } from "@/components/command-palette/useCommandPaletteData";
import type { UserRole } from "@/types/user";

interface NavAction {
  id: string;
  label: string;
  hint?: string;
  icon: typeof LayoutDashboard;
  to: string;
  roles?: UserRole[];
}

// Mesmas rotas/rótulos/permissões da Sidebar (ver
// components/layout/Sidebar.tsx) — a Command Palette é uma segunda
// forma de chegar ao mesmo lugar, então não pode oferecer nada que a
// navegação principal já não permitiria para aquele perfil.
const NAV_ACTIONS: NavAction[] = [
  { id: "nav-dashboard", label: "Ir para Dashboard", icon: LayoutDashboard, to: "/" },
  { id: "nav-alunos", label: "Ir para Alunos", icon: Users, to: "/alunos", roles: ["admin", "teacher"] },
  { id: "nav-turmas", label: "Ir para Turmas", icon: School, to: "/turmas", roles: ["admin", "teacher"] },
  { id: "nav-disciplinas", label: "Ir para Disciplinas", icon: BookOpen, to: "/disciplinas", roles: ["admin", "teacher"] },
  { id: "nav-professores", label: "Ir para Professores", icon: GraduationCap, to: "/professores", roles: ["admin"] },
  { id: "nav-notas", label: "Ir para Notas", icon: ClipboardList, to: "/notas", roles: ["admin", "teacher"] },
  { id: "nav-frequencia", label: "Ir para Frequência", icon: CalendarCheck, to: "/frequencia", roles: ["admin", "teacher"] },
  { id: "nav-boletim", label: "Ir para Boletim", icon: FileText, to: "/boletim", roles: ["admin", "teacher"] },
  { id: "nav-meu-boletim", label: "Ir para Meu Boletim", icon: FileText, to: "/meu-boletim", roles: ["student"] },
  { id: "nav-relatorios", label: "Ir para Relatórios", icon: BarChart3, to: "/relatorios", roles: ["admin", "teacher"] },
  // Sem `roles`: agenda pessoal, acessível a qualquer perfil (mesmo
  // critério de "Configurações" logo abaixo — ver Sidebar.tsx/AppRoutes.tsx).
  { id: "nav-calendario", label: "Ir para Calendário", icon: CalendarDays, to: "/calendario" },
  { id: "nav-configuracoes", label: "Abrir Configurações", icon: Settings, to: "/configuracoes" },
];

interface ResultItem {
  id: string;
  category: string;
  icon: typeof LayoutDashboard;
  label: string;
  sublabel?: string;
  onSelect: () => void;
}

const MAX_PER_CATEGORY = 5;

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data, status, ensureLoaded } = useCommandPaletteData(profile?.role);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      ensureLoaded();
      setQuery("");
      setActiveIndex(0);
      // Foco automático (Fase 2 — "foco automático"). O timeout garante
      // que o input já esteja montado/visível quando o foco é aplicado.
      const timer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [open, ensureLoaded]);

  const term = query.trim().toLowerCase();

  const navItems: ResultItem[] = useMemo(() => {
    const visible = NAV_ACTIONS.filter(
      (item) => !item.roles || (profile?.role && item.roles.includes(profile.role))
    );
    const filtered = term
      ? visible.filter((item) => item.label.toLowerCase().includes(term))
      : visible;
    return filtered.map((item) => ({
      id: item.id,
      category: "Navegação",
      icon: item.icon,
      label: item.label,
      onSelect: () => {
        navigate(item.to);
        onClose();
      },
    }));
  }, [term, profile?.role, navigate, onClose]);

  const entityGroups: ResultItem[] = useMemo(() => {
    if (!term) return [];
    const results: ResultItem[] = [];

    const studentMatches = data.students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.email.toLowerCase().includes(term) ||
          s.registrationNumber.toLowerCase().includes(term)
      )
      .slice(0, MAX_PER_CATEGORY);
    for (const s of studentMatches) {
      results.push({
        id: `student-${s.id}`,
        category: "Alunos",
        icon: Users,
        label: s.name,
        sublabel: s.registrationNumber ? `Matrícula ${s.registrationNumber}` : s.email,
        onSelect: () => {
          navigate(`/alunos`);
          onClose();
        },
      });
    }

    const teacherMatches = data.teachers
      .filter((t) => t.name.toLowerCase().includes(term) || t.email.toLowerCase().includes(term))
      .slice(0, MAX_PER_CATEGORY);
    for (const t of teacherMatches) {
      results.push({
        id: `teacher-${t.uid}`,
        category: "Professores",
        icon: GraduationCap,
        label: t.name,
        sublabel: t.email,
        onSelect: () => {
          navigate(`/professores`);
          onClose();
        },
      });
    }

    const classMatches = data.classes
      .filter((c) => c.name.toLowerCase().includes(term) || c.grade.toLowerCase().includes(term))
      .slice(0, MAX_PER_CATEGORY);
    for (const c of classMatches) {
      results.push({
        id: `class-${c.id}`,
        category: "Turmas",
        icon: School,
        label: c.name,
        sublabel: c.grade,
        onSelect: () => {
          navigate(`/turmas`);
          onClose();
        },
      });
    }

    const disciplineMatches = data.disciplines
      .filter((d) => d.name.toLowerCase().includes(term) || d.code.toLowerCase().includes(term))
      .slice(0, MAX_PER_CATEGORY);
    for (const d of disciplineMatches) {
      results.push({
        id: `discipline-${d.id}`,
        category: "Disciplinas",
        icon: BookOpen,
        label: d.name,
        sublabel: d.code,
        onSelect: () => {
          navigate(`/disciplinas`);
          onClose();
        },
      });
    }

    return results;
  }, [term, data, navigate, onClose]);

  const allResults = useMemo(() => [...navItems, ...entityGroups], [navItems, entityGroups]);

  // Agrupamento por categoria preservando a ordem de `allResults`
  // (Fase 2 — "agrupamento por categoria").
  const grouped = useMemo(() => {
    const map = new Map<string, ResultItem[]>();
    for (const item of allResults) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return Array.from(map.entries());
  }, [allResults]);

  useEffect(() => {
    setActiveIndex(0);
  }, [term]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(allResults.length - 1, 0)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = allResults[activeIndex];
        if (item) item.onSelect();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, allResults, activeIndex, onClose]);

  if (!open) return null;

  const isLoadingEntities = term.length > 0 && status === "loading";
  const hasResults = allResults.length > 0;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[10vh]">
      <button
        aria-label="Fechar busca"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-card border border-line bg-surface shadow-card"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <Search className="h-4.5 w-4.5 shrink-0 text-ink-400" aria-hidden="true" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={hasResults}
            aria-controls="command-palette-results"
            aria-autocomplete="list"
            className="w-full bg-transparent text-sm text-ink900 outline-none placeholder:text-ink-300"
            placeholder="Buscar alunos, turmas, disciplinas, páginas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isLoadingEntities && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-300" aria-hidden="true" />
          )}
          <kbd className="hidden shrink-0 rounded border border-line bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-400 sm:block">
            Esc
          </kbd>
        </div>

        <div id="command-palette-results" className="max-h-[60vh] overflow-y-auto p-2">
          {!hasResults && term && (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Search className="h-5 w-5 text-ink-300" aria-hidden="true" />
              <p className="text-sm font-medium text-ink900">
                Nenhum resultado para "{query}"
              </p>
              <p className="text-xs text-ink-500">Tente buscar por outro nome, matrícula ou página.</p>
            </div>
          )}

          {!hasResults && !term && status === "loading" && (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-ink-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Carregando busca...
            </div>
          )}

          {grouped.map(([category, items]) => (
            <div key={category} className="mb-1 last:mb-0">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                {category}
              </p>
              {items.map((item) => {
                const globalIndex = allResults.findIndex((r) => r.id === item.id);
                const isActive = globalIndex === activeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIndex(globalIndex)}
                    onClick={item.onSelect}
                    className={`flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-left text-sm transition-colors ${
                      isActive ? "bg-ink-100 text-ink-900" : "text-ink-600 hover:bg-ink-50"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-ink900">{item.label}</span>
                      {item.sublabel && (
                        <span className="ml-2 text-xs text-ink-400">{item.sublabel}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="hidden items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-ink-400 sm:flex">
          <span className="flex items-center gap-1">
            <ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> navegar
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="h-3 w-3" /> selecionar
          </span>
          <span className="ml-auto">Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}
