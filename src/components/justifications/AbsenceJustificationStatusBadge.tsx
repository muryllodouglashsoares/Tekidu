import { CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  ABSENCE_JUSTIFICATION_STATUS_LABEL,
  type AbsenceJustificationStatus,
} from "@/types/absenceJustification";

const styles: Record<AbsenceJustificationStatus, string> = {
  pending: "bg-honors-400/20 text-honors-600",
  approved: "bg-success/10 text-success",
  rejected: "bg-danger/10 text-danger",
};

const icons: Record<AbsenceJustificationStatus, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
};

/**
 * Badge de status da justificativa (Em análise / Aprovada / Recusada).
 * Mesmo padrão de `AttendanceStatusBadge`/`DisciplineStatusBadge`:
 * ícone + cor + texto, nunca depende só da cor (seção 21 do prompt —
 * acessibilidade).
 */
export function AbsenceJustificationStatusBadge({ status }: { status: AbsenceJustificationStatus }) {
  const Icon = icons[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {ABSENCE_JUSTIFICATION_STATUS_LABEL[status]}
    </span>
  );
}
