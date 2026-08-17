import { useState, type FormEvent } from "react";
import { Plus, Trash2, GripVertical, Pencil, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { effectiveMaxScore, effectiveWeight, type Assessment } from "@/types/assessment";

/** Payload editável de uma avaliação nesta modal (item 4 do plano V8 — "Avaliações mais completas"). */
export interface AssessmentFormValues {
  name: string;
  weight: number;
  maxScore: number;
}

interface AssessmentManagerModalProps {
  disciplineName: string;
  className: string;
  assessments: Assessment[];
  onClose: () => void;
  onCreate: (values: AssessmentFormValues, order: number) => Promise<void>;
  onUpdate: (assessmentId: string, values: AssessmentFormValues) => Promise<void>;
  onDelete: (assessmentId: string) => Promise<void>;
}

const emptyForm: AssessmentFormValues = { name: "", weight: 1, maxScore: 10 };

/**
 * Permite cadastrar/editar/remover avaliações (Prova 1, Trabalho, etc.)
 * do contexto atualmente selecionado na tela de Notas — inclui peso e
 * valor máximo (item 4 do plano V8), preparando a base para média
 * ponderada (`calculateWeightedAverage`, types/grade.ts) sem obrigar o
 * usuário a preencher nada além do nome quando peso/valor padrão (1 e
 * 10) já servem. Não reaproveita `Select`/`ConfirmDialog` para exclusão
 * de forma redundante — usa o `ConfirmDialog` já existente no design
 * system em vez de criar um novo padrão de confirmação.
 */
export function AssessmentManagerModal({
  disciplineName,
  className,
  assessments,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: AssessmentManagerModalProps) {
  const [form, setForm] = useState<AssessmentFormValues>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Assessment | null>(null);

  function startEdit(assessment: Assessment) {
    setEditingId(assessment.id);
    setForm({ name: assessment.name, weight: effectiveWeight(assessment), maxScore: effectiveMaxScore(assessment) });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError("Informe o nome da avaliação.");
      return;
    }
    if (
      assessments.some(
        (a) => a.id !== editingId && a.name.trim().toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setError("Já existe uma avaliação com esse nome neste contexto.");
      return;
    }
    if (form.weight <= 0) {
      setError("O peso deve ser maior que zero.");
      return;
    }
    if (form.maxScore <= 0) {
      setError("O valor máximo deve ser maior que zero.");
      return;
    }

    setSaving(true);
    try {
      const values: AssessmentFormValues = { name: trimmedName, weight: form.weight, maxScore: form.maxScore };
      if (editingId) {
        await onUpdate(editingId, values);
      } else {
        const nextOrder = assessments.length > 0 ? Math.max(...assessments.map((a) => a.order)) + 1 : 0;
        await onCreate(values, nextOrder);
      }
      cancelEdit();
    } catch {
      setError(editingId ? "Não foi possível salvar as alterações. Tente novamente." : "Não foi possível criar a avaliação. Tente novamente.");
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

        <form onSubmit={handleSubmit} className="mb-5 flex flex-col gap-2 rounded-card border border-line p-3" noValidate>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label={editingId ? "Editar avaliação" : "Nova avaliação"}
                placeholder="Ex.: Prova 1, Trabalho, Projeto..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="w-20">
              <Input
                label="Peso"
                type="number"
                min={0.1}
                step={0.1}
                value={form.weight}
                onChange={(e) => setForm((f) => ({ ...f, weight: Number(e.target.value) }))}
              />
            </div>
            <div className="w-20">
              <Input
                label="Valor máx."
                type="number"
                min={1}
                step={0.5}
                value={form.maxScore}
                onChange={(e) => setForm((f) => ({ ...f, maxScore: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            {editingId && (
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                <X className="h-4 w-4" />
                Cancelar
              </Button>
            )}
            <Button type="submit" loading={saving}>
              {editingId ? "Salvar alterações" : (
                <>
                  <Plus className="h-4 w-4" />
                  Adicionar
                </>
              )}
            </Button>
          </div>
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
                    <span className="text-xs text-ink-400">
                      · peso {effectiveWeight(assessment)} · máx. {effectiveMaxScore(assessment)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Editar ${assessment.name}`}
                      className="rounded-card p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink900"
                      onClick={() => startEdit(assessment)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Excluir ${assessment.name}`}
                      className="rounded-card p-1.5 text-ink-400 hover:bg-danger/10 hover:text-danger"
                      onClick={() => setDeleting(assessment)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
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
