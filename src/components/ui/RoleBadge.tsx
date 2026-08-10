import type { UserRole } from "@/types/user";

const labels: Record<UserRole, string> = {
  admin: "Administrador",
  teacher: "Professor",
  student: "Aluno",
};

// Cada role tem uma cor discreta — funciona como um "selo" de papel
// (referência à identidade visual acadêmica do Tekidu), não apenas
// uma tag de CRUD genérica.
const styles: Record<UserRole, string> = {
  admin: "bg-ink-700 text-white",
  teacher: "bg-honors-400 text-ink-900",
  student: "bg-ink-100 text-ink-700",
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
