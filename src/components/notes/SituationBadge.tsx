import { ACADEMIC_SITUATION_LABEL, type AcademicSituation } from "@/types/grade";

const styles: Record<AcademicSituation, string> = {
  approved: "bg-success/10 text-success",
  recovery: "bg-honors-400/20 text-honors-600",
  failed: "bg-danger/10 text-danger",
  incomplete: "bg-honors-400/20 text-honors-600",
  no_grades: "bg-ink-100 text-ink-500",
};

export function SituationBadge({ situation }: { situation: AcademicSituation }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[situation]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          situation === "approved"
            ? "bg-success"
            : situation === "failed"
              ? "bg-danger"
              : situation === "no_grades"
                ? "bg-ink-400"
                : "bg-honors-500"
        }`}
        aria-hidden="true"
      />
      {ACADEMIC_SITUATION_LABEL[situation]}
    </span>
  );
}
