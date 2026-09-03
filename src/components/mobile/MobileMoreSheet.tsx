import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun } from "lucide-react";
import { MobileSheet } from "@/components/mobile/MobileSheet";
import {
  MOBILE_ACCOUNT_NAV_ITEM,
  MOBILE_MORE_SECTIONS,
  type MobileNavItem,
} from "@/components/mobile/mobileNav.config";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { UserRole } from "@/types/user";

interface MobileMoreSheetProps {
  open: boolean;
  onClose: () => void;
  role: UserRole;
}

/**
 * Conteúdo do item "Mais" da Bottom Navigation — organizado por
 * categoria (Acadêmico/Organização/Conta), nunca uma lista crua (ver
 * "ITEM MAIS" no briefing). "Conta" reúne Configurações, alternância
 * de tema e Sair, resolvidos aqui porque envolvem ações, não só
 * navegação.
 */
export function MobileMoreSheet({ open, onClose, role }: MobileMoreSheetProps) {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const sections = MOBILE_MORE_SECTIONS[role];

  async function handleSignOut() {
    onClose();
    await signOut();
    navigate("/login", { replace: true });
  }

  const initials = (profile?.name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <MobileSheet open={open} onClose={onClose} title="Mais">
      <div className="flex flex-col gap-6 px-5 pb-6">
        <div className="flex items-center gap-3 rounded-card border border-line bg-paper p-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-700 text-sm font-bold text-white">
            {initials || "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink900">{profile?.name ?? "Usuário"}</p>
            <p className="text-xs font-medium text-ink-500">{ROLE_LABEL[role]}</p>
          </div>
        </div>

        {sections.map((section) => (
          <NavSection key={section.title} title={section.title} items={section.items} onNavigate={onClose} />
        ))}

        <div className="flex flex-col gap-1">
          <span className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Conta
          </span>
          <MoreLink item={MOBILE_ACCOUNT_NAV_ITEM} onNavigate={onClose} />
          <button
            type="button"
            onClick={toggleTheme}
            className="flex min-h-[44px] items-center gap-3 rounded-card px-3 py-2.5 text-left text-sm font-medium text-ink-600 active:bg-ink-50"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-[44px] items-center gap-3 rounded-card px-3 py-2.5 text-left text-sm font-medium text-danger active:bg-danger/10"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </div>
    </MobileSheet>
  );
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  teacher: "Professor",
  student: "Aluno",
};

function NavSection({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: MobileNavItem[];
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        {title}
      </span>
      {items.map((item) => (
        <MoreLink key={item.to} item={item} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function MoreLink({ item, onNavigate }: { item: MobileNavItem; onNavigate: () => void }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex min-h-[44px] items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? "bg-ink-100 text-ink-700" : "text-ink-600 active:bg-ink-50"
        }`
      }
    >
      <item.icon className="h-5 w-5" strokeWidth={2} />
      {item.label}
    </NavLink>
  );
}
