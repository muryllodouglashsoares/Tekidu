import { useEffect, useState } from "react";
import { CalendarCheck, FileQuestion, UserX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { AttendanceOverviewPanel } from "@/components/attendance/AttendanceOverviewPanel";
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
 *
 * A apresentação (cards de resumo + tabela por disciplina) foi
 * extraída para `AttendanceOverviewPanel` na Fase 3 do plano de
 * evolução (Portal do Responsável), que reaproveita a mesma marcação
 * para o filho selecionado — esta página cuida só de RESOLVER qual
 * aluno (o próprio, via `useOwnStudent`) e dos estados de
 * loading/erro/vazio em torno do painel.
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

  return <AttendanceOverviewPanel overview={overview} />;
}

