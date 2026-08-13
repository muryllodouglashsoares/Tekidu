import { useState } from "react";
import { Check, X } from "lucide-react";
import type { Student } from "@/types/student";
import type { AttendanceRecordStatus } from "@/types/attendance";

interface AttendanceRegisterListProps {
  students: Student[];
  /** studentId -> status atualmente lançado nesta aula (undefined = ainda não lançado) */
  statusByStudent: Record<string, AttendanceRecordStatus | undefined>;
  canEdit: boolean;
  onMark: (studentId: string, status: AttendanceRecordStatus) => Promise<void>;
}

/**
 * Lista de lançamento de presença (seção 9 do briefing): para cada
 * aluno, dois botões grandes "Presente"/"Ausente" — pensada para
 * registrar vários alunos consecutivamente com o mínimo de cliques.
 * Não reaproveita a edição em célula de tabela de `GradesTable` de
 * propósito: aqui o valor é categórico (2 estados), não numérico, então
 * um par de botões com feedback visual imediato é mais rápido de usar
 * do que abrir um campo de edição por aluno.
 */
export function AttendanceRegisterList({
  students,
  statusByStudent,
  canEdit,
  onMark,
}: AttendanceRegisterListProps) {
  const [savingId, setSavingId] = useState<string | null>(null);

  if (students.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-ink-500">
        Nenhum aluno vinculado a esta turma.
      </div>
    );
  }

  async function handleMark(studentId: string, status: AttendanceRecordStatus) {
    if (!canEdit) return;
    setSavingId(studentId);
    try {
      await onMark(studentId, status);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <ul className="flex flex-col">
      {students.map((student) => {
        const current = statusByStudent[student.id];
        const isSaving = savingId === student.id;

        return (
          <li
            key={student.id}
            className="flex flex-col gap-3 border-b border-line px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                {student.name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join("")}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-ink900">{student.name}</p>
                <p className="truncate text-xs text-ink-500">{student.registrationNumber}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2" role="group" aria-label={`Presença de ${student.name}`}>
              <button
                type="button"
                aria-pressed={current === "present"}
                disabled={!canEdit || isSaving}
                onClick={() => handleMark(student.id, "present")}
                className={`inline-flex items-center gap-1.5 rounded-card border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  current === "present"
                    ? "border-success bg-success/10 text-success"
                    : "border-line text-ink-600 hover:bg-ink-50"
                }`}
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Presente
              </button>
              <button
                type="button"
                aria-pressed={current === "absent"}
                disabled={!canEdit || isSaving}
                onClick={() => handleMark(student.id, "absent")}
                className={`inline-flex items-center gap-1.5 rounded-card border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  current === "absent"
                    ? "border-danger bg-danger/10 text-danger"
                    : "border-line text-ink-600 hover:bg-ink-50"
                }`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Ausente
              </button>
              {isSaving && (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-ink-600"
                  aria-hidden="true"
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
