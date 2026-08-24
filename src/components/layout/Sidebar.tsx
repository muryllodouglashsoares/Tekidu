import { NavLink, useNavigate } from "react-router-dom";
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
  LineChart,
  Settings,
  LogOut,
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
  // Alunos/Turmas/Disciplinas: visão de STAFF (escola inteira, com
  // edição) — restrita a admin. Antes também aparecia para "teacher",
  // mas essa visão foi retirada do professor: agora ele usa
  // EXCLUSIVAMENTE o grupo "Minhas Turmas" abaixo (rotas escopadas ao
  // próprio `profile.uid`), nunca mais a escola inteira. Ver decisão
  // registrada em AppRoutes.tsx.
  { to: "/alunos", label: "Alunos", icon: Users, roles: ["admin"] },
  { to: "/turmas", label: "Turmas", icon: School, roles: ["admin"] },
  { to: "/disciplinas", label: "Disciplinas", icon: BookOpen, roles: ["admin"] },
  // Restrita a admin: mesma role autorizada pela rota (ver AppRoutes) e
  // pelas Firestore Security Rules para criar/editar contas em "users".
  { to: "/professores", label: "Professores", icon: GraduationCap, roles: ["admin"] },
];

// Etapa 4 do plano multi-role — Portal do Professor: "Minhas Turmas" e
// "Meus Alunos" são a visão do professor filtrada por
// `discipline.teacherId === profile.uid` (ver teacherOverviewService),
// diferente do grupo "Principal" acima, que é a visão de staff da
// escola inteira. Só aparece para `teacher` (ver NavGroup/`roles`).
const minhasTurmasNav: NavItem[] = [
  { to: "/minhas-turmas", label: "Minhas Turmas", icon: School, roles: ["teacher"] },
  { to: "/meus-alunos", label: "Meus Alunos", icon: Users, roles: ["teacher"] },
  // Etapa 4b do plano multi-role: comparação entre as turmas do
  // professor e evolução por bimestre de cada uma — mesma role
  // restrita a "teacher" dos outros dois itens deste grupo.
  { to: "/desempenho-turmas", label: "Desempenho", icon: LineChart, roles: ["teacher"] },
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
  // Boletim (visão de staff — escolhe turma/aluno manualmente): sem
  // "soon" (implementada) e restrita a admin/teacher — mesma role
  // autorizada pela rota (ver AppRoutes) e pelas Firestore Security
  // Rules das coleções que ela consolida (grades/attendanceRecords).
  { to: "/boletim", label: "Boletim", icon: FileText, roles: ["admin", "teacher"] },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, roles: ["admin", "teacher"] },
  // Meu Boletim (Tarefa 3, Fase 1 pós-auditoria V8): Portal do Aluno —
  // visão somente-leitura do PRÓPRIO boletim/frequência, restrita à
  // role "student" (o inverso exato de "Boletim" acima, que é de
  // staff). Resolvido automaticamente pelo `uid` logado, sem escolher
  // "qual aluno" — ver MyBoletimPage.
  { to: "/meu-boletim", label: "Meu Boletim", icon: FileText, roles: ["student"] },
  // Etapa 3 do plano multi-role — restante do Portal do Aluno: mesma
  // regra de "Meu Boletim" acima (somente leitura, `uid` resolvido
  // automaticamente, nunca escolhe "qual aluno").
  { to: "/minhas-disciplinas", label: "Minhas Disciplinas", icon: BookOpen, roles: ["student"] },
  { to: "/minha-frequencia", label: "Frequência", icon: CalendarCheck, roles: ["student"] },
  { to: "/meu-desempenho", label: "Meu Desempenho", icon: LineChart, roles: ["student"] },
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
            `flex items-center justify-between rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-ink-100 text-ink-700"
                : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
            }`
          }
        >
          <span className="flex items-center gap-3">
            <item.icon className="h-5 w-5" strokeWidth={2} />
            {item.label}
          </span>
          {item.soon && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">em breve</span>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = (profile?.name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  // Etapa 9e (auditoria de logout): antes desta mudança não existia
  // NENHUM jeito de sair de dentro do app — `AuthContext.signOut` só
  // era chamado a partir de `StatusPage` (rotas de erro como
  // "/sem-perfil"), inalcançáveis por um usuário com sessão normal.
  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-surface border-r border-line px-4 py-6">
      <div className="mb-8 flex items-center gap-3 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-700 text-white shadow-sm">
          <School className="h-5 w-5" />
        </div>
        <span className="font-display text-xl font-bold text-ink900">Tekidu</span>
      </div>

      <nav className="flex flex-1 flex-col gap-8 overflow-y-auto px-2">
        <NavGroup title="Principal" items={principalNav} currentRole={profile?.role} />
        <NavGroup title="Minhas Turmas" items={minhasTurmasNav} currentRole={profile?.role} />
        <NavGroup title="Acadêmico" items={academicoNav} currentRole={profile?.role} />
      </nav>

      <div className="mt-4 flex flex-col gap-2 pt-4 px-2">
        <NavLink
          to="/configuracoes"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-ink-100 text-ink-700"
                : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
            }`
          }
        >
          <Settings className="h-5 w-5" strokeWidth={2} />
          Configurações
        </NavLink>

        <div className="mt-4 flex items-center gap-3 rounded-card bg-paper p-3 border border-line">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-700 text-sm font-bold text-white shadow-sm">
            {initials || "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink900">
              {profile?.name ?? "Usuário"}
            </p>
            {profile && (
              <span className="text-xs font-medium text-ink-500">
                <RoleBadgeText role={profile.role} />
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-2 flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <LogOut className="h-5 w-5" strokeWidth={2} />
          Sair
        </button>
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
