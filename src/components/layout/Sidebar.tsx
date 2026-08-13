import { NavLink } from "react-router-dom";
import {
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RoleBadge } from "@/components/ui/RoleBadge";
import type { UserRole } from "@/types/user";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  soon?: boolean;
  /** Se informado, o item só aparece para as roles listadas. */
  roles?: UserRole[];
}

// Mesma organização e rótulos do protótipo do Figma (grupos "Principal"
// e "Acadêmico"). Itens marcados com `soon` levam a uma tela de
// "em desenvolvimento" em vez de 404 — ver PlaceholderPage.
const principalNav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/alunos", label: "Alunos", icon: Users },
  { to: "/turmas", label: "Turmas", icon: School },
  { to: "/disciplinas", label: "Disciplinas", icon: BookOpen },
  // Restrita a admin: mesma role autorizada pela rota (ver AppRoutes) e
  // pelas Firestore Security Rules para criar/editar contas em "users".
  { to: "/professores", label: "Professores", icon: GraduationCap, roles: ["admin"] },
];

const academicoNav: NavItem[] = [
  // Notas: sem "soon" (implementada) e restrita a admin/teacher — o
  // mesmo perfil autorizado pela rota (ver AppRoutes) e pelas
  // Firestore Security Rules. Alunos não devem ver este item, já que
  // não têm acesso ao lançamento de notas.
  { to: "/notas", label: "Notas", icon: ClipboardList, roles: ["admin", "teacher"] },
  // Frequência: sem "soon" (implementada) e restrita a admin/teacher —
  // mesma role autorizada pela rota (ver AppRoutes) e pelas Firestore
  // Security Rules das coleções attendanceSessions/attendanceRecords.
  { to: "/frequencia", label: "Frequência", icon: CalendarCheck, roles: ["admin", "teacher"] },
  // Boletim: sem "soon" (implementada) e restrita a admin/teacher — mesma
  // role autorizada pela rota (ver AppRoutes) e pelas Firestore Security
  // Rules das coleções que ela consolida (grades/attendanceRecords).
  { to: "/boletim", label: "Boletim", icon: FileText, roles: ["admin", "teacher"] },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, soon: true },
];

function NavGroup({
  title,
  items,
  currentRole,
}: {
  title: string;
  items: NavItem[];
  currentRole?: UserRole;
}) {
  const visibleItems = items.filter((item) => !item.roles || (currentRole && item.roles.includes(currentRole)));
  if (visibleItems.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        {title}
      </span>
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            `flex items-center justify-between rounded-card px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-ink-700 text-white"
                : "text-ink-200 hover:bg-ink-800 hover:text-white"
            }`
          }
        >
          <span className="flex items-center gap-2.5">
            <item.icon className="h-4 w-4" strokeWidth={2} />
            {item.label}
          </span>
          {item.soon && (
            <span className="text-[11px] text-ink-400">em breve</span>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export function Sidebar() {
  const { profile } = useAuth();

  const initials = (profile?.name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-ink-900 px-3 py-5">
      <div className="mb-6 flex items-center gap-2 px-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-honors-400 font-display text-sm font-bold text-ink-900">
          T
        </span>
        <span className="font-display text-lg font-semibold text-white">Tekidu</span>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
        <NavGroup title="Principal" items={principalNav} currentRole={profile?.role} />
        <NavGroup title="Acadêmico" items={academicoNav} currentRole={profile?.role} />
      </nav>

      <div className="mt-4 flex flex-col gap-1 border-t border-ink-800 pt-4">
        <NavLink
          to="/configuracoes"
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-card px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-ink-700 text-white"
                : "text-ink-200 hover:bg-ink-800 hover:text-white"
            }`
          }
        >
          <Settings className="h-4 w-4" strokeWidth={2} />
          Configurações
        </NavLink>

        <div className="mt-2 flex items-center gap-2.5 px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-600 text-xs font-semibold text-white">
            {initials || "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {profile?.name ?? "Usuário"}
            </p>
            {profile && (
              <span className="text-xs text-ink-300">
                <RoleBadgeText role={profile.role} />
              </span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

// Versão em texto simples do RoleBadge para o rodapé escuro da sidebar
// (o RoleBadge original tem cores pensadas para fundo claro).
function RoleBadgeText({ role }: { role: Parameters<typeof RoleBadge>[0]["role"] }) {
  const labels: Record<string, string> = {
    admin: "Administrador",
    teacher: "Professor",
    student: "Aluno",
  };
  return <>{labels[role] ?? role}</>;
}
