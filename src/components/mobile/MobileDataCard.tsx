import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface MobileDataCardProps {
  /** Avatar/ícone à esquerda — normalmente iniciais ou um ícone Lucide. */
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  /** Linha de indicadores compactos (ex.: "Média: 8.5", badge de situação). */
  meta?: ReactNode;
  /** Casa de seleção (checkbox) para ações em lote — renderizada antes de `leading`. */
  selection?: ReactNode;
  /** Ações rápidas (editar/excluir...) mostradas à direita, sempre com alvo de toque confortável. */
  actions?: ReactNode;
  onClick?: () => void;
}

/**
 * Equivalente em card de UMA linha de tabela desktop, para uso em
 * smartphones (ver "MOBILE DATA CARDS" no briefing). Não é uma
 * abstração de dados — só de apresentação: a página continua dona do
 * filtro/ordenação/paginação, só troca `<table>` por uma lista destes
 * cards abaixo do breakpoint `md`.
 */
export function MobileDataCard({
  leading,
  title,
  subtitle,
  meta,
  selection,
  actions,
  onClick,
}: MobileDataCardProps) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Card className="flex items-center gap-3 p-3.5">
      {selection}
      <Wrapper
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={`flex min-w-0 flex-1 items-center gap-3 text-left ${onClick ? "active:opacity-70" : ""}`}
      >
        {leading}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink900">{title}</span>
          {subtitle && <span className="block truncate text-xs text-ink-400">{subtitle}</span>}
          {meta && <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">{meta}</span>}
        </span>
        {onClick && !actions && <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" />}
      </Wrapper>
      {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
    </Card>
  );
}
