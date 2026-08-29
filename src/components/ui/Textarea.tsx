import { type TextareaHTMLAttributes, forwardRef, useId } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

/** Mesmo padrão visual de `Input` — extraído para não duplicar o
 * campo de descrição usado pelo formulário de eventos do calendário. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={textareaId} className="text-sm font-medium text-ink-700">
          {label}
        </label>
        <textarea
          id={textareaId}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          className={`resize-none rounded-card border bg-surface px-3.5 py-2.5 text-sm text-ink900
            placeholder:text-ink-300 outline-none transition-colors
            ${error ? "border-danger" : "border-line focus:border-ink-400"}
            ${className}`}
          {...props}
        />
        {error && (
          <span id={`${textareaId}-error`} className="text-xs text-danger">
            {error}
          </span>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
