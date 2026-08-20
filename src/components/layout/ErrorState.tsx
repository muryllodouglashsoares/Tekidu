import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  /** Mensagem já traduzida para o usuário (ver `describeFirebaseError`). */
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Estado de erro padrão (Fase 6): substitui os blocos de erro
 * duplicados que cada página tinha ("texto vermelho + botão Tentar
 * novamente" montado inline). Nunca recebe mensagens técnicas cruas —
 * quem chama já deve ter passado o erro por `describeFirebaseError`.
 */
export function ErrorState({ message, onRetry, retryLabel = "Tentar novamente" }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-card bg-danger/10 text-danger">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="font-display text-base font-semibold text-ink900">
          Não foi possível carregar os dados
        </p>
        <p className="mt-1 max-w-sm text-sm text-ink-500">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
