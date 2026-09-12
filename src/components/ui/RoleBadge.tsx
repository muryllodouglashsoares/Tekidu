import type { UserRole } from "@/types/user";

const labels: Record<UserRole, string> = {
  admin: "Administrador",
  teacher: "Professor",
  student: "Aluno",
  guardian: "Responsável",
};

// Cada role tem uma cor discreta — funciona como um "selo" de papel
// (referência à identidade visual acadêmica do Tekidu), não apenas
// uma tag de CRUD genérica.
const styles: Record<UserRole, string> = {
  admin: "bg-ink-700 text-white",
  teacher: "bg-honors-400 text-ink-900",
  student: "bg-ink-100 text-ink-700",
  // Fase 2 do plano de evolução (guardian) — tom neutro próprio,
  // distinto dos três já existentes, para não ser confundido com
  // "Aluno" (o mais próximo visualmente).
  guardian: "bg-ink-50 text-ink-600 border border-line",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${styles[role]}`}
    >
      {labels[role]}
    </span>
  );
}
