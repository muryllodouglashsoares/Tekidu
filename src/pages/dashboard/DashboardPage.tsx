import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, CheckCircle2, AlertTriangle, BarChart3, UserPlus, Settings } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { StudentStatusBadge } from "@/components/students/StudentStatusBadge";
import { getStudents } from "@/services/students/studentService";
import { getClasses } from "@/services/classes/classService";
import { formatRelativeTime } from "@/utils/formatRelativeTime";
import type { Student, StudentStatus } from "@/types/student";
import { STUDENT_STATUS_LABEL } from "@/types/student";
import type { SchoolClass } from "@/types/schoolClass";

const STATUS_ORDER: StudentStatus[] = ["active", "recovery", "failed", "inactive"];
const STATUS_BAR_COLOR: Record<StudentStatus, string> = {
  active: "bg-success",
  recovery: "bg-honors-400",
  failed: "bg-danger",
  inactive: "bg-ink-200",
};

export function DashboardPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [studentsData, classesData] = await Promise.all([getStudents(), getClasses()]);
        if (!cancelled) {
          setStudents(studentsData);
          setClasses(classesData);
        }
      } catch {
        if (!cancelled) setError("Não foi possível carregar os dados do dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const classNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const schoolClass of classes) map[schoolClass.id] = schoolClass.name;
    return map;
  }, [classes]);

  function classNameFor(student: Student): string | null {
    return student.classId ? classNameById[student.classId] ?? null : null;
  }

  const stats = useMemo(() => {
    const total = students.length;
    const byStatus: Record<StudentStatus, number> = {
      active: 0,
      recovery: 0,
      failed: 0,
      inactive: 0,
    };
    let sum = 0;
    let withAverage = 0;

    for (const s of students) {
      byStatus[s.status] += 1;
      if (s.average !== null) {
        sum += s.average;
        withAverage += 1;
      }
    }

    return {
      total,
      byStatus,
      average: withAverage > 0 ? sum / withAverage : null,
    };
  }, [students]);

  const recentEnrollments = useMemo(
    () => [...students].slice(0, 5), // já vem ordenado por createdAt desc do service
    [students]
  );

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
        <p className="text-sm text-ink-500">
          Visão geral do período letivo — {new Date().getFullYear()}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total de alunos"
          value={stats.total}
          hint="matriculados"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Ativos"
          value={stats.byStatus.active}
          hint={
            stats.total > 0
              ? `${Math.round((stats.byStatus.active / stats.total) * 100)}% da turma`
              : undefined
          }
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Em recuperação"
          value={stats.byStatus.recovery}
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Média geral"
          value={stats.average !== null ? stats.average.toFixed(1) : "—"}
          hint={stats.average === null ? "sem notas lançadas" : undefined}
        />
      </div>

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
              {recentEnrollments.map((student) => (
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
                      {student.average !== null ? student.average.toFixed(1) : "—"}
                    </span>
                    <StudentStatusBadge status={student.status} />
                  </div>
                </li>
              ))}
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
        {stats.total === 0 ? (
          <p className="text-sm text-ink-500">Nenhum dado para exibir ainda.</p>
        ) : (
          <>
            <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full bg-ink-50">
              {STATUS_ORDER.map((status) =>
                stats.byStatus[status] > 0 ? (
                  <span
                    key={status}
                    className={STATUS_BAR_COLOR[status]}
                    style={{ width: `${(stats.byStatus[status] / stats.total) * 100}%` }}
                  />
                ) : null
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600">
              {STATUS_ORDER.map((status) => (
                <span key={status} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_BAR_COLOR[status]}`} />
                  {stats.byStatus[status]} {STUDENT_STATUS_LABEL[status]}
                  {stats.byStatus[status] === 1 ? "" : "s"}
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
