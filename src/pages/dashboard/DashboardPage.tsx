import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronRight,
  BookOpen,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { SituationBadge } from "@/components/notes/SituationBadge";
import { getClasses } from "@/services/classes/classService";
import { getStudents } from "@/services/students/studentService";
import { getAcademicOverview, type AcademicOverview, type AcademicPendency } from "@/services/academic/academicOverviewService";
import { describeFirebaseError } from "@/utils/firebaseError";
import type { Student } from "@/types/student";
import type { SchoolClass } from "@/types/schoolClass";
import { useAuth } from "@/contexts/AuthContext";

const SEVERITY_TEXT_COLOR: Record<AcademicPendency["severity"], string> = {
  high: "text-danger",
  medium: "text-orange-500",
  low: "text-ink-500",
};

const SEVERITY_DOT: Record<AcademicPendency["severity"], string> = {
  high: "bg-danger",
  medium: "bg-orange-500",
  low: "bg-ink-300",
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
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
  }, [schoolYear]);

  const classNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const schoolClass of classes) map[schoolClass.id] = schoolClass.name;
    return map;
  }, [classes]);

  function classNameFor(student: Student): string | null {
    return student.classId ? classNameById[student.classId] ?? null : null;
  }

  const recentEnrollments = useMemo(() => [...students].slice(0, 5), [students]);

  const activeCount = overview
    ? overview.byStatus.approved + overview.byStatus.incomplete + overview.byStatus.no_grades
    : 0;

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
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 gap-8">
        {/* Welcome Card */}
        <Card className="p-6 md:p-8 bg-surface border-line shadow-sm relative overflow-hidden flex items-center">
          <div className="relative z-10 max-w-xl">
            <h2 className="font-display text-2xl font-bold text-ink900 mb-2">
              Bem-vindo(a) de volta, {profile?.name?.split(" ")[0] || "Usuário"}!
            </h2>
            <p className="text-ink-500 mb-6 text-sm">
              Visão geral do período letivo de {schoolYear}. Você tem {overview?.pendencies.length || 0} pendências acadêmicas para revisar hoje.
            </p>
            <Button onClick={() => navigate("/alunos")}>
              Ver Alunos
            </Button>
          </div>
          {/* Decorative Background Element */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-ink-50 to-transparent hidden md:block">
            <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20">
              <Users className="w-32 h-32 text-ink-700" />
            </div>
          </div>
        </Card>

        {/* Classes Section */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-display text-lg font-bold text-ink900">Minhas Turmas</h3>
            <Link to="/turmas" className="text-sm font-medium text-ink-600 hover:text-ink-900 flex items-center gap-1">
              Ver Todas <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {classes.slice(0, 3).map((schoolClass, idx) => {
              const gradients = [
                "from-blue-500 to-indigo-600",
                "from-indigo-400 to-purple-600",
                "from-rose-400 to-red-500",
              ];
              const gradient = gradients[idx % gradients.length];
              
              // Count students in this class
              const studentCount = students.filter(s => s.classId === schoolClass.id).length;

              return (
                <div key={schoolClass.id} className={`rounded-[20px] bg-gradient-to-br ${gradient} p-5 text-white shadow-md relative overflow-hidden h-40`}>
                  <div className="relative z-10 flex flex-col h-full">
                    <h4 className="font-display text-lg font-bold mb-1">{schoolClass.name}</h4>
                    <p className="text-white/80 text-sm mb-4">Período {schoolYear}</p>
                    
                    <div className="mt-auto flex items-center gap-4 text-white/90 text-sm font-medium">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>{studentCount} Alunos</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4" />
                        <span>Arquivos</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {classes.length === 0 && (
              <div className="col-span-full py-8 text-center text-ink-500 bg-surface rounded-card border border-line">
                Nenhuma turma cadastrada.
              </div>
            )}
          </div>
        </div>

        {/* Recent Enrollments Table */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-display text-lg font-bold text-ink900">Alunos Recentes</h3>
            <Link to="/alunos" className="text-sm font-medium text-ink-600 hover:text-ink-900 flex items-center gap-1">
              Ver Todos <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          
          <Card className="overflow-hidden border-line shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-ink-50 border-b border-line text-ink-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Turma</th>
                    <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Nome do Aluno</th>
                    <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Matrícula</th>
                    <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Média</th>
                    <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-surface">
                  {recentEnrollments.map(student => {
                    const studentOverview = overview?.students.find((o) => o.student.id === student.id);
                    return (
                      <tr key={student.id} className="hover:bg-ink-50/50 transition-colors">
                        <td className="px-5 py-4 font-medium text-ink900">
                          {classNameFor(student) || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-700">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-ink900">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-ink-500">
                          {student.registrationNumber}
                        </td>
                        <td className="px-5 py-4 text-ink900 font-medium">
                          {studentOverview?.average !== null && studentOverview?.average !== undefined
                            ? studentOverview.average.toFixed(1)
                            : "—"}
                        </td>
                        <td className="px-5 py-4">
                          {studentOverview ? <SituationBadge situation={studentOverview.situation} /> : <span className="text-ink-400">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {recentEnrollments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-ink-500">
                        Nenhum aluno cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Right Sidebar Area */}
      <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-6">
        
        {/* Quick Stats / Overview */}
        <Card className="p-6 border-line shadow-sm bg-surface">
          <h3 className="font-display text-base font-bold text-ink900 mb-6">Resumo Acadêmico</h3>
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-success/10 text-success flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-900">Ativos</p>
                  <p className="text-xs text-ink-500">Situação regular</p>
                </div>
              </div>
              <span className="font-bold text-lg text-ink900">{activeCount}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-danger/10 text-danger flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-900">Risco</p>
                  <p className="text-xs text-ink-500">Recuperação / Reprova</p>
                </div>
              </div>
              <span className="font-bold text-lg text-ink900">
                {(overview?.byStatus.recovery ?? 0) + (overview?.byStatus.failed ?? 0)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-ink-100 text-ink-600 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-900">Média Geral</p>
                  <p className="text-xs text-ink-500">Da escola</p>
                </div>
              </div>
              <span className="font-bold text-lg text-ink900">
                {overview?.overallAverage !== null && overview?.overallAverage !== undefined
                  ? overview.overallAverage.toFixed(1)
                  : "—"}
              </span>
            </div>
          </div>
        </Card>

        {/* Pendencies / Reminders */}
        <Card className="p-6 border-line shadow-sm bg-surface flex-1">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-base font-bold text-ink900">Pendências</h3>
            <div className="h-8 w-8 rounded-full bg-ink-50 flex items-center justify-center text-ink-500">
              <Bell className="h-4 w-4" />
            </div>
          </div>
          
          <div className="flex flex-col gap-5">
            {overview?.pendencies.slice(0, 5).map((pendency) => (
              <div key={pendency.id} className="flex gap-4 items-start group relative">
                <div className="mt-1 flex flex-col items-center">
                  <div className={`h-2.5 w-2.5 rounded-full ${SEVERITY_DOT[pendency.severity]} relative z-10 shadow-sm`} />
                </div>
                <div className="flex-1 pb-4 border-b border-line group-last:border-0 group-last:pb-0">
                  <p className={`text-sm font-semibold mb-1 ${SEVERITY_TEXT_COLOR[pendency.severity]}`}>
                    {pendency.label}
                  </p>
                  <button 
                    onClick={() => navigate(pendency.actionHref)}
                    className="text-xs text-ink-500 font-medium flex items-center gap-1 hover:text-ink-900 transition-colors"
                  >
                    {pendency.actionLabel} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            
            {(!overview?.pendencies || overview.pendencies.length === 0) && (
              <div className="text-center py-8">
                <CheckCircle2 className="h-10 w-10 text-success/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-ink-600">Nenhuma pendência.</p>
                <p className="text-xs text-ink-400 mt-1">Tudo em dia!</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
