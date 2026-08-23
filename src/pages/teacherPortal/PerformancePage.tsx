import { useEffect, useMemo, useState } from "react";
import { Award, AlertTriangle, LineChart, School } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { SituationBadge } from "@/components/notes/SituationBadge";
import { DevelopmentLineChart } from "@/components/reports/DevelopmentLineChart";
import { computeEvolution } from "@/services/reports/reportsService";
import {
  getTeacherPerformanceOverview,
  type TeacherClassPerformance,
} from "@/services/academic/teacherOverviewService";
import { getAcademicSettings } from "@/services/academicSettings/academicSettingsService";
import type { AcademicSettings } from "@/types/academicSettings";
import { deriveSituationFromAverage } from "@/types/grade";
import { ASSESSMENT_TERM_LABEL } from "@/types/assessment";
import { describeFirebaseError } from "@/utils/firebaseError";

/**
 * "Desempenho" (Etapa 4b do plano multi-role) — última peça pendente
 * da Etapa 4: enquanto "/minhas-turmas" mostra média/frequência ANUAL
 * embutidas em cada card, esta tela responde duas perguntas que aquela
 * não respondia:
 * (1) COMPARAÇÃO — qual das minhas turmas está indo melhor/pior
 *     (média e frequência), lado a lado;
 * (2) EVOLUÇÃO — como uma turma+disciplina específica evoluiu ao
 *     longo dos bimestres (o mesmo padrão de "Meu Desempenho" do
 *     aluno, mas agregado por turma em vez de por aluno).
 *
 * Fonte de dados: `teacherOverviewService.getTeacherPerformanceOverview`
 * (já escopada a `discipline.teacherId === profile.uid` — nenhum novo
 * filtro de segurança é necessário aqui, só apresentação).
 */
