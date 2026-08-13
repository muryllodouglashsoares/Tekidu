import { ATTENDANCE_STATUS_LABEL, type AttendanceStatus } from "@/types/attendance";

const styles: Record<AttendanceStatus, string> = {
  regular: "bg-success/10 text-success",
  attention: "bg-honors-400/20 text-honors-600",
  critical: "bg-danger/10 text-danger",
};

const dotStyles: Record<AttendanceStatus, string> = {
  regular: "bg-success",
  attention: "bg-honors-500",
  critical: "bg-danger",
};

/**
 * Badge de situação de frequência (Regular / Atenção / Crítica).
 * Mesmo padrão visual de `SituationBadge` (Notas): cor + ponto colorido
 * + rótulo em texto, para nunca depender só da cor (ver seção de
 * acessibilidade do briefing).
 */
export function AttendanceStatusBadge({ status }: { status: AttendanceStatus | null }) {
  if (status === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-500">
        <span className="h-1.5 w-1.5 rounded-full bg-ink-400" aria-hidden="true" />
        Sem registros
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[status]}`} aria-hidden="true" />
      {ATTENDANCE_STATUS_LABEL[status]}
    </span>
  );
}
