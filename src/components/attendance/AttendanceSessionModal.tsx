import { useState, type FormEvent } from "react";
import { Plus, Trash2, CalendarDays } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { AttendanceSession } from "@/types/attendance";

interface AttendanceSessionModalProps {
  disciplineName: string;
  className: string;
  sessions: AttendanceSession[];
  onClose: () => void;
  onCreate: (date: string) => Promise<void>;
  onDelete: (sessionId: string) => Promise<void>;
  onSelect: (sessionId: string) => void;
}

/**
 * Gerencia as aulas (datas) do contexto atualmente selecionado na tela
 * de Frequência — mesmo papel de `AssessmentManagerModal` em Notas, só
 * que cadastrando uma data em vez de um nome de avaliação. Reaproveita
 * `Modal`/`Input`/`Button`/`ConfirmDialog` do design system em vez de
 * criar um novo padrão de formulário/confirmação.
 */
export function AttendanceSessionModal({
  disciplineName,
  className,
  sessions,
  onClose,
  onCreate,
  onDelete,
  onSelect,
}: AttendanceSessionModalProps) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AttendanceSession | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!date) {
      setError("Informe a data da aula.");
      return;
    }
    if (sessions.some((s) => s.date === date)) {
      setError("Já existe uma aula registrada nesta data. Selecione-a na lista abaixo para editar.");
      return;
    }

    setSaving(true);
    try {
      await onCreate(date);
    } catch {
      setError("Não foi possível criar a aula. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const orderedSessions = [...sessions].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <Modal title="Aulas" onClose={onClose}>
        <p className="mb-4 text-sm text-ink-500">
          {disciplineName} · {className}
        </p>

        <form onSubmit={handleSubmit} className="mb-5 flex items-end gap-2" noValidate>
          <div className="flex-1">
            <Input
              label="Nova aula"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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

        {orderedSessions.length === 0 ? (
          <p className="rounded-card bg-ink-50 px-3.5 py-3 text-sm text-ink-500">
            Nenhuma aula cadastrada para este bimestre ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {orderedSessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between gap-2 rounded-card border border-line px-3.5 py-2.5"
              >
                <button
                  type="button"
                  onClick={() => onSelect(session.id)}
                  className="flex flex-1 items-center gap-2 text-left text-sm text-ink900"
                >
                  <CalendarDays className="h-4 w-4 text-ink-300" aria-hidden="true" />
                  <span>
                    {session.label} — {formatDate(session.date)}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Excluir ${session.label}`}
                  className="rounded-card p-1.5 text-ink-400 hover:bg-danger/10 hover:text-danger"
                  onClick={() => setDeleting(session)}
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
          title="Excluir aula"
          description={`A aula "${deleting.label}" (${formatDate(deleting.date)}) e todos os registros de presença lançados para ela serão removidos permanentemente. Essa ação não pode ser desfeita.`}
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

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}
