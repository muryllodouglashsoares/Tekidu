import { useEffect, useMemo, useState } from "react";
import { FileText, Image as ImageIcon, Inbox } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { AbsenceJustificationStatusBadge } from "@/components/justifications/AbsenceJustificationStatusBadge";
import { AbsenceJustificationReviewDialog } from "@/components/justifications/AbsenceJustificationReviewDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getDisciplines } from "@/services/disciplines/disciplineService";
import { getClasses } from "@/services/classes/classService";
import { getStudents } from "@/services/students/studentService";
import {
  getAbsenceJustificationsByDisciplineIds,
  getAllAbsenceJustifications,
} from "@/services/justifications/absenceJustificationService";
import { isJustificationExpired } from "@/types/absenceJustification";
import type { AbsenceJustification, AbsenceJustificationStatus } from "@/types/absenceJustification";
import { describeFirebaseError } from "@/utils/firebaseError";

const STATUS_TABS: Array<{ value: AbsenceJustificationStatus | "all"; label: string }> = [
  { value: "pending", label: "Em análise" },
  { value: "approved", label: "Aprovadas" },
  { value: "rejected", label: "Recusadas" },
  { value: "all", label: "Todas" },
];

function formatDate(isoDate: string): string {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

/**
 * Análise de Justificativas de Faltas (seção 16 do prompt) — staff.
 *
 * Admin enxerga TODAS as solicitações; professor só as das disciplinas
 * das quais é `teacherId` — mesmo padrão de "uma consulta por
 * disciplina" de `teacherOverviewService.getTeacherAssignments`, que é
 * o que permite a Security Rule (`isOwnDiscipline`) barrar de fato o
 * acesso a disciplinas de outros professores, não só escondê-las na UI.
 *
 * Sem paginação/filtros avançados (turma/período) nesta primeira
 * versão — a lista de pendentes já é o "inbox" que evita acúmulo
 * indefinido (seção 16: "a funcionalidade não deve ficar
 * permanentemente sem uma forma de análise").
 */
export function AbsenceJustificationsReviewPage() {
  const { profile } = useAuth();
  const { success: toastSuccess } = useToast();

  const [justifications, setJustifications] = useState<AbsenceJustification[]>([]);
  const [studentNameById, setStudentNameById] = useState<Map<string, string>>(new Map());
  const [studentUidById, setStudentUidById] = useState<Map<string, string>>(new Map());
  const [disciplineNameById, setDisciplineNameById] = useState<Map<string, string>>(new Map());
  const [classNameById, setClassNameById] = useState<Map<string, string>>(new Map());
  const [statusFilter, setStatusFilter] = useState<AbsenceJustificationStatus | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviewTarget, setReviewTarget] = useState<{
    justification: AbsenceJustification;
    decision: Extract<AbsenceJustificationStatus, "approved" | "rejected">;
  } | null>(null);

  async function load() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const [disciplines, classes, students] = await Promise.all([
        getDisciplines(),
        getClasses(),
        getStudents(),
      ]);
      setDisciplineNameById(new Map(disciplines.map((d) => [d.id, d.name])));
      setClassNameById(new Map(classes.map((c) => [c.id, c.name])));
      setStudentNameById(new Map(students.map((s) => [s.id, s.name])));
      setStudentUidById(new Map(students.filter((s) => s.uid).map((s) => [s.id, s.uid as string])));

      const status = statusFilter === "all" ? undefined : statusFilter;
      if (profile.role === "admin") {
        setJustifications(await getAllAbsenceJustifications(status));
      } else {
        const myDisciplineIds = disciplines.filter((d) => d.teacherId === profile.uid).map((d) => d.id);
        setJustifications(await getAbsenceJustificationsByDisciplineIds(myDisciplineIds, status));
      }
    } catch (err) {
      setError(describeFirebaseError(err, "justificativas-analise:carregar"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid, statusFilter]);

  const sortedJustifications = useMemo(
    () =>
      justifications
        .filter((j) => !isJustificationExpired(j))
        .sort((a, b) => b.absenceDate.localeCompare(a.absenceDate)),
    [justifications]
  );

  if (loading) {
    return (
      <Card>
        <TableSkeleton columns={5} />
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por status">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? "bg-ink900 text-white"
                : "bg-ink-50 text-ink-600 hover:bg-ink-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {sortedJustifications.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nenhuma solicitação por aqui"
          description="Quando um aluno enviar uma justificativa de falta, ela aparecerá nesta lista."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {sortedJustifications.map((justification) => {
            const DocumentIcon = justification.documentType === "pdf" ? FileText : ImageIcon;
            const studentUid = studentUidById.get(justification.studentId);
            return (
              <Card key={justification.id} className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-ink900">
                      {studentNameById.get(justification.studentId) ?? "Aluno"}
                    </p>
                    <p className="text-sm text-ink-500">
                      {disciplineNameById.get(justification.disciplineId) ?? "Disciplina"} ·{" "}
                      {classNameById.get(justification.classId) ?? "Turma"}
                    </p>
                    <p className="text-sm text-ink-500">
                      {formatDate(justification.absenceDate)}
                      {justification.sessionLabel ? ` · ${justification.sessionLabel}` : ""}
                    </p>
                  </div>
                  <AbsenceJustificationStatusBadge status={justification.status} />
                </div>

                <p className="text-sm text-ink-700">{justification.reason}</p>

                <a
                  href={justification.documentData}
                  download={justification.documentName}
                  className="inline-flex w-fit items-center gap-1.5 rounded-card bg-ink-50 px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-100"
                >
                  <DocumentIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  Baixar {justification.documentName}
                </a>

                {justification.reviewComment && (
                  <p className="rounded-card bg-ink-50 px-3 py-2 text-xs text-ink-600">
                    Observação da análise: {justification.reviewComment}
                  </p>
                )}

                {justification.status === "pending" && studentUid && (
                  <div className="flex flex-wrap justify-end gap-3">
                    <Button
                      variant="secondary"
                      className="!bg-danger/10 !text-danger hover:!bg-danger/20"
                      onClick={() => setReviewTarget({ justification, decision: "rejected" })}
                    >
                      Recusar
                    </Button>
                    <Button onClick={() => setReviewTarget({ justification, decision: "approved" })}>
                      Aprovar
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {reviewTarget && profile && (
        <AbsenceJustificationReviewDialog
          justification={reviewTarget.justification}
          studentUid={studentUidById.get(reviewTarget.justification.studentId) ?? ""}
          decision={reviewTarget.decision}
          reviewerUid={profile.uid}
          reviewerName={profile.name}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => {
            toastSuccess(
              reviewTarget.decision === "approved" ? "Justificativa aprovada." : "Justificativa recusada."
            );
            load();
          }}
        />
      )}
    </div>
  );
}
