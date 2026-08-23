import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { School, Users, ClipboardList, CalendarCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { SituationBadge } from "@/components/notes/SituationBadge";
import { CLASS_SHIFT_LABEL } from "@/types/schoolClass";
import { deriveSituationFromAverage } from "@/types/grade";
import {
  getTeacherClassesOverview,
  type TeacherClassOverview,
} from "@/services/academic/teacherOverviewService";
import { getAcademicSettings } from "@/services/academicSettings/academicSettingsService";
import type { AcademicSettings } from "@/types/academicSettings";
import { describeFirebaseError } from "@/utils/firebaseError";

/**
 * "Minhas Turmas" (seção 4 do plano multi-role) — o professor vê
 * SOMENTE as turmas/disciplinas em que `discipline.teacherId ===
 * profile.uid` (via `teacherOverviewService.getTeacherClassesOverview`,
 * que também é a fonte de "Meus Alunos" e do Dashboard do professor —
 * uma única função, sem duplicar o filtro em cada tela).
 *
 * Diferente de "/turmas" (visão de staff — TODAS as turmas da escola,
 * com edição), esta tela é somente leitura e já mostra média/frequência
 * calculadas a partir de `grades`/`attendanceRecords` reais, nunca
 * valores inventados (seção 27/24: estado vazio em vez de "0" fake).
 */
export function MyClassesPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<TeacherClassOverview[]>([]);
  const [settings, setSettings] = useState<AcademicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const schoolYear = new Date().getFullYear();

  async function load() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const [classesOverview, academicSettings] = await Promise.all([
        getTeacherClassesOverview(profile.uid, schoolYear),
        getAcademicSettings(schoolYear),
      ]);
      setOverview(classesOverview);
      setSettings(academicSettings);
    } catch (err) {
      setError(describeFirebaseError(err, "minhas-turmas:listar"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid]);

  if (loading) {
    return <CardGridSkeleton count={4} />;
  }

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={load} />
      </Card>
    );
  }

  if (overview.length === 0) {
    return (
      <EmptyState
        icon={School}
        title="Nenhuma turma vinculada"
        description="Você ainda não está vinculado a nenhuma disciplina/turma. Fale com a coordenação para ser vinculado."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-ink-500">
        {overview.length} turma{overview.length === 1 ? "" : "s"} vinculada{overview.length === 1 ? "" : "s"} a você
        neste ano letivo ({schoolYear}).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {overview.map((item) => {
          const situation = deriveSituationFromAverage(
            item.average,
            settings ?? { passingAverage: 6, recoveryThreshold: 5 }
          );
          const lowAttendance =
            item.attendanceRate !== null && settings !== null && item.attendanceRate < settings.minAttendanceRate;

          return (
            <Card key={`${item.discipline.id}-${item.schoolClass.id}`} className="p-5 flex flex-col gap-4">
              <div>
                <p className="font-display font-semibold text-ink900">{item.schoolClass.name}</p>
                <p className="text-sm text-ink-500">
                  {item.discipline.name} · {CLASS_SHIFT_LABEL[item.schoolClass.shift]}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-ink-400">
                <Users className="h-3.5 w-3.5" />
                {item.studentCount} aluno{item.studentCount === 1 ? "" : "s"}
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-card bg-paper border border-line p-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Média</p>
                  {item.average === null ? (
                    <p className="text-sm text-ink-400">Sem notas</p>
                  ) : (
                    <p className="font-display text-lg font-bold text-ink900">{item.average.toFixed(1)}</p>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Frequência</p>
                  {item.attendanceRate === null ? (
                    <p className="text-sm text-ink-400">Sem registros</p>
                  ) : (
                    <p className={`font-display text-lg font-bold ${lowAttendance ? "text-danger" : "text-ink900"}`}>
                      {item.attendanceRate}%
                    </p>
                  )}
                </div>
              </div>

              {item.average !== null && (
                <div>
                  <SituationBadge situation={situation} />
                </div>
              )}

              <div className="mt-auto flex gap-2 pt-2 border-t border-line">
                <button
                  onClick={() => navigate("/notas")}
                  className="flex-1 text-xs font-medium text-ink-600 hover:text-ink-900 flex items-center justify-center gap-1 rounded-card border border-line py-2 hover:bg-ink-50"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Notas
                </button>
                <button
                  onClick={() => navigate("/frequencia")}
                  className="flex-1 text-xs font-medium text-ink-600 hover:text-ink-900 flex items-center justify-center gap-1 rounded-card border border-line py-2 hover:bg-ink-50"
                >
                  <CalendarCheck className="h-3.5 w-3.5" />
                  Frequência
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
