import { DISCIPLINE_STATUS_LABEL, type DisciplineStatus } from "@/types/discipline";

const styles: Record<DisciplineStatus, string> = {
  active: "bg-success/10 text-success",
  inactive: "bg-ink-100 text-ink-500",
};

export function DisciplineStatusBadge({ status }: { status: DisciplineStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${styles[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "active" ? "bg-success" : "bg-ink-400"
        }`}
        aria-hidden="true"
      />
      {DISCIPLINE_STATUS_LABEL[status]}
    </span>
  );
}
