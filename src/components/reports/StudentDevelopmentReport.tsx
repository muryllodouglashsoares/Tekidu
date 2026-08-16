import { Award, AlertTriangle, FileQuestion } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/layout/EmptyState";
import { BoletimSummary } from "@/components/boletim/BoletimSummary";
import { BoletimTable } from "@/components/boletim/BoletimTable";
import { DevelopmentLineChart } from "@/components/reports/DevelopmentLineChart";
import { ASSESSMENT_TERM_LABEL } from "@/types/assessment";
import type { StudentBoletim } from "@/services/boletim/boletimService";
import type { StudentDevelopmentPoint } from "@/services/boletim/boletimService";
import { computeEvolution } from "@/services/reports/reportsService";
import type { Student } from "@/types/student";
import type { SchoolClass } from "@/types/schoolClass";

interface StudentDevelopmentReportProps {
  student: Student;
  schoolClass: SchoolClass;
  schoolYear: string;
  boletim: StudentBoletim;
  series: StudentDevelopmentPoint[];
}

/**
 * Relatório de Desenvolvimento individual (item 17 do briefing): segue
 * a estrutura do Figma — identificação, indicadores, gráfico de
 * evolução isolado do aluno (item 18), desempenho por disciplina
 * (reaproveitado de `BoletimSummary`/`BoletimTable`, já usados pelo
 * Boletim — não duplica o cálculo de média/frequência/situação) e, por
 * fim, destaques/pontos de atenção/síntese, DERIVADOS das disciplinas
 * reais do aluno (nada inventado).
 */
export function StudentDevelopmentReport({
  student,
  schoolClass,
  schoolYear,
  boletim,
  series,
}: StudentDevelopmentReportProps) {
  const chartPoints = series.map((p) => ({
    label: ASSESSMENT_TERM_LABEL[p.term].replace("º Bimestre", "º Bim"),
    value: p.average,
  }));

  const seriesPoints = series.map((p) => ({ term: p.term, average: p.average }));
  const evolution = computeEvolution(seriesPoints);

  const highlights = [...boletim.disciplines]
    .filter((row) => row.situation === "approved" && row.average !== null)
    .sort((a, b) => (b.average as number) - (a.average as number))
    .slice(0, 3);

  const concerns = boletim.disciplines.filter(
    (row) => row.situation === "failed" || row.situation === "recovery" || row.attendanceStatus === "critical"
  );

  const synthesis = buildSynthesis(student.name, boletim, highlights.length, concerns.length);

  return (
    <div>
      <Card className="mb-6 p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-400">Identificação do aluno</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Nome" value={student.name} />
          <Field label="Matrícula" value={student.registrationNumber || "—"} />
          <Field label="Turma" value={schoolClass.name} />
          <Field label="Ano letivo" value={schoolYear} />
        </div>
      </Card>

      <BoletimSummary boletim={boletim} />

      <Card className="mb-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ink900">
            Desenvolvimento de {student.name.split(" ")[0]}
          </h3>
          {evolution !== null && (
            <span className={`text-sm font-medium ${evolution >= 0 ? "text-success" : "text-danger"}`}>
              {evolution > 0 ? "+" : ""}
              {evolution.toFixed(1)} vs período anterior
            </span>
          )}
        </div>
        <DevelopmentLineChart points={chartPoints} />
      </Card>

      {boletim.disciplines.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="Aluno sem dados acadêmicos"
          description="Ainda não há disciplinas vinculadas a esta turma para o ano letivo selecionado."
        />
      ) : (
        <>
          <Card className="mb-6 overflow-hidden">
            <div className="border-b border-line px-4 py-3.5">
              <p className="font-medium text-ink900">Desempenho por disciplina</p>
            </div>
            <BoletimTable rows={boletim.disciplines} />
          </Card>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h4 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-ink900">
                <Award className="h-4 w-4 text-honors-500" aria-hidden="true" />
                Destaques
              </h4>
              {highlights.length === 0 ? (
                <p className="text-sm text-ink-500">Nenhuma disciplina em destaque neste período.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {highlights.map((row) => (
                    <li key={row.discipline.id} className="flex items-center justify-between">
                      <span className="text-ink-700">{row.discipline.name}</span>
                      <span className="tabular font-medium text-success">{row.average?.toFixed(1)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h4 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-ink900">
                <AlertTriangle className="h-4 w-4 text-danger" aria-hidden="true" />
                Pontos de atenção
              </h4>
              {concerns.length === 0 ? (
                <p className="text-sm text-ink-500">Nenhum ponto de atenção identificado.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {concerns.map((row) => (
                    <li key={row.discipline.id} className="flex items-center justify-between">
                      <span className="text-ink-700">{row.discipline.name}</span>
                      <span className="tabular font-medium text-danger">
                        {row.average === null ? "—" : row.average.toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="p-5">
            <h4 className="mb-2 font-display text-sm font-semibold text-ink900">Síntese acadêmica</h4>
            <p className="text-sm leading-relaxed text-ink-600">{synthesis}</p>
          </Card>
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-ink-400">{label}</p>
      <p className="truncate font-medium text-ink900">{value}</p>
    </div>
  );
}

/**
 * Monta um parágrafo curto a partir dos dados já calculados do boletim
 * — sem nenhuma informação inventada, só descreve em texto o que os
 * indicadores acima já mostram em números.
 */
function buildSynthesis(
  studentName: string,
  boletim: StudentBoletim,
  highlightsCount: number,
  concernsCount: number
): string {
  const firstName = studentName.split(" ")[0];

  if (boletim.overallAverage === null && boletim.overallAttendanceRate === null) {
    return `Ainda não há notas ou registros de frequência suficientes para gerar uma síntese sobre ${firstName}.`;
  }

  const parts: string[] = [];
  parts.push(
    `${firstName} apresenta média geral de ${
      boletim.overallAverage === null ? "dados insuficientes" : boletim.overallAverage.toFixed(1)
    }${
      boletim.overallAttendanceRate === null
        ? ""
        : ` e frequência de ${boletim.overallAttendanceRate}%`
    }.`
  );

  if (highlightsCount > 0) {
    parts.push(`Apresenta bom desempenho em ${highlightsCount} disciplina${highlightsCount === 1 ? "" : "s"}.`);
  }
  if (concernsCount > 0) {
    parts.push(
      `Requer atenção em ${concernsCount} disciplina${concernsCount === 1 ? "" : "s"}, seja por desempenho ou frequência.`
    );
  } else if (highlightsCount > 0) {
    parts.push("Não há pontos de atenção identificados neste período.");
  }

  return parts.join(" ");
}
