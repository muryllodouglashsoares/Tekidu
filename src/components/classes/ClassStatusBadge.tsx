import { CLASS_STATUS_LABEL, type ClassStatus } from "@/types/schoolClass";

const styles: Record<ClassStatus, string> = {
  active: "bg-success/10 text-success",
  inactive: "bg-ink-100 text-ink-500",
};

export function ClassStatusBadge({ status }: { status: ClassStatus }) {
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
      {CLASS_STATUS_LABEL[status]}
    </span>
  );
}
