import type { HTMLAttributes } from "react";

export function Card({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-line bg-surface shadow-card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
