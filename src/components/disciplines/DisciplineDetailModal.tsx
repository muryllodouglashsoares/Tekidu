import { useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { ClassShiftBadge } from "@/components/classes/ClassShiftBadge";
import { DisciplineStatusBadge } from "@/components/disciplines/DisciplineStatusBadge";
import {
  getClassesByIds,
  getStudentCountForClasses,
} from "@/services/disciplines/disciplineService";
import { getStudentCountsByClassId } from "@/services/classes/classService";
import type { Discipline } from "@/types/discipline";
import type { SchoolClass } from "@/types/schoolClass";

interface DisciplineDetailModalProps {
  discipline: Discipline;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
}

/**
 * Detalhe de uma disciplina: dados gerais + turmas vinculadas (via
 * `classIds`) + quantidade de alunos derivada dessas turmas. Não
 * implementa ainda notas/frequência/boletim — apenas prepara a
 * arquitetura (relação disciplina → turmas → alunos) para essas fases
 * futuras.
 */
export function DisciplineDetailModal({
  discipline,
  canManage,
  onClose,
  onEdit,
}: DisciplineDetailModalProps) {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const classesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const resolvedClasses = await getClassesByIds(discipline.classIds);
        const [counts, total] = await Promise.all([
          getStudentCountsByClassId(),
          getStudentCountForClasses(resolvedClasses),
        ]);
        if (!cancelled) {
          setClasses(resolvedClasses);
          setStudentCounts(counts);
          setTotalStudents(total);
        }
      } catch {
        if (!cancelled) setError("Não foi possível carregar as turmas desta disciplina.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [discipline.classIds]);

  return (
    <Modal title={discipline.name} onClose={onClose}>
      <p className="-mt-3 mb-4 font-mono text-xs text-ink-400">{discipline.code}</p>

      <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-400">Professor</p>
          <p className="text-ink900">{discipline.teacherName || "Não definido"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-400">Carga horária</p>
          <p className="text-ink900">{discipline.workload}h</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-400">Ano letivo</p>
          <p className="text-ink900">{discipline.schoolYear}</p>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-ink-400">Status</p>
          <DisciplineStatusBadge status={discipline.status} />
        </div>
      </div>

      {!loading && !error && (
        <button
          type="button"
          onClick={() => classesRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="mb-5 flex w-full items-center justify-between rounded-card border border-line bg-ink-50 px-3.5 py-3 text-left transition-colors hover:bg-ink-100"
        >
          <span className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-ink-600" />
            <span className="text-sm text-ink-700">
              <span className="font-semibold text-ink900">{totalStudents}</span> aluno
              {totalStudents === 1 ? "" : "s"} envolvido{totalStudents === 1 ? "" : "s"}
            </span>
          </span>
          <span className="text-xs font-medium text-ink-600">Ver turmas →</span>
        </button>
      )}

      <div ref={classesRef} className="mb-2 text-sm font-medium text-ink-700">
        Turmas vinculadas ({discipline.classIds.length})
      </div>

      {loading ? (
        <Spinner label="Carregando turmas..." />
      ) : error ? (
        <p className="py-4 text-center text-sm text-danger">{error}</p>
      ) : classes.length === 0 ? (
        <p className="rounded-card border border-line bg-paper px-3.5 py-4 text-center text-sm text-ink-500">
          Nenhuma turma vinculada a esta disciplina ainda.
        </p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {classes.map((schoolClass) => {
            const count = studentCounts[schoolClass.id] ?? 0;
            return (
              <li
                key={schoolClass.id}
                className="flex items-center justify-between gap-3 rounded-card border border-line px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink900">{schoolClass.name}</p>
                  <p className="truncate text-xs text-ink-400">
                    {schoolClass.grade} · {count} aluno{count === 1 ? "" : "s"}
                  </p>
                </div>
                <ClassShiftBadge shift={schoolClass.shift} />
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
        {canManage && <Button onClick={onEdit}>Editar</Button>}
      </div>
    </Modal>
  );
}
