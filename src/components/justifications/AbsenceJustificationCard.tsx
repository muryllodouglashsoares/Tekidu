import { FileCheck, FileText, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AbsenceJustificationStatusBadge } from "@/components/justifications/AbsenceJustificationStatusBadge";
import { justificationDeadlineDate } from "@/types/absenceJustification";
import type { AbsenceJustification } from "@/types/absenceJustification";
import type { AttendanceRecord } from "@/types/attendance";

function formatDate(isoDate: string): string {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

interface EligibleAbsenceCardProps {
  record: AttendanceRecord;
  disciplineName: string;
  onRequest: () => void;
}

/**
 * Uma falta elegível para justificativa, ainda sem solicitação
 * (seção 3.1 do prompt). Disciplina + data + aula vêm do próprio
 * `AttendanceRecord` (denormalizados na marcação de presença — ver
 * `types/attendance.ts`), nunca de uma leitura extra de
 * `attendanceSessions` (inacessível ao aluno pela Security Rule).
 * Mostra o prazo final para solicitar (`JUSTIFICATION_WINDOW_DAYS`
 * dias após a falta) — passado esse prazo, o item some desta lista.
 */
export function EligibleAbsenceCard({ record, disciplineName, onRequest }: EligibleAbsenceCardProps) {
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-display font-semibold text-ink900">{disciplineName}</p>
        <p className="text-sm text-ink-500">
          {formatDate(record.date ?? "")}
          {record.label ? ` · ${record.label}` : ""}
        </p>
        <p className="mt-1 text-xs font-medium text-danger">Falta registrada</p>
        <p className="text-xs text-ink-400">
          Prazo para solicitar: até {formatDate(justificationDeadlineDate(record.date ?? ""))}
        </p>
      </div>
      <Button onClick={onRequest} className="shrink-0">
        Solicitar justificativa
      </Button>
    </Card>
  );
}

interface AbsenceJustificationCardProps {
  justification: AbsenceJustification;
  disciplineName: string;
}

/**
 * Uma solicitação já enviada, em qualquer status (seção 12 do prompt).
 * Todos os dados exibidos (disciplina, data, aula, motivo, documento)
 * já estão denormalizados no próprio `AbsenceJustification` — a
 * listagem nunca baixa o arquivo comprobatório automaticamente
 * (seção 24: só um link para abrir sob demanda).
 */
export function AbsenceJustificationCard({ justification, disciplineName }: AbsenceJustificationCardProps) {
  const DocumentIcon = justification.documentType === "pdf" ? FileText : ImageIcon;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display font-semibold text-ink900">{disciplineName}</p>
          <p className="text-sm text-ink-500">
            {formatDate(justification.absenceDate)}
            {justification.sessionLabel ? ` · ${justification.sessionLabel}` : ""}
          </p>
        </div>
        <AbsenceJustificationStatusBadge status={justification.status} />
      </div>

      <p className="text-sm text-ink-700">{justification.reason}</p>

      <a
        href={justification.documentData}
        download={justification.documentName}
        className="inline-flex w-fit items-center gap-1.5 rounded-card bg-ink-50 px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-100"
      >
        <DocumentIcon className="h-3.5 w-3.5" aria-hidden="true" />
        Baixar {justification.documentName}
      </a>

      {justification.status === "approved" && (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <FileCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Falta considerada justificada.
        </p>
      )}

      {justification.status === "rejected" && justification.reviewComment && (
        <p className="rounded-card bg-danger/5 px-3 py-2 text-xs text-danger">
          Motivo da recusa: {justification.reviewComment}
        </p>
      )}
    </Card>
  );
}
