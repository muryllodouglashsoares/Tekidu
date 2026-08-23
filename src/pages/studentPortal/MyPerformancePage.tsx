import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, FileQuestion, UserX, LineChart } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { DevelopmentLineChart } from "@/components/reports/DevelopmentLineChart";
import { useOwnStudent } from "@/hooks/useOwnStudent";
import {
  getStudentBoletim,
  getStudentDevelopmentSeries,
  type StudentBoletim,
  type StudentDevelopmentPoint,
} from "@/services/boletim/boletimService";
import { ASSESSMENT_TERM_LABEL } from "@/types/assessment";
import { describeFirebaseError } from "@/utils/firebaseError";

/**
 * "Meu Desempenho" (seção 11 do plano multi-role): evolução acadêmica
 * ao longo dos bimestres, melhor disciplina e disciplina que precisa
 * de atenção. Reaproveita `boletimService.getStudentDevelopmentSeries`
 * (mesma série já usada pelo gráfico no Perfil 360° do aluno, visto
 * por staff) e `getStudentBoletim` (período "annual", mesma fonte de
 * "Meu Boletim"/"Minhas Disciplinas") — nenhum cálculo novo de
 * média/frequência é criado aqui, só reorganizado para responder
 * "como estou indo".
 *
 * "Evolução" só é exibida quando existem DOIS bimestres consecutivos
 * com nota lançada — sem isso, o dado seria inventado (seção 27 do
 * plano: nada de métrica artificial).
 */
export function MyPerformancePage() {
  const { student, loading: loadingStudent, error: studentError, reload: loadStudent } =
    useOwnStudent("meu-desempenho:aluno");

  const [boletim, setBoletim] = useState<StudentBoletim | null>(null);
  const [series, setSeries] = useState<StudentDevelopmentPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schoolYear = new Date().getFullYear();

  async function load() {
    if (!student?.classId) return;
    setLoading(true);
    setError(null);
    try {
      const [boletimData, seriesData] = await Promise.all([
        getStudentBoletim(student.id, student.classId, schoolYear, "annual"),
        getStudentDevelopmentSeries(student.id, student.classId, schoolYear),
      ]);
      setBoletim(boletimData);
      setSeries(seriesData);
    } catch (err) {
      setError(describeFirebaseError(err, "meu-desempenho:carregar"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (student?.classId) load();
    else {
      setBoletim(null);
      setSeries([]);
    }
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

  const disciplinesWithGrades = (boletim?.disciplines ?? []).filter((d) => d.average !== null);

  if (disciplinesWithGrades.length === 0) {
    return (
      <EmptyState
        icon={LineChart}
        title="Nenhuma nota lançada ainda"
        description="Seu desempenho aparecerá aqui assim que as primeiras notas forem lançadas pelos professores."
      />
    );
  }

  // Últimos dois bimestres CONSECUTIVOS com nota lançada — nunca
  // comparamos bimestres não-adjacentes (ex.: 1º com 4º) para não
  // sugerir uma "evolução" que pule períodos sem dados.
  const pointsWithData = series
    .map((point, index) => ({ ...point, index }))
    .filter((p) => p.average !== null);
  let evolutionPct: number | null = null;
  let current: (typeof pointsWithData)[number] | null = null;
  let previous: (typeof pointsWithData)[number] | null = null;
  for (let i = pointsWithData.length - 1; i > 0; i--) {
    const a = pointsWithData[i];
    const b = pointsWithData[i - 1];
    if (a.index === b.index + 1) {
      current = a;
      previous = b;
      break;
    }
  }
  if (current && previous && previous.average !== null && previous.average !== 0) {
    evolutionPct = Math.round(((current.average! - previous.average) / previous.average) * 1000) / 10;
  }

  const best = disciplinesWithGrades.reduce((max, d) => ((d.average ?? 0) > (max.average ?? 0) ? d : max));
  const worst = disciplinesWithGrades.reduce((min, d) => ((d.average ?? 10) < (min.average ?? 10) ? d : min));

  const chartPoints = series.map((p) => ({
    label: ASSESSMENT_TERM_LABEL[p.term],
    value: p.average,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Média geral (ano)</p>
          <p className="font-display text-3xl font-bold text-ink900 mt-1">
            {boletim?.overallAverage?.toFixed(1) ?? "—"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
            {current ? `Média — ${ASSESSMENT_TERM_LABEL[current.term]}` : "Média do último bimestre"}
          </p>
          <p className="font-display text-3xl font-bold text-ink900 mt-1">
            {current?.average?.toFixed(1) ?? "—"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Evolução</p>
          {evolutionPct === null ? (
            <p className="text-sm text-ink-400 mt-1">
              Ainda sem dois bimestres com nota lançada para comparar.
            </p>
          ) : (
            <p
              className={`font-display text-3xl font-bold mt-1 flex items-center gap-2 ${
                evolutionPct >= 0 ? "text-success" : "text-danger"
              }`}
            >
              {evolutionPct >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
              {evolutionPct > 0 ? "+" : ""}
              {evolutionPct}%
            </p>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <p className="font-medium text-ink900 mb-4">Evolução acadêmica</p>
        <DevelopmentLineChart points={chartPoints} emptyMessage="Nenhuma nota lançada ainda neste ano letivo." />
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5 flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Melhor desempenho</p>
          <p className="font-display text-lg font-bold text-ink900">{best.discipline.name}</p>
          <p className="text-sm text-success font-medium">{best.average?.toFixed(1)}</p>
        </Card>
        {disciplinesWithGrades.length > 1 && worst.discipline.id !== best.discipline.id && (
          <Card className="p-5 flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Precisa de atenção</p>
            <p className="font-display text-lg font-bold text-ink900">{worst.discipline.name}</p>
            <p className={`text-sm font-medium ${(worst.average ?? 10) < 6 ? "text-danger" : "text-ink-600"}`}>
              {worst.average?.toFixed(1)}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
