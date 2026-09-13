import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileQuestion, PartyPopper, UserX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import {
  AbsenceJustificationCard,
  EligibleAbsenceCard,
} from "@/components/justifications/AbsenceJustificationCard";
import { AbsenceJustificationForm } from "@/components/justifications/AbsenceJustificationForm";
import { useOwnStudent } from "@/hooks/useOwnStudent";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getDisciplines } from "@/services/disciplines/disciplineService";
import { getRecordsByStudent } from "@/services/attendance/attendanceRecordService";
import { getMyAbsenceJustifications } from "@/services/justifications/absenceJustificationService";
import { buildAbsenceJustificationOverview } from "@/types/absenceJustification";
import type { AttendanceRecord } from "@/types/attendance";
import type { AbsenceJustification } from "@/types/absenceJustification";
import type { Discipline } from "@/types/discipline";
import { describeFirebaseError } from "@/utils/firebaseError";

/**
 * "Justificativas de Faltas" (Portal do Aluno).
 *
 * Cruza os PRÓPRIOS `attendanceRecords` (faltas) com as PRÓPRIAS
 * `absenceJustifications` — nunca busca dados de outro aluno; ambas as
 * consultas usadas aqui (`getRecordsByStudent`/
 * `getMyAbsenceJustifications`) filtram por `studentId` no servidor
 * (exigido pela Security Rule via `isOwnStudentRecord`), então mesmo
 * uma tentativa deliberada de manipular a UI não exporia falta de
 * outro aluno (ver `firestore.rules`).
 *
 * Nome da disciplina vem de `getDisciplines()` (coleção pequena,
 * legível pelo aluno — ver `firestore.rules`, `match /disciplines`).
 * NÃO exibe nome de turma: `classes` é ilegível pelo aluno na Security
 * Rule atual (só staff), mesmo comportamento já adotado por
 * `MyAttendancePage`/`MyDisciplinesPage`.
 */
export function MyAbsenceJustificationsPage() {
  const { student, loading: loadingStudent, error: studentError, reload: loadStudent } =
    useOwnStudent("justificativas:aluno");
  const { firebaseUser } = useAuth();
  const { success: toastSuccess } = useToast();

  const [absences, setAbsences] = useState<AttendanceRecord[]>([]);
  const [justifications, setJustifications] = useState<AbsenceJustification[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formRecord, setFormRecord] = useState<AttendanceRecord | null>(null);

  async function load() {
    if (!student) return;
    setLoading(true);
    setError(null);
    try {
      const [records, myJustifications, myDisciplines] = await Promise.all([
        getRecordsByStudent(student.id),
        getMyAbsenceJustifications(student.id),
        getDisciplines(),
      ]);
      setAbsences(records.filter((r) => r.status === "absent"));
      setJustifications(myJustifications);
      setDisciplines(myDisciplines);
    } catch (err) {
      setError(describeFirebaseError(err, "justificativas:carregar"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (student) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id]);

  const disciplineNameById = useMemo(
    () => new Map(disciplines.map((d) => [d.id, d.name])),
    [disciplines]
  );

  const overview = useMemo(
    () => buildAbsenceJustificationOverview(absences, justifications),
    [absences, justifications]
  );

  const pendingCount = justifications.filter((j) => j.status === "pending").length;
  const approvedCount = justifications.filter((j) => j.status === "approved").length;

  if (loadingStudent) {
    return (
      <Card>
        <TableSkeleton columns={3} />
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

  if (loading) {
    return (
      <Card>
        <TableSkeleton columns={3} />
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

  // Seção 3.2: nenhuma falta registrada em momento algum.
  if (absences.length === 0 && justifications.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Tudo certo por aqui!"
        description="Você não possui faltas registradas que necessitem de justificativa."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {(pendingCount > 0 || approvedCount > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Faltas pendentes</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink900">{overview.eligibleRecords.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Em análise</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink900">{pendingCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Aprovadas</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink900">{approvedCount}</p>
          </Card>
        </div>
      )}

      {overview.eligibleRecords.length === 0 ? (
        // Seção 3.3: todas as faltas já foram justificadas/estão em análise.
        <EmptyState
          icon={PartyPopper}
          title="Situação regular!"
          description="Não há faltas pendentes de justificativa no momento."
        />
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-base font-semibold text-ink900">
            Você possui faltas que podem ser justificadas
          </h2>
          {overview.eligibleRecords.map((record) => (
            <EligibleAbsenceCard
              key={record.id}
              record={record}
              disciplineName={disciplineNameById.get(record.disciplineId) ?? "Disciplina"}
              onRequest={() => setFormRecord(record)}
            />
          ))}
        </div>
      )}

      {overview.justifications.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-base font-semibold text-ink900">Minhas solicitações</h2>
          {overview.justifications.map((justification) => (
            <AbsenceJustificationCard
              key={justification.id}
              justification={justification}
              disciplineName={disciplineNameById.get(justification.disciplineId) ?? "Disciplina"}
            />
          ))}
        </div>
      )}

      {overview.eligibleRecords.length === 0 && overview.justifications.length === 0 && (
        <EmptyState
          icon={FileQuestion}
          title="Nenhuma solicitação ainda"
          description="Quando você solicitar uma justificativa, ela aparecerá aqui."
        />
      )}

      {formRecord && (
        <AbsenceJustificationForm
          attendanceRecord={formRecord}
          disciplineName={disciplineNameById.get(formRecord.disciplineId) ?? "Disciplina"}
          studentId={student.id}
          studentUid={firebaseUser?.uid ?? ""}
          onClose={() => setFormRecord(null)}
          onSuccess={() => {
            toastSuccess("Justificativa enviada e aguardando análise.");
            load();
          }}
        />
      )}
    </div>
  );
}
