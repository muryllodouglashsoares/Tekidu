import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Card de estado vazio reutilizado pelas telas com filtros dependentes
 * (Notas, Frequência): "selecione X para continuar". Extraído do
 * componente local que já existia em `NotesPage` para evitar duplicar o
 * mesmo markup/estilo em cada tela nova.
 */
export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-card bg-ink-50 text-ink-400">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-display text-base font-semibold text-ink900">{title}</p>
        <p className="mt-1 max-w-xs text-sm text-ink-500">{description}</p>
      </div>
    </Card>
  );
}
