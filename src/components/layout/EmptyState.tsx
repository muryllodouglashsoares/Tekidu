import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /**
   * Ação relevante opcional (Fase 6 — "ícone; título; explicação; ação
   * relevante quando existir"). Ex.: { label: "Adicionar disciplina",
   * onClick: () => setShowForm(true) }. Omitido quando o estado vazio
   * não tem uma ação direta a oferecer (ex.: "selecione uma turma").
   */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Quando usado dentro de um Card já existente (ex.: dentro de uma tabela), evita aninhar Card em Card. */
  bare?: boolean;
}

/**
 * Card de estado vazio reutilizado pelas telas com filtros dependentes
 * (Notas, Frequência): "selecione X para continuar". Extraído do
 * componente local que já existia em `NotesPage` para evitar duplicar o
 * mesmo markup/estilo em cada tela nova.
 */
export function EmptyState({ icon: Icon, title, description, action, bare }: EmptyStateProps) {
  const content = (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-card bg-ink-50 text-ink-400">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-display text-base font-semibold text-ink900">{title}</p>
        <p className="mt-1 max-w-xs text-sm text-ink-500">{description}</p>
      </div>
      {action && (
        <Button variant="secondary" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  );

  if (bare) return content;
  return <Card>{content}</Card>;
}
