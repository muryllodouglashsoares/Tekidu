import { useState, type FormEvent } from "react";
import { Plus, Trash2, GripVertical, Pencil, X, CornerDownRight, RotateCcw } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  effectiveMaxScore,
  effectiveWeight,
  effectiveAssessmentKind,
  getDependentAssessments,
  groupAssessments,
  type Assessment,
  type AssessmentKind,
} from "@/types/assessment";

/** Payload editável de uma avaliação nesta modal (item 4 do plano V8 — "Avaliações mais completas"). */
export interface AssessmentFormValues {
  name: string;
  weight: number;
  maxScore: number;
}

/** Identifica a avaliação regular de origem quando o formulário está criando uma recuperação ou segunda chamada (item 13/14/15 do briefing de Recuperações). */
export interface SpecialAssessmentTarget {
  kind: Extract<AssessmentKind, "recovery" | "second_call">;
  parentAssessmentId: string;
}

interface AssessmentManagerModalProps {
  disciplineName: string;
  className: string;
  assessments: Assessment[];
  onClose: () => void;
  onCreate: (values: AssessmentFormValues, order: number, special?: SpecialAssessmentTarget) => Promise<void>;
  onUpdate: (assessmentId: string, values: AssessmentFormValues) => Promise<void>;
  onDelete: (assessmentId: string) => Promise<void>;
}

const emptyForm: AssessmentFormValues = { name: "", weight: 1, maxScore: 10 };

const SPECIAL_LABEL: Record<SpecialAssessmentTarget["kind"], string> = {
  second_call: "Segunda chamada",
  recovery: "Recuperação",
};

