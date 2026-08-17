import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  UserPlus,
  Settings,
  Bell,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { SituationBadge } from "@/components/notes/SituationBadge";
import { getClasses } from "@/services/classes/classService";
import { getStudents } from "@/services/students/studentService";
import { getAcademicOverview, type AcademicOverview, type AcademicPendency } from "@/services/academic/academicOverviewService";
import { formatRelativeTime } from "@/utils/formatRelativeTime";
import { describeFirebaseError } from "@/utils/firebaseError";
import type { Student } from "@/types/student";
import type { SchoolClass } from "@/types/schoolClass";
import { ACADEMIC_SITUATION_LABEL, type AcademicSituation } from "@/types/grade";

const STATUS_ORDER: AcademicSituation[] = ["approved", "recovery", "failed", "incomplete", "no_grades"];
const STATUS_BAR_COLOR: Record<AcademicSituation, string> = {
  approved: "bg-success",
  recovery: "bg-honors-400",
  failed: "bg-danger",
  incomplete: "bg-ink-300",
  no_grades: "bg-ink-200",
};

const SEVERITY_TEXT_COLOR: Record<AcademicPendency["severity"], string> = {
  high: "text-danger",
  medium: "text-honors-600",
  low: "text-ink-500",
};

const SEVERITY_DOT: Record<AcademicPendency["severity"], string> = {
  high: "bg-danger",
  medium: "bg-honors-500",
  low: "bg-ink-300",
};

