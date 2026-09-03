import { NavLink, useLocation } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { MOBILE_BOTTOM_NAV, type MobileNavItem } from "@/components/mobile/mobileNav.config";
import type { UserRole } from "@/types/user";

interface MobileBottomNavProps {
  role: UserRole;
  onOpenMore: () => void;
  moreActive: boolean;
}

/**
 * Navegação principal em smartphones (ver "BOTTOM NAVIGATION" no
 * briefing mobile). Fixa, respeita safe area, altura confortável e só
 * mostra os destinos mais importantes de cada role — o restante vive
 * no item "Mais" (ver `MobileMoreSheet`). Some em telas ≥ md, onde a
 * Sidebar volta a ser a navegação principal.
 */
export function MobileBottomNav({ role, onOpenMore, moreActive }: MobileBottomNavProps) {
  const location = useLocation();
  const items = MOBILE_BOTTOM_NAV[role];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur pb-safe md:hidden"
      style={{ height: `calc(var(--tk-bottom-nav-h) + var(--tk-safe-bottom))` }}
    >
      <div className="grid h-[var(--tk-bottom-nav-h)] grid-cols-5">
        {items.map((item) => (
          <NavTab key={item.to} item={item} />
        ))}
        <button
          type="button"
          onClick={onOpenMore}
          aria-label="Mais opções"
          aria-current={moreActive ? "page" : undefined}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
            moreActive ? "text-ink-700" : "text-ink-400 hover:text-ink-600"
          }`}
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={2.25} />
          Mais
        </button>
      </div>
    </nav>
  );

  function isItemActive(item: MobileNavItem) {
    if (item.to === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(item.to);
  }

  function NavTab({ item }: { item: MobileNavItem }) {
    const active = isItemActive(item);
    return (
      <NavLink
        to={item.to}
        className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
          active ? "text-ink-700" : "text-ink-400 hover:text-ink-600"
        }`}
      >
        <item.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
        <span className="truncate px-1">{item.label}</span>
      </NavLink>
    );
  }
}
