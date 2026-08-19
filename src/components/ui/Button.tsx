import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium " +
  "px-5 py-2.5 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-ink-700 text-white hover:bg-ink-800 active:bg-ink-900 shadow-sm",
  secondary:
    "bg-surface text-ink-600 border border-line hover:bg-ink-50 active:bg-ink-100",
  ghost: "text-ink-600 hover:bg-ink-50 hover:text-ink-800",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
