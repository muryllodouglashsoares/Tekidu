import { useEffect, useState } from "react";
import { CalendarCheck, FileQuestion, UserX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";
import { useOwnStudent } from "@/hooks/useOwnStudent";
import {
  getStudentAttendanceOverview,
  type StudentAttendanceOverview,
} from "@/services/attendance/studentAttendanceOverviewService";
import { describeFirebaseError } from "@/utils/firebaseError";

/**
 * "Minha Frequência" (seção 10 do plano multi-role): percentual geral,
 * presenças/faltas/total e detalhamento por disciplina — tudo a partir
 * de `attendanceRecords` do PRÓPRIO aluno (ver
 * `studentAttendanceOverviewService`, que reaproveita a mesma consulta
 * por contexto já usada pelo Boletim, só expondo os totais brutos que
 * faltavam).
 */
export function MyAttendancePage() {
  const { student, loading: loadingStudent, error: studentError, reload: loadStudent } =
    useOwnStudent("minha-frequencia:aluno");

  const [overview, setOverview] = useState<StudentAttendanceOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schoolYear = new Date().getFullYear();

  async function load() {
    if (!student?.classId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentAttendanceOverview(student.id, student.classId, schoolYear);
      setOverview(data);
    } catch (err) {
      setError(describeFirebaseError(err, "minha-frequencia:carregar"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (student?.classId) load();
    else setOverview(null);
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

  if (!overview || overview.overallTotal === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="Nenhum registro de frequência ainda"
        description="Sua frequência aparecerá aqui quando os professores começarem a registrar as aulas."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Frequência geral</p>
          <p className="font-display text-3xl font-bold text-ink900">{overview.overallRate ?? "—"}%</p>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-ink-400">Presenças</p>
            <p className="font-display text-lg font-semibold text-ink900">{overview.overallPresent}</p>
          </div>
          <div>
            <p className="text-xs text-ink-400">Faltas</p>
            <p className="font-display text-lg font-semibold text-ink900">{overview.overallAbsent}</p>
          </div>
          <div>
            <p className="text-xs text-ink-400">Aulas</p>
            <p className="font-display text-lg font-semibold text-ink900">{overview.overallTotal}</p>
          </div>
        </div>
        <AttendanceStatusBadge status={overview.overallStatus} />
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3.5">
          <p className="font-medium text-ink900">Frequência por disciplina</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                <th className="px-4 py-3">Disciplina</th>
                <th className="px-4 py-3">Presenças</th>
                <th className="px-4 py-3">Faltas</th>
                <th className="px-4 py-3">Aulas</th>
                <th className="px-4 py-3">Frequência</th>
                <th className="px-4 py-3">Situação</th>
              </tr>
            </thead>
            <tbody>
              {overview.disciplines.map((row) => (
                <tr key={row.discipline.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink900">{row.discipline.name}</td>
                  <td className="px-4 py-3 text-ink-600">{row.present}</td>
                  <td className="px-4 py-3 text-ink-600">{row.absent}</td>
                  <td className="px-4 py-3 text-ink-600">{row.total}</td>
                  <td className="px-4 py-3 text-ink-600">{row.rate === null ? "—" : `${row.rate}%`}</td>
                  <td className="px-4 py-3">
                    <AttendanceStatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