/**
 * Dashboard consolidado (itens 1, 11 e 12 do plano de consolidação V8).
 *
 * ANTES: esta tela calculava "Ativos"/"Em recuperação"/"Média geral"
 * lendo `student.average`/`student.status` — campos digitados
 * manualmente no cadastro do aluno, sem nenhuma relação com as notas
 * realmente lançadas em Notas. Isso é exatamente o anti-padrão citado
 * como exemplo no item 1 do plano ("o Dashboard não deve possuir uma
 * média independente").
 *
 * AGORA: todos os números vêm de `getAcademicOverview`
 * (`services/academic/academicOverviewService.ts`), que reaproveita as
 * MESMAS funções centrais de cálculo usadas por Boletim e Relatórios —
 * o Dashboard não tem mais nenhuma fórmula própria de média/situação.
 * Os campos `student.average`/`student.status` continuam existindo no
 * documento (não foram apagados — nenhuma migração destrutiva), mas
 * deixaram de ser lidos aqui.
 *
 * A seção "Pendências acadêmicas" (item 11) transforma o Dashboard de
 * painel de números em central de ação: cada alerta tem um botão que
 * leva direto para a tela onde a pendência pode ser resolvida.
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [overview, setOverview] = useState<AcademicOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const schoolYear = new Date().getFullYear();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [studentsData, classesData, overviewData] = await Promise.all([
          getStudents(),
          getClasses(),
          getAcademicOverview(schoolYear),
        ]);
        if (!cancelled) {
          setStudents(studentsData);
          setClasses(classesData);
          setOverview(overviewData);
        }
      } catch (err) {
        if (!cancelled) setError(describeFirebaseError(err, "dashboard:carregar"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolYear]);

  const classNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const schoolClass of classes) map[schoolClass.id] = schoolClass.name;
    return map;
  }, [classes]);

  function classNameFor(student: Student): string | null {
    return student.classId ? classNameById[student.classId] ?? null : null;
  }

  // Matrículas mais recentes — continua vindo diretamente de `students`
  // (ordenado por `createdAt` desc no service), não da agregação
  // acadêmica: matrícula é um evento cadastral, não um cálculo.
  const recentEnrollments = useMemo(() => [...students].slice(0, 5), [students]);

  // "Em situação regular" passa a significar "aprovado ou em
  // acompanhamento normal (sem notas suficientes ainda para indicar
  // risco)" — aprovado + incompleto + sem notas, espelhando a intenção
  // original do card ("estão bem, não precisam de atenção imediata").
  const activeCount = overview
    ? overview.byStatus.approved + overview.byStatus.incomplete + overview.byStatus.no_grades
    : 0;
  const totalWithClass = overview?.students.length ?? 0;

  if (loading) {
    return <Spinner label="Carregando dashboard..." />;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-semibold text-ink900">Dashboard</h2>
        <p className="text-sm text-ink-500">Visão geral do período letivo — {schoolYear}</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total de alunos"
          value={students.length}
          hint="matriculados"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Em situação regular"
          value={activeCount}
          hint={
            totalWithClass > 0
              ? `${Math.round((activeCount / totalWithClass) * 100)}% dos alunos com turma`
              : undefined
          }
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Em recuperação/reprovados"
          value={(overview?.byStatus.recovery ?? 0) + (overview?.byStatus.failed ?? 0)}
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Média geral"
          value={
            overview?.overallAverage !== null && overview?.overallAverage !== undefined
              ? overview.overallAverage.toFixed(1)
              : "—"
          }
          hint={overview?.overallAverage == null ? "sem notas lançadas" : "calculada a partir das notas lançadas"}
        />
      </div>

      {overview && overview.pendencies.length > 0 && (
        <Card className="mb-6 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-ink-500" aria-hidden="true" />
            <h3 className="font-display text-base font-semibold text-ink900">Pendências acadêmicas</h3>
          </div>
          <ul className="flex flex-col gap-2">
            {overview.pendencies.map((pendency) => (
              <li
                key={pendency.id}
                className="flex items-center justify-between gap-3 rounded-card border border-line px-3.5 py-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[pendency.severity]}`} aria-hidden="true" />
                  <span className={`text-sm ${SEVERITY_TEXT_COLOR[pendency.severity]}`}>{pendency.label}</span>
                </div>
                <Button variant="secondary" onClick={() => navigate(pendency.actionHref)}>
                  {pendency.actionLabel}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-ink900">
              Matrículas recentes
            </h3>
            <Link to="/alunos" className="text-sm font-medium text-ink-600 hover:underline">
              Ver todos
            </Link>
          </div>

          {recentEnrollments.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">
              Nenhum aluno cadastrado ainda.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {recentEnrollments.map((student) => {
                const studentOverview = overview?.students.find((o) => o.student.id === student.id);
                return (
                  <li key={student.id} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                        {student.name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase())
                          .join("")}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink900">
                          {student.name}
                        </p>
                        <p className="truncate text-xs text-ink-400">
                          {classNameFor(student) || "Sem turma"} · {student.registrationNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="tabular text-sm text-ink-600">
                        {studentOverview?.average !== null && studentOverview?.average !== undefined
                          ? studentOverview.average.toFixed(1)
                          : "—"}
                      </span>
                      {studentOverview && <SituationBadge situation={studentOverview.situation} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 font-display text-base font-semibold text-ink900">
            Ações rápidas
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              icon={<UserPlus className="h-4 w-4" />}
              label="Novo aluno"
              onClick={() => navigate("/alunos")}
            />
            <QuickAction
              icon={<Users className="h-4 w-4" />}
              label="Ver alunos"
              onClick={() => navigate("/alunos")}
            />
            <QuickAction
              icon={<BarChart3 className="h-4 w-4" />}
              label="Relatórios"
              onClick={() => navigate("/relatorios")}
            />
            <QuickAction
              icon={<Settings className="h-4 w-4" />}
              label="Configurações"
              onClick={() => navigate("/configuracoes")}
            />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 font-display text-base font-semibold text-ink900">
          Distribuição por situação
        </h3>
        {!overview || totalWithClass === 0 ? (
          <p className="text-sm text-ink-500">Nenhum dado para exibir ainda.</p>
        ) : (
          <>
            <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full bg-ink-50">
              {STATUS_ORDER.map((status) =>
                overview.byStatus[status] > 0 ? (
                  <span
                    key={status}
                    className={STATUS_BAR_COLOR[status]}
                    style={{ width: `${(overview.byStatus[status] / totalWithClass) * 100}%` }}
                  />
                ) : null
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600">
              {STATUS_ORDER.map((status) => (
                <span key={status} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_BAR_COLOR[status]}`} />
                  {overview.byStatus[status]} {ACADEMIC_SITUATION_LABEL[status]}
                  {overview.byStatus[status] === 1 ? "" : "s"}
                </span>
              ))}
            </div>
          </>
        )}
      </Card>

      {recentEnrollments.length > 0 && (
        <Card className="mt-6 p-5">
          <h3 className="mb-4 font-display text-base font-semibold text-ink900">
            Atividade recente
          </h3>
          <ul className="flex flex-col gap-3 text-sm">
            {recentEnrollments.map((student) => {
              const relative = formatRelativeTime(student.createdAt);
              return (
                <li key={student.id} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" />
                  <div>
                    <p className="text-ink-700">
                      <span className="font-medium">{student.name}</span> matriculado em{" "}
                      {classNameFor(student) || "turma não definida"}
                    </p>
                    {relative && <p className="text-xs text-ink-400">{relative}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-card bg-ink-50 text-ink-600">
        {icon}
      </div>
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-semibold text-ink900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-400">{hint}</p>}
    </Card>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="secondary" className="flex-col gap-1.5 !py-4" onClick={onClick}>
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  );
}
