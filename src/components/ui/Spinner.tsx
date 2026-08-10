export function Spinner({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-3 text-ink-400">
      <span
        className="h-6 w-6 animate-spin rounded-full border-2 border-ink-200 border-t-ink-600"
        aria-hidden="true"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
