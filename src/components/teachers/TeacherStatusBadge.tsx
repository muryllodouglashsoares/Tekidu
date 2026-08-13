// Mesmo padrão visual de `ClassStatusBadge`/`DisciplineStatusBadge`
// (bolinha + rótulo em maiúsculas), aplicado ao campo `active`
// (booleano) de `users`, já que professor não tem um enum de status
// próprio — apenas ativo/inativo.
export function TeacherStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
        active ? "bg-success/10 text-success" : "bg-ink-100 text-ink-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-success" : "bg-ink-400"}`}
        aria-hidden="true"
      />
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}
