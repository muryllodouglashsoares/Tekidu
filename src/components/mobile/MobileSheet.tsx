import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface MobileSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** "auto" (padrão, cresce com o conteúdo até ~85dvh) ou "full" (tela cheia — busca, formulários longos). */
  variant?: "auto" | "full";
  /** Ação opcional ao lado do título (ex.: "Marcar todas como lidas", "Limpar filtros"). */
  headerAction?: ReactNode;
}

/**
 * Bottom Sheet genérico — base reutilizável para "Mais", filtros,
 * notificações e qualquer outro painel mobile do Tekidu (ver
 * "MODAIS E BOTTOM SHEETS" / "NÃO UTILIZAR COMPONENTES DIFERENTES
 * ALEATORIAMENTE" no briefing). Suporta arrastar para fechar (o
 * gesto mais previsível para este tipo de painel) e respeita
 * `prefers-reduced-motion` via `transition` condicional do
 * Framer Motion, que já lê a preferência do sistema automaticamente
 * quando `reducedMotion="user"` está configurado no MotionConfig
 * global — aqui usamos uma transição curta e não decorativa, que já
 * fica quase instantânea nesse caso.
 */
export function MobileSheet({
  open,
  onClose,
  title,
  children,
  variant = "auto",
  headerAction,
}: MobileSheetProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex flex-col justify-end md:hidden">
          <motion.button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative z-10 flex w-full flex-col overflow-hidden rounded-t-card border-t border-line bg-surface shadow-card ${
              variant === "full" ? "h-[92dvh]" : "max-h-[85dvh]"
            }`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) onClose();
            }}
          >
            <div className="flex shrink-0 justify-center pt-2.5" aria-hidden="true">
              <span className="h-1.5 w-10 rounded-full bg-ink-200" />
            </div>

            {title && (
              <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-2">
                <h2 className="min-w-0 truncate font-display text-base font-semibold text-ink900">{title}</h2>
                <div className="flex shrink-0 items-center gap-1">
                  {headerAction}
                  <button
                    type="button"
                    aria-label="Fechar"
                    onClick={onClose}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink-400 hover:bg-ink-50 hover:text-ink-700"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto pb-safe">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
