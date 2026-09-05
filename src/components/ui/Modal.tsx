import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** "md" (padrão, inalterado) ou "lg" para conteúdo que precisa de mais largura de leitura (ex.: detalhe de um aviso). */
  size?: "md" | "lg";
  /**
   * Como este modal se comporta em mobile (ver "MODAIS E BOTTOM
   * SHEETS" no briefing — nem todo modal deve virar full-screen).
   * "fullscreen" (padrão): formulários e detalhes longos ganham a tela
   * toda. "dialog": confirmações e mensagens curtas continuam como um
   * cartão compacto centralizado, igual ao desktop.
   */
  mobileBehavior?: "fullscreen" | "dialog";
}

const SIZE_CLASS: Record<NonNullable<ModalProps["size"]>, string> = {
  md: "max-w-md",
  lg: "max-w-2xl",
};

/**
 * Um modal desktop pequeno centralizado na tela não funciona bem em
 * smartphone (ver "MODAIS" no briefing mobile): em vez de criar um
 * componente novo por formulário, este único componente compartilhado
 * — usado por todos os formulários/detalhes do app — passa a se
 * comportar como Full-screen Modal abaixo do breakpoint `md`, com
 * header fixo (respeitando a safe area) e corpo rolável. Em telas
 * maiores o comportamento é o mesmo de sempre (cartão centralizado).
 */
export function Modal({ title, onClose, children, size = "md", mobileBehavior = "fullscreen" }: ModalProps) {
  const isMobile = useIsMobile();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (isMobile && mobileBehavior === "fullscreen") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-surface">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="flex h-full flex-col motion-safe:animate-[tk-sheet-up_0.22s_ease-out]"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-line px-4 pb-3 pt-safe">
            <h2 className="pt-3 font-display text-lg font-semibold text-ink900">{title}</h2>
            <button
              aria-label="Fechar"
              onClick={onClose}
              className="mt-3 flex h-9 w-9 items-center justify-center rounded-card text-ink-400 active:bg-ink-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto p-4"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        aria-label="Fechar"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 max-h-[90vh] w-full ${SIZE_CLASS[size]} overflow-y-auto rounded-card border border-line bg-surface p-6 shadow-card`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink900">{title}</h2>
          <button
            aria-label="Fechar"
            onClick={onClose}
            className="rounded-card p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
