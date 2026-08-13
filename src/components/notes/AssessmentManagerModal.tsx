import { useState, type FormEvent } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Assessment } from "@/types/assessment";

interface AssessmentManagerModalProps {
  disciplineName: string;
  className: string;
  assessments: Assessment[];
  onClose: () => void;
  onCreate: (name: string, order: number) => Promise<void>;
  onDelete: (assessmentId: string) => Promise<void>;
}

/**
 * Permite cadastrar/remover avaliações (Prova 1, Trabalho, etc.) do
 * contexto atualmente selecionado na tela de Notas. Não reaproveita
 * `Select`/`ConfirmDialog` para exclusão de forma redundante — usa o
 * `ConfirmDialog` já existente no design system em vez de criar um novo
 * padrão de confirmação.
 */
export function AssessmentManagerModal({
  disciplineName,
  className,
  assessments,
  onClose,
  onCreate,
  onDelete,
}: AssessmentManagerModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Assessment | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Informe o nome da avaliação.");
      return;
    }
    if (assessments.some((a) => a.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      setError("Já existe uma avaliação com esse nome neste contexto.");
      return;
    }

    setSaving(true);
    try {
      const nextOrder = assessments.length > 0 ? Math.max(...assessments.map((a) => a.order)) + 1 : 0;
      await onCreate(name.trim(), nextOrder);
      setName("");
    } catch {
      setError("Não foi possível criar a avaliação. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Modal title="Avaliações" onClose={onClose}>
        <p className="mb-4 text-sm text-ink-500">
          {disciplineName} · {className}
        </p>

        <form onSubmit={handleSubmit} className="mb-5 flex items-end gap-2" noValidate>
          <div className="flex-1">
            <Input
              label="Nova avaliação"
              placeholder="Ex.: Prova 1, Trabalho, Projeto..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit" loading={saving}>
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </form>

        {error && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {error}
          </p>
        )}

        {assessments.length === 0 ? (
          <p className="rounded-card bg-ink-50 px-3.5 py-3 text-sm text-ink-500">
            Nenhuma avaliação cadastrada para este bimestre ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {assessments
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((assessment) => (
                <li
                  key={assessment.id}
                  className="flex items-center justify-between gap-2 rounded-card border border-line px-3.5 py-2.5"
                >
                  <span className="flex items-center gap-2 text-sm text-ink900">
                    <GripVertical className="h-4 w-4 text-ink-300" aria-hidden="true" />
                    {assessment.name}
                  </span>
                  <button
                    type="button"
                    aria-label={`Excluir ${assessment.name}`}
                    className="rounded-card p-1.5 text-ink-400 hover:bg-danger/10 hover:text-danger"
                    onClick={() => setDeleting(assessment)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
          </ul>
        )}

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </Modal>

      {deleting && (
        <ConfirmDialog
          title="Excluir avaliação"
          description={`A avaliação "${deleting.name}" e todas as notas lançadas para ela serão removidas permanentemente. Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await onDelete(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}
