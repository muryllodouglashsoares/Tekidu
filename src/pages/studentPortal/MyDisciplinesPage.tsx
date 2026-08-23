import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, FileQuestion, UserX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { SituationBadge } from "@/components/notes/SituationBadge";
import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";
import { useOwnStudent } from "@/hooks/useOwnStudent";
import { getStudentBoletim, type StudentBoletim } from "@/services/boletim/boletimService";
import { describeFirebaseError } from "@/utils/firebaseError";

/**
 * "Minhas Disciplinas" (seção 9 do plano multi-role) — um cartão por
 * disciplina da turma do aluno, com média/frequência/situação.
 *
 * Reaproveita `boletimService.getStudentBoletim` (período "annual") —
 * a MESMA fonte de "Meu Boletim" — em vez de recalcular; a única
 * diferença de apresentação é "um cartão por disciplina" em vez de
 * "uma tabela com todas juntas".
 *
 * NÃO lista as avaliações individuais ("Prova 1", "Trabalho"...): a
 * Security Rule de `assessments` só libera leitura para staff
 * (`isActiveStaff()` — ver firestore.rules), então o aluno não pode
 * consultar essa coleção. Em vez de inventar nomes de avaliação, o
 * cartão mostra a quantidade de notas já lançadas (dado real, vindo de
 * `grades`, que o aluno PODE ler das suas próprias — ver
 * `isOwnStudentRecord`).
 */
export function MyDisciplinesPage() {
  const { student, loading: loadingStudent, error: studentError, reload: loadStudent } =
    useOwnStudent("minhas-disciplinas:aluno");
  const navigate = useNavigate();

  const [boletim, setBoletim] = useState<StudentBoletim | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schoolYear = new Date().getFullYear();

  async function load() {
    if (!student?.classId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentBoletim(student.id, student.classId, schoolYear, "annual");
      setBoletim(data);
    } catch (err) {
      setError(describeFirebaseError(err, "minhas-disciplinas:carregar"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (student?.classId) load();
    else setBoletim(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id, student?.classId]);

  if (loadingStudent) {
    return (
      <Card>
        <TableSkeleton columns={4} />
      </Card>
    );
  }

  if (studentError) {
    return (
      <Card>
        <ErrorState message={studentError} onRetry={loadStudent} />
      </Card>
    );
  }

  if (!student) {
    return (
      <EmptyState
        icon={UserX}
        title="Cadastro não encontrado"
        description="Sua conta ainda não está vinculada a nenhum registro acadêmico. Fale com a secretaria da escola."
      />
    );
  }

  if (!student.classId) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="Sem turma vinculada"
        description="Você ainda não está matriculado em nenhuma turma neste ano letivo."
      />
    );
  }

  if (loading) {
    return (
      <Card>
        <TableSkeleton columns={4} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={load} />
      </Card>
    );
  }

  if (!boletim || boletim.disciplines.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Nenhuma disciplina ainda"
        description="Suas disciplinas aparecerão aqui quando forem vinculadas à sua turma."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {boletim.disciplines.map((row) => (
        <Card key={row.discipline.id} className="p-5 flex flex-col gap-4">
          <p className="font-display font-semibold text-ink900">{row.discipline.name}</p>

          <div className="grid grid-cols-2 gap-3 rounded-card bg-paper border border-line p-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Média</p>
              {row.average === null ? (
                <p className="text-sm text-ink-400">Sem notas</p>
              ) : (
                <p className="font-display text-lg font-bold text-ink900">{row.average.toFixed(1)}</p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Frequência</p>
              {row.attendanceRate === null ? (
                <p className="text-sm text-ink-400">Sem registros</p>
              ) : (
                <p className="font-display text-lg font-bold text-ink900">{row.attendanceRate}%</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <SituationBadge situation={row.situation} />
            <AttendanceStatusBadge status={row.attendanceStatus} />
          </div>

          <button
            onClick={() => navigate("/meu-boletim")}
            className="mt-auto pt-2 border-t border-line text-xs font-medium text-ink-600 hover:text-ink-900 text-left"
          >
            Ver detalhes no boletim →
          </button>
        </Card>
      ))}
    </div>
  );
}