export function PerformancePage() {
  const { profile } = useAuth();
  const [overview, setOverview] = useState<TeacherClassPerformance[]>([]);
  const [settings, setSettings] = useState<AcademicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>("");

  const schoolYear = new Date().getFullYear();

  async function load() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const [performanceOverview, academicSettings] = await Promise.all([
        getTeacherPerformanceOverview(profile.uid, schoolYear),
        getAcademicSettings(schoolYear),
      ]);
      setOverview(performanceOverview);
      setSettings(academicSettings);
      setSelectedKey((current) => {
        const stillExists = performanceOverview.some((item) => keyOf(item) === current);
        if (stillExists) return current;
        return performanceOverview[0] ? keyOf(performanceOverview[0]) : "";
      });
    } catch (err) {
      setError(describeFirebaseError(err, "desempenho-turmas:listar"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid]);

  const thresholds = settings ?? { passingAverage: 6, recoveryThreshold: 4 };

  // Comparação entre turmas: só entram no ranking de média/frequência
  // as turmas que já têm o respectivo dado real lançado — nunca
  // comparamos com "0" inventado para uma turma sem notas/registros
  // ainda (regra 5 do plano: nada de dado fake).
  const withAverage = useMemo(() => overview.filter((i) => i.average !== null), [overview]);
  const withAttendance = useMemo(() => overview.filter((i) => i.attendanceRate !== null), [overview]);

  const bestByAverage = withAverage.length
    ? withAverage.reduce((max, i) => ((i.average as number) > (max.average as number) ? i : max))
    : null;
  const worstByAverage =
    withAverage.length > 1
      ? withAverage.reduce((min, i) => ((i.average as number) < (min.average as number) ? i : min))
      : null;

  const worstByAttendance = withAttendance.length
    ? withAttendance.reduce((min, i) => ((i.attendanceRate as number) < (min.attendanceRate as number) ? i : min))
    : null;
  const lowAttendanceAlert =
    worstByAttendance &&
    settings &&
    (worstByAttendance.attendanceRate as number) < settings.minAttendanceRate;

  const rankedByAverage = useMemo(
    () => [...overview].sort((a, b) => (b.average ?? -1) - (a.average ?? -1)),
    [overview]
  );

  const selected = overview.find((item) => keyOf(item) === selectedKey) ?? null;
  const chartPoints = (selected?.series ?? []).map((p) => ({
    label: ASSESSMENT_TERM_LABEL[p.term].replace("º Bimestre", "º Bim"),
    value: p.average,
  }));
  const evolution = selected ? computeEvolution(selected.series) : null;

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
        Comparação e evolução das suas {overview.length} turma{overview.length === 1 ? "" : "s"} neste ano letivo (
        {schoolYear}).
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h4 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-ink900">
            <Award className="h-4 w-4 text-honors-500" aria-hidden="true" />
            Melhor desempenho
          </h4>
          {bestByAverage ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink900">{bestByAverage.schoolClass.name}</p>
                <p className="text-sm text-ink-500">{bestByAverage.discipline.name}</p>
              </div>
              <p className="font-display text-2xl font-bold text-success">
                {(bestByAverage.average as number).toFixed(1)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-500">Nenhuma turma com nota lançada ainda.</p>
          )}
        </Card>

        <Card className="p-5">
          <h4 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-ink900">
            <AlertTriangle className="h-4 w-4 text-danger" aria-hidden="true" />
            Precisa de atenção
          </h4>
          {worstByAverage ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink900">{worstByAverage.schoolClass.name}</p>
                <p className="text-sm text-ink-500">{worstByAverage.discipline.name}</p>
              </div>
              <p
                className={`font-display text-2xl font-bold ${
                  (worstByAverage.average as number) < thresholds.passingAverage ? "text-danger" : "text-ink900"
                }`}
              >
                {(worstByAverage.average as number).toFixed(1)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-500">
              {withAverage.length <= 1
                ? "É preciso mais de uma turma com nota lançada para comparar."
                : "Nenhum ponto de atenção identificado."}
            </p>
          )}
          {lowAttendanceAlert && worstByAttendance && (
            <p className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-xs text-danger">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {worstByAttendance.schoolClass.name} ({worstByAttendance.discipline.name}) está com frequência de{" "}
              {worstByAttendance.attendanceRate}%, abaixo do mínimo configurado ({settings?.minAttendanceRate}%).
            </p>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3.5">
          <p className="font-medium text-ink900">Comparação entre turmas</p>
        </div>
        <div className="flex flex-col divide-y divide-line">
          {rankedByAverage.map((item) => {
            const situation = deriveSituationFromAverage(item.average, thresholds);
            const lowAttendance =
              item.attendanceRate !== null && settings !== null && item.attendanceRate < settings.minAttendanceRate;
            return (
              <div
                key={keyOf(item)}
                className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-ink900">{item.schoolClass.name}</p>
                  <p className="text-sm text-ink-500">{item.discipline.name}</p>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Média</p>
                    <p className="font-display text-sm font-bold text-ink900">
                      {item.average === null ? "—" : item.average.toFixed(1)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Frequência</p>
                    <p className={`font-display text-sm font-bold ${lowAttendance ? "text-danger" : "text-ink900"}`}>
                      {item.attendanceRate === null ? "—" : `${item.attendanceRate}%`}
                    </p>
                  </div>
                  {item.average !== null && <SituationBadge situation={situation} />}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-display text-base font-semibold text-ink900">Evolução por bimestre</h3>
          <div className="flex items-center gap-3">
            {evolution !== null && (
              <span className={`text-sm font-medium ${evolution >= 0 ? "text-success" : "text-danger"}`}>
                {evolution > 0 ? "+" : ""}
                {evolution.toFixed(1)} vs período anterior
              </span>
            )}
            {overview.length > 1 && (
              <Select
                label="Turma/disciplina"
                hideLabel
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="min-w-[220px]"
              >
                {rankedByAverage.map((item) => (
                  <option key={keyOf(item)} value={keyOf(item)}>
                    {item.schoolClass.name} · {item.discipline.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
        </div>
        {selected ? (
          <DevelopmentLineChart points={chartPoints} emptyMessage="Nenhuma nota lançada ainda nesta turma." />
        ) : (
          <EmptyState icon={LineChart} title="Selecione uma turma" description="Escolha uma turma para ver sua evolução ao longo do ano." />
        )}
      </Card>
    </div>
  );
}

function keyOf(item: TeacherClassPerformance): string {
  return `${item.discipline.id}-${item.schoolClass.id}`;
}
