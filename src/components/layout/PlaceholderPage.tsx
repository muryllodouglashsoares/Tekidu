import { Clock } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
}

/**
 * Tela "Esta área fará parte de uma próxima versão do
 * Tekidu", para áreas ainda não implementadas.
 */
export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-card bg-ink-50 text-ink-400">
        <Clock className="h-5 w-5" />
      </div>
      <h2 className="mb-1 font-display text-lg font-semibold text-ink900">{title}</h2>
      <p className="mb-4 max-w-xs text-sm text-ink-500">
        Esta área fará parte de uma próxima versão do Tekidu.
      </p>
      <span className="rounded-full bg-ink-50 px-3 py-1 text-xs font-medium text-ink-600">
        Em desenvolvimento
      </span>
    </div>
  );
}
