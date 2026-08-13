import { BOLETIM_STATUS_LABEL, type BoletimStatus } from "@/types/boletim";

const styles: Record<BoletimStatus, string> = {
  regular: "bg-success/10 text-success",
  attention: "bg-honors-400/20 text-honors-600",
  recovery: "bg-honors-400/20 text-honors-600",
  failed: "bg-danger/10 text-danger",
  no_data: "bg-ink-100 text-ink-500",
};

const dotStyles: Record<BoletimStatus, string> = {
  regular: "bg-success",
  attention: "bg-honors-500",
  recovery: "bg-honors-500",
  failed: "bg-danger",
  no_data: "bg-ink-400",
};

/**
 * Badge da situação acadêmica GERAL do boletim (item 10 do briefing).
 * Mesmo padrão visual de `SituationBadge` (Notas) e
 * `AttendanceStatusBadge` (Frequência) — ponto colorido + rótulo em
 * texto, para a nova tela parecer uma continuação natural das duas.
 */
export function AcademicStatusBadge({ status }: { status: BoletimStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[status]}`} aria-hidden="true" />
      {BOLETIM_STATUS_LABEL[status]}
    </span>
  );
}
