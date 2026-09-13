import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { reviewAbsenceJustification } from "@/services/justifications/absenceJustificationService";
import type { AbsenceJustification, AbsenceJustificationStatus } from "@/types/absenceJustification";
import { describeFirebaseError } from "@/utils/firebaseError";

interface AbsenceJustificationReviewDialogProps {
  justification: AbsenceJustification;
  studentUid: string;
  decision: Extract<AbsenceJustificationStatus, "approved" | "rejected">;
  reviewerUid: string;
  reviewerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Confirmação da decisão de análise (seção 16 do prompt). Comentário
 * opcional em ambos os casos, mas praticamente indispensável ao
 * recusar (é o que o aluno vê como "Motivo da recusa" — ver
 * `AbsenceJustificationCard`).
 */
export function AbsenceJustificationReviewDialog({
  justification,
  studentUid,
  decision,
  reviewerUid,
  reviewerName,
  onClose,
  onSuccess,
}: AbsenceJustificationReviewDialogProps) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isApproving = decision === "approved";

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await reviewAbsenceJustification({
        justificationId: justification.id,
        decision,
        reviewerUid,
        reviewerName,
        comment,
        studentUid,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(describeFirebaseError(err, "justificativas:analisar"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isApproving ? "Aprovar justificativa" : "Recusar justificativa"} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-600">
          {isApproving
            ? "A falta original permanece registrada, mas passará a constar como justificada."
            : "O aluno será notificado da recusa e não poderá reenviar esta solicitação."}
        </p>

        <Textarea
          label={isApproving ? "Observação (opcional)" : "Motivo da recusa (opcional)"}
          rows={3}
          maxLength={500}
          placeholder={isApproving ? "Alguma observação sobre a análise..." : "Explique por que a solicitação foi recusada..."}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            className={isApproving ? undefined : "!bg-danger hover:!bg-danger/90"}
            loading={submitting}
            onClick={handleConfirm}
          >
            {isApproving ? "Aprovar" : "Recusar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
