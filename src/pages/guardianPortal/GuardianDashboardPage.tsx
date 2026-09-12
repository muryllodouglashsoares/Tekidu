import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BookOpen, CalendarCheck, CheckCircle2, UserX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { AcademicStatusBadge } from "@/components/boletim/AcademicStatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useGuardianChildren } from "@/hooks/useGuardianChildren";
import { getStudentBoletim, type StudentBoletim } from "@/services/boletim/boletimService";
import { describeFirebaseError } from "@/utils/firebaseError";
import type { Student } from "@/types/student";

interface ChildSummary {
  student: Student;
  boletim: StudentBoletim | null;
}

/**
 * Portal do Responsável — Dashboard (Fase 3 do plano de evolução).
 * Uma linha por filho vinculado, com média geral/frequência/situação —
 * os MESMOS três números que `StudentDashboard` (Portal do Aluno) já
 * mostra para o próprio aluno, aqui repetidos por filho, todos
 * derivados de `getStudentBoletim` (nenhum cálculo próprio).
 */
export function GuardianDashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { children, loading: loadingChildren, error: childrenError, reload: loadChildren } =
    useGuardianChildren("portal-responsavel:dashboard:filhos");

  const [summaries, setSummaries] = useState<ChildSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schoolYear = new Date().getFullYear();

  async function loadSummaries(list: Student[]) {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        list.map(async (student): Promise<ChildSummary> => {
          if (!student.classId) return { student, boletim: null };
          const boletim = await getStudentBoletim(student.id, student.classId, schoolYear, "annual");
          return { student, boletim };
        })
      );
      setSummaries(results);
    } catch (err) {
      setError(describeFirebaseError(err, "portal-responsavel:dashboard"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (children && children.length > 0) loadSummaries(children);
    else if (children) setSummaries([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  if (loadingChildren || (children && children.length > 0 && loading)) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-24 animate-pulse rounded-card bg-ink-100" />
        <CardGridSkeleton count={3} />
      </div>
    );
  }

  if (childrenError) {
    return (
      <Card>
        <ErrorState message={childrenError} onRetry={loadChildren} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={() => children && loadSummaries(children)} />
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
      <Card className="p-6 md:p-8 bg-surface border-line shadow-sm">
        <h2 className="font-display text-2xl font-bold text-ink900 mb-1">
          Olá, {profile?.name?.split(" ")[0] || "responsável"}!
        </h2>
        <p className="text-ink-500 mb-6 text-sm">
          Acompanhe o desempenho acadêmico de {children.length === 1 ? "seu filho(a)" : "seus filhos"} no ano
          letivo de {schoolYear}.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => navigate("/portal-responsavel/boletim")}>
            <BookOpen className="h-3.5 w-3.5" />
            Ver boletim
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate("/portal-responsavel/frequencia")}>
            <CalendarCheck className="h-3.5 w-3.5" />
            Ver frequência
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(summaries ?? []).map(({ student, boletim }) => (
          <Card key={student.id} className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold text-ink900">{student.name}</p>
                <p className="text-xs text-ink-400">Matrícula {student.registrationNumber || "—"}</p>
              </div>
              {boletim ? (
                <AcademicStatusBadge status={boletim.overallStatus} />
              ) : (
                <span className="shrink-0 text-xs text-ink-400">Sem turma</span>
              )}
            </div>

            {!student.classId ? (
              <p className="text-sm text-ink-500">
                Este aluno ainda não está matriculado em nenhuma turma neste ano letivo.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Média geral</p>
                  <p className="font-display text-xl font-bold text-ink900">
                    {boletim?.overallAverage !== null && boletim?.overallAverage !== undefined
                      ? boletim.overallAverage.toFixed(1)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Frequência</p>
                  <p className="font-display text-xl font-bold text-ink900">
                    {boletim?.overallAttendanceRate !== null && boletim?.overallAttendanceRate !== undefined
                      ? `${boletim.overallAttendanceRate.toFixed(0)}%`
                      : "—"}
                  </p>
                </div>
              </div>
            )}

            {boletim && boletim.overallStatus === "failed" && (
              <div className="flex items-start gap-2 rounded-card bg-danger/10 px-3 py-2.5 text-xs text-danger">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Situação crítica (nota ou frequência abaixo do mínimo exigido). Consulte o boletim e a
                  frequência para mais detalhes.
                </span>
              </div>
            )}
            {boletim && (boletim.overallStatus === "recovery" || boletim.overallStatus === "attention") && (
              <div className="flex items-start gap-2 rounded-card bg-honors-400/20 px-3 py-2.5 text-xs text-honors-600">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Este aluno precisa de atenção este bimestre. Consulte o boletim para mais detalhes.</span>
              </div>
            )}
            {boletim && (boletim.overallStatus === "regular" || boletim.overallStatus === "no_data") && (
              <div className="flex items-center gap-2 text-xs text-success">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>Nenhum alerta no momento.</span>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
