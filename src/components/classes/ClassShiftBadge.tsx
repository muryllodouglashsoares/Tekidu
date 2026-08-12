import { CLASS_SHIFT_LABEL, type ClassShift } from "@/types/schoolClass";

const styles: Record<ClassShift, string> = {
  manha: "bg-honors-100 text-honors-600",
  tarde: "bg-blue-100 text-blue-700",
  noite: "bg-violet-100 text-violet-700",
};

export function ClassShiftBadge({ shift }: { shift: ClassShift }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[shift]}`}
    >
      {CLASS_SHIFT_LABEL[shift]}
    </span>
  );
}
