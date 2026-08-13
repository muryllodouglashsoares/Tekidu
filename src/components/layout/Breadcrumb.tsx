import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  /** Omitido no último item (página atual) — sem ação, apenas texto. */
  onClick?: () => void;
}

/**
 * Trilha de navegação usada pelo fluxo Boletins → Turma → Aluno (ver
 * briefing, item 7 e 12). Não existia um padrão de breadcrumb em nenhuma
 * outra tela do Tekidu até aqui; este componente fica em `layout/` para
 * ser reaproveitado caso outra funcionalidade também precise de
 * navegação em níveis no futuro, em vez de duplicar o markup.
 */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Navegação estrutural" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-ink-300" aria-hidden="true" />}
            {isLast || !item.onClick ? (
              <span className={isLast ? "font-medium text-ink900" : "text-ink-500"} aria-current={isLast ? "page" : undefined}>
                {item.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={item.onClick}
                className="text-ink-500 transition-colors hover:text-ink-800 hover:underline"
              >
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
