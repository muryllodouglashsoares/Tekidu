import { type SelectHTMLAttributes, forwardRef, useId } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  /** Mantém o label acessível para leitores de tela, mas o esconde
   * visualmente. Útil para filtros compactos (ex.: Turmas) onde o
   * próprio texto da opção selecionada já comunica o propósito. */
  hideLabel?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, className = "", hideLabel, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={selectId}
          className={hideLabel ? "sr-only" : "text-sm font-medium text-ink-700"}
        >
          {label}
        </label>
        <select
          id={selectId}
          ref={ref}
          aria-invalid={!!error}
          className={`rounded-card border bg-white px-3.5 py-2.5 text-sm text-ink900
            outline-none transition-colors
            ${error ? "border-danger" : "border-line focus:border-ink-400"}
            ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    );
  }
);
Select.displayName = "Select";
