import type { ReactNode } from "react";

interface MobileFabProps {
  onClick: () => void;
  label: string;
  icon: ReactNode;
}

/**
 * Floating Action Button — usado apenas em telas com UMA ação
 * principal clara (ex.: "Novo aluno" em Alunos), nunca em todas as
 * páginas (ver "FLOATING ACTION BUTTON" no briefing). Posicionado
 * acima da Bottom Navigation, respeitando a safe area.
 */
export function MobileFab({ onClick, label, icon }: MobileFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-ink-700 text-white shadow-card active:bg-ink-900 md:hidden"
      style={{ bottom: `calc(var(--tk-bottom-nav-h) + var(--tk-safe-bottom) + 1rem)` }}
    >
      {icon}
    </button>
  );
}
