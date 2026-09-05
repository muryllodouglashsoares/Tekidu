import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirmar",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { trigger } = useHapticFeedback();

  async function handleConfirm() {
    setError(null);
    setLoading(true);
    try {
      await onConfirm();
      trigger("success");
    } catch {
      trigger("warning");
      setError("Não foi possível concluir a ação. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <Modal title={title} onClose={onCancel} mobileBehavior="dialog">
      <p className="text-sm text-ink-600">{description}</p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          className="!bg-danger hover:!bg-danger/90"
          loading={loading}
          onClick={handleConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