/**
 * Permite cadastrar/editar/remover avaliações (Prova 1, Trabalho, etc.)
 * do contexto atualmente selecionado na tela de Notas — inclui peso e
 * valor máximo (item 4 do plano V8), preparando a base para média
 * ponderada (`calculateWeightedAverage`, types/grade.ts) sem obrigar o
 * usuário a preencher nada além do nome quando peso/valor padrão (1 e
 * 10) já servem. Não reaproveita `Select`/`ConfirmDialog` para exclusão
 * de forma redundante — usa o `ConfirmDialog` já existente no design
 * system em vez de criar um novo padrão de confirmação.
 *
 * RECUPERAÇÕES E SEGUNDA CHAMADA: cada avaliação regular ganha duas
 * ações extras ("Criar segunda chamada"/"Criar recuperação" — item 13
 * do briefing) que reabrem o MESMO formulário acima, pré-preenchido e
 * com um selo indicando a avaliação de origem (item 14/15) — nenhum
 * formulário novo é criado. A lista passa a ser agrupada
 * hierarquicamente (item 37: "Prova 1 ↳ Segunda chamada ↳
 * Recuperação"), reaproveitando `groupAssessments` (types/assessment.ts,
 * mesma função usada por `GradesTable`).
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
  const [specialTarget, setSpecialTarget] = useState<{ kind: SpecialAssessmentTarget["kind"]; parent: Assessment } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Assessment | null>(null);

  function startEdit(assessment: Assessment) {
    setEditingId(assessment.id);
    setSpecialTarget(null);
    setForm({ name: assessment.name, weight: effectiveWeight(assessment), maxScore: effectiveMaxScore(assessment) });
    setError(null);
  }

  function startSpecial(kind: SpecialAssessmentTarget["kind"], parent: Assessment) {
    setEditingId(null);
    setSpecialTarget({ kind, parent });
    setForm({
      name: `${SPECIAL_LABEL[kind]} — ${parent.name}`,
      weight: effectiveWeight(parent),
      maxScore: effectiveMaxScore(parent),
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setSpecialTarget(null);
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
        await onCreate(
          values,
          nextOrder,
          specialTarget ? { kind: specialTarget.kind, parentAssessmentId: specialTarget.parent.id } : undefined
        );
      }
      cancelEdit();
    } catch (err) {
      // Erros de validação de vínculo pai/filho (`assessmentService`)
      // já vêm com mensagem amigável — reaproveita quando disponível,
      // em vez de sempre mostrar o texto genérico.
      const message = err instanceof Error && err.message ? err.message : undefined;
      setError(
        message ??
          (editingId
            ? "Não foi possível salvar as alterações. Tente novamente."
            : "Não foi possível criar a avaliação. Tente novamente.")
      );
    } finally {
      setSaving(false);
    }
  }

  const groups = groupAssessments(assessments);

  function deleteDialogDescription(assessment: Assessment): string {
    const kind = effectiveAssessmentKind(assessment);
    if (kind === "second_call") {
      return `A avaliação de segunda chamada "${assessment.name}" e as notas lançadas nela serão removidas permanentemente. A avaliação original permanecerá intacta. Essa ação não pode ser desfeita.`;
    }
    if (kind === "recovery") {
      return `A avaliação de recuperação "${assessment.name}" e as notas lançadas nela serão removidas permanentemente. A nota original dos alunos não será alterada. Essa ação não pode ser desfeita.`;
    }
    return `A avaliação "${assessment.name}" e todas as notas lançadas para ela serão removidas permanentemente. Essa ação não pode ser desfeita.`;
  }

  return (
    <>
      <Modal title="Avaliações" onClose={onClose}>
        <p className="mb-4 text-sm text-ink-500">
          {disciplineName} · {className}
        </p>

        <form onSubmit={handleSubmit} className="mb-5 flex flex-col gap-2 rounded-card border border-line p-3" noValidate>
          {specialTarget && (
            <div className="flex items-center justify-between gap-2 rounded-card bg-honors-50 px-3 py-2 text-xs text-honors-600">
              <span>
                {SPECIAL_LABEL[specialTarget.kind]} de: <strong>{specialTarget.parent.name}</strong>
              </span>
              <button
                type="button"
                aria-label="Cancelar criação de avaliação especial"
                onClick={cancelEdit}
                className="rounded-card p-1 hover:bg-honors-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label={editingId ? "Editar avaliação" : specialTarget ? `Nova ${SPECIAL_LABEL[specialTarget.kind].toLowerCase()}` : "Nova avaliação"}
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
            {(editingId || specialTarget) && (
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

        {groups.length === 0 ? (
          <p className="rounded-card bg-ink-50 px-3.5 py-3 text-sm text-ink-500">
            Nenhuma avaliação cadastrada para este bimestre ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {groups.map(({ regular, secondCall, recoveries }) => {
              const dependents = getDependentAssessments(assessments, regular.id);
              return (
                <li key={regular.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 rounded-card border border-line px-3.5 py-2.5">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-ink900">
                      <GripVertical className="h-4 w-4 shrink-0 text-ink-300" aria-hidden="true" />
                      <span className="truncate">{regular.name}</span>
                      <span className="shrink-0 text-xs text-ink-400">
                        · peso {effectiveWeight(regular)} · máx. {effectiveMaxScore(regular)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {!secondCall && (
                        <button
                          type="button"
                          aria-label={`Criar segunda chamada de ${regular.name}`}
                          title="Criar segunda chamada"
                          className="rounded-card p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink900"
                          onClick={() => startSpecial("second_call", regular)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Criar recuperação de ${regular.name}`}
                        title="Criar recuperação"
                        className="rounded-card p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink900"
                        onClick={() => startSpecial("recovery", regular)}
                      >
                        <CornerDownRight className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Editar ${regular.name}`}
                        className="rounded-card p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink900"
                        onClick={() => startEdit(regular)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Excluir ${regular.name}`}
                        title={dependents.length > 0 ? "Exclua a segunda chamada/recuperação vinculada primeiro" : undefined}
                        disabled={dependents.length > 0}
                        className="rounded-card p-1.5 text-ink-400 hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-400"
                        onClick={() => setDeleting(regular)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  </div>

                  {[...(secondCall ? [secondCall] : []), ...recoveries].map((special) => (
                    <div
                      key={special.id}
                      className="ml-5 flex items-center justify-between gap-2 rounded-card border border-dashed border-line px-3.5 py-2 text-xs"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-ink-600">
                        <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-ink-300" aria-hidden="true" />
                        <span className="truncate">{special.name}</span>
                        <span className="shrink-0 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-500">
                          {effectiveAssessmentKind(special) === "second_call" ? "Segunda chamada" : "Recuperação"}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Editar ${special.name}`}
                          className="rounded-card p-1 text-ink-400 hover:bg-ink-50 hover:text-ink900"
                          onClick={() => startEdit(special)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Excluir ${special.name}`}
                          className="rounded-card p-1 text-ink-400 hover:bg-danger/10 hover:text-danger"
                          onClick={() => setDeleting(special)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </div>
                  ))}
                </li>
              );
            })}
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
          title={
            effectiveAssessmentKind(deleting) === "second_call"
              ? "Excluir segunda chamada"
              : effectiveAssessmentKind(deleting) === "recovery"
                ? "Excluir recuperação"
                : "Excluir avaliação"
          }
          description={deleteDialogDescription(deleting)}
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
