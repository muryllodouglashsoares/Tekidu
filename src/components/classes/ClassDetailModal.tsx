import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { ClassShiftBadge } from "@/components/classes/ClassShiftBadge";
import { ClassStatusBadge } from "@/components/classes/ClassStatusBadge";
import { StudentStatusBadge } from "@/components/students/StudentStatusBadge";
import { getStudentsByClassId } from "@/services/classes/classService";
import type { SchoolClass } from "@/types/schoolClass";
import type { Student } from "@/types/student";

interface ClassDetailModalProps {
  schoolClass: SchoolClass;
  onClose: () => void;
}

/**
 * Detalhe de uma turma: dados gerais + lista de alunos vinculados
 * (via `students.classId`). Serve também de base para as próximas
 * funcionalidades relacionadas a alunos dentro da turma (notas,
 * frequência), que ainda não fazem parte desta fase.
 */
export function ClassDetailModal({ schoolClass, onClose }: ClassDetailModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getStudentsByClassId(schoolClass.id);
        if (!cancelled) setStudents(data);
      } catch {
        if (!cancelled) setError("Não foi possível carregar os alunos desta turma.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolClass.id]);

  return (
    <Modal title={schoolClass.name} onClose={onClose}>
      <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-400">Série</p>
          <p className="text-ink900">{schoolClass.grade}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-400">Ano letivo</p>
          <p className="text-ink900">{schoolClass.schoolYear}</p>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-ink-400">Turno</p>
          <ClassShiftBadge shift={schoolClass.shift} />
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-ink-400">Status</p>
          <ClassStatusBadge status={schoolClass.status} />
        </div>
      </div>

      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-700">
        <Users className="h-4 w-4" />
        Alunos ({students.length})
      </div>

      {loading ? (
        <Spinner label="Carregando alunos..." />
      ) : error ? (
        <p className="py-4 text-center text-sm text-danger">{error}</p>
      ) : students.length === 0 ? (
        <p className="rounded-card border border-line bg-paper px-3.5 py-4 text-center text-sm text-ink-500">
          Nenhum aluno vinculado a esta turma ainda.
        </p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {students.map((student) => (
            <li
              key={student.id}
              className="flex items-center justify-between gap-3 rounded-card border border-line px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink900">{student.name}</p>
                <p className="truncate text-xs text-ink-400">{student.email}</p>
              </div>
              <StudentStatusBadge status={student.status} />
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
