import { useEffect, useState } from "react";
import { CalendarCheck, FileQuestion, UserX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { AttendanceOverviewPanel } from "@/components/attendance/AttendanceOverviewPanel";
import { ChildSelect } from "@/components/guardian/ChildSelect";
import { useGuardianChildren } from "@/hooks/useGuardianChildren";
import {
  getStudentAttendanceOverview,
  type StudentAttendanceOverview,
} from "@/services/attendance/studentAttendanceOverviewService";
import { describeFirebaseError } from "@/utils/firebaseError";

/**
 * Portal do Responsável — "Frequência do filho" (Fase 3 do plano de
 * evolução). Mesma estrutura de `MyAttendancePage` (Portal do Aluno):
 * reaproveita `studentAttendanceOverviewService.getStudentAttendanceOverview`
 * e o painel de apresentação `AttendanceOverviewPanel` — a única
 * diferença é a resolução de QUAL aluno (`useGuardianChildren` +
 * `ChildSelect`, em vez de `useOwnStudent`). Somente leitura.
 */
export function GuardianAttendancePage() {
  const { children, loading: loadingChildren, error: childrenError, reload: loadChildren } =
    useGuardianChildren("portal-responsavel:frequencia:filhos");

  const [selectedId, setSelectedId] = useState<string>("");
  const [overview, setOverview] = useState<StudentAttendanceOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schoolYear = new Date().getFullYear();
  const student = children?.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!children || children.length === 0) return;
    if (!children.some((c) => c.id === selectedId)) setSelectedId(children[0].id);
  }, [children, selectedId]);

  async function load() {
    if (!student?.classId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentAttendanceOverview(student.id, student.classId, schoolYear);
      setOverview(data);
    } catch (err) {
      setError(describeFirebaseError(err, "portal-responsavel:frequencia"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (student?.classId) load();
    else setOverview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id, student?.classId]);

  if (loadingChildren) {
    return (
      <Card>
        <TableSkeleton columns={4} />
      </Card>
    );
  }

  if (childrenError) {
    return (
      <Card>
        <ErrorState message={childrenError} onRetry={loadChildren} />
      </Card>
    );
  }

  if (!children || children.length === 0) {
    return (
      <EmptyState
        icon={UserX}
        title="Nenhum filho vinculado"
        description="Sua conta ainda não está vinculada a nenhum aluno. Fale com a secretaria da escola."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="hidden font-display text-xl font-semibold text-ink900 md:block">Frequência</h2>
          <p className="text-sm text-ink-500">Acompanhe a frequência do seu filho(a)</p>
        </div>
        <ChildSelect childrenList={children} selectedId={selectedId} onChange={setSelectedId} />
      </div>

      {!student?.classId ? (
        <EmptyState
          icon={FileQuestion}
          title="Sem turma vinculada"
          description="Este aluno ainda não está matriculado em nenhuma turma neste ano letivo."
        />
      ) : loading ? (
        <Card>
          <TableSkeleton columns={4} />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : !overview || overview.overallTotal === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Nenhum registro de frequência ainda"
          description="A frequência deste aluno aparecerá aqui quando os professores começarem a registrar as aulas."
        />
      ) : (
        <AttendanceOverviewPanel overview={overview} />
      )}
    </div>
  );
}
