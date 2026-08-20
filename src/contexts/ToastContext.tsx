import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  /**
   * Publica um toast e o remove automaticamente após `durationMs`
   * (padrão 4s). Usado como o padrão consistente de feedback de
   * sucesso/erro pedido na Fase 6 (criar/editar/excluir/atualizar/
   * registrar/publicar), em vez de cada página inventar seu próprio
   * mecanismo de feedback.
   */
  showToast: (message: string, variant?: ToastVariant, durationMs?: number) => void;
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `toast-${idCounter}-${Date.now()}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info", durationMs = 4000) => {
      const id = nextId();
      setToasts((prev) => [...prev, { id, variant, message }]);
      const timer = setTimeout(() => dismiss(id), durationMs);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  const success = useCallback(
    (message: string, durationMs?: number) => showToast(message, "success", durationMs),
    [showToast]
  );
  const error = useCallback(
    (message: string, durationMs?: number) => showToast(message, "error", durationMs ?? 6000),
    [showToast]
  );
  const info = useCallback(
    (message: string, durationMs?: number) => showToast(message, "info", durationMs),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-4 sm:items-end sm:px-6 sm:pb-6"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; iconClass: string; borderClass: string }
> = {
  success: { icon: CheckCircle2, iconClass: "text-success", borderClass: "border-success/30" },
  error: { icon: XCircle, iconClass: "text-danger", borderClass: "border-danger/30" },
  info: { icon: Info, iconClass: "text-ink-500", borderClass: "border-line" },
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const { icon: Icon, iconClass, borderClass } = VARIANT_STYLES[toast.variant];
  return (
    <div
      role={toast.variant === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border ${borderClass} bg-surface p-4 shadow-card transition-all`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} aria-hidden="true" />
      <p className="flex-1 text-sm font-medium text-ink900">{toast.message}</p>
      <button
        type="button"
        aria-label="Fechar notificação"
        onClick={onDismiss}
        className="rounded-card p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Hook de acesso ao sistema de toast. Lança erro se usado fora do
 * `ToastProvider` (o mesmo padrão de `useAuth`/`AuthContext`), para
 * detectar cedo o esquecimento do provider em vez de falhar
 * silenciosamente.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast deve ser usado dentro de um ToastProvider");
  }
  return ctx;
}
