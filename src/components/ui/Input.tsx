import { type InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-ink-700">
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`rounded-card border bg-surface px-3.5 py-2.5 text-sm text-ink900
            placeholder:text-ink-300 outline-none transition-colors
            ${error ? "border-danger" : "border-line focus:border-ink-400"}
            ${className}`}
          {...props}
        />
        {error && (
          <span id={`${inputId}-error`} className="text-xs text-danger">
            {error}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
