import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { AbsenceJustificationDocumentUpload } from "@/components/justifications/AbsenceJustificationDocumentUpload";
import { validateJustificationDocument } from "@/services/justifications/absenceJustificationDocumentService";
import { submitAbsenceJustification } from "@/services/justifications/absenceJustificationService";
import {
  JUSTIFICATION_REASON_MAX_LENGTH,
  JUSTIFICATION_REASON_MIN_LENGTH,
  isValidJustificationReason,
} from "@/types/absenceJustification";
import type { AttendanceRecord } from "@/types/attendance";
import { describeFirebaseError } from "@/utils/firebaseError";

interface AbsenceJustificationFormProps {
  attendanceRecord: AttendanceRecord;
  disciplineName: string;
  studentId: string;
  studentUid: string;
  onClose: () => void;
  onSuccess: () => void;
}

function formatDate(isoDate: string): string {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

/**
 * Formulário de solicitação de justificativa (seção 10 do prompt).
 * Informações da falta somente leitura + motivo + documento — mesmo
 * padrão visual de `AnnouncementFormModal` (Modal + Textarea + Button,
 * um único `error` de topo, botão de envio desabilitado enquanto
 * inválido/enviando).
 */
export function AbsenceJustificationForm({
  attendanceRecord,
  disciplineName,
  studentId,
  studentUid,
  onClose,
  onSuccess,
}: AbsenceJustificationFormProps) {
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reasonTrimmedLength = reason.trim().length;
  const reasonValid = isValidJustificationReason(reason);
  const canSubmit = reasonValid && !!file && !submitting;

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError(null);

    if (!reasonValid) {
      setError(
        `Informe um motivo com entre ${JUSTIFICATION_REASON_MIN_LENGTH} e ${JUSTIFICATION_REASON_MAX_LENGTH} caracteres.`
      );
      return;
    }
    if (!file) {
      setError("Selecione um documento comprobatório.");
      return;
    }
    const validationError = validateJustificationDocument(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await submitAbsenceJustification({
        studentId,
        studentUid,
        attendanceRecord,
        reason,
        file,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error && !("code" in err)
          ? err.message
          : describeFirebaseError(err, "justificativas:enviar")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Solicitar justificativa" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="grid grid-cols-1 gap-3 rounded-card bg-ink-50 p-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Disciplina</p>
            <p className="mt-0.5 font-medium text-ink900">{disciplineName}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Data da aula</p>
            <p className="mt-0.5 font-medium text-ink900">
              {formatDate(attendanceRecord.date ?? "")}
              {attendanceRecord.label ? ` · ${attendanceRecord.label}` : ""}
            </p>
          </div>
        </div>

        <Textarea
          label="Motivo da ausência"
          required
          rows={4}
          maxLength={JUSTIFICATION_REASON_MAX_LENGTH}
          placeholder="Explique brevemente o motivo da sua ausência..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={
            reason.length > 0 && !reasonValid
              ? `Use entre ${JUSTIFICATION_REASON_MIN_LENGTH} e ${JUSTIFICATION_REASON_MAX_LENGTH} caracteres.`
              : undefined
          }
        />
        <p className="-mt-3 text-right text-xs text-ink-400" aria-live="polite">
          {reasonTrimmedLength}/{JUSTIFICATION_REASON_MAX_LENGTH}
        </p>

        <AbsenceJustificationDocumentUpload
          file={file}
          onChange={(f) => {
            setFile(f);
            setFileError(null);
          }}
          disabled={submitting}
          error={fileError}
        />

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-1 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting} disabled={!canSubmit}>
            Enviar justificativa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
