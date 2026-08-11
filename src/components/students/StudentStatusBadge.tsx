import { STUDENT_STATUS_LABEL, type StudentStatus } from "@/types/student";

const styles: Record<StudentStatus, string> = {
  active: "bg-success/10 text-success",
  recovery: "bg-honors-400/20 text-honors-600",
  failed: "bg-danger/10 text-danger",
  inactive: "bg-ink-100 text-ink-500",
};

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {STUDENT_STATUS_LABEL[status]}
    </span>
  );
}
