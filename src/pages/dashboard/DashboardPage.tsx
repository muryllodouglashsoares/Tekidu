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
  CheckCircle2,
  UserPlus,
  School,
  ClipboardList,
  CalendarCheck,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CardGridSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { Button } from "@/components/ui/Button";
import { SituationBadge } from "@/components/notes/SituationBadge";
import { AcademicStatusBadge } from "@/components/boletim/AcademicStatusBadge";
import { getClasses, getStudentCountsByClassId } from "@/services/classes/classService";
import { getStudents, getStudentByUid } from "@/services/students/studentService";
import { getDisciplines } from "@/services/disciplines/disciplineService";
import { getAssessmentsBySchoolYear } from "@/services/assessments/assessmentService";
import { getAllSessions } from "@/services/attendanceSessions/attendanceSessionService";
import { getStudentBoletim, type StudentBoletim } from "@/services/boletim/boletimService";
import { getRecentNotifications } from "@/services/notifications/notificationService";
import { getAcademicOverview, type AcademicOverview, type AcademicPendency } from "@/services/academic/academicOverviewService";
import { describeFirebaseError } from "@/utils/firebaseError";
import type { Student } from "@/types/student";
import type { SchoolClass } from "@/types/schoolClass";
import type { Discipline } from "@/types/discipline";
import type { Notification } from "@/types/notification";
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

/**
 * Dashboard orientado a ações (Fase 7). Cada perfil vê um conteúdo
 * genuinely diferente — não a mesma tela com cards escondidos — porque
 * a pergunta que cada perfil precisa responder ao abrir o sistema é
 * diferente: admin pergunta "o que precisa da minha atenção na
 * escola?", professor pergunta "o que eu preciso lançar hoje?", aluno
 * pergunta "como estou indo?".
 *
 * NOTA IMPORTANTE (bug pré-existente corrigido nesta etapa): a versão
 * anterior desta página chamava `getStudents()`/`getClasses()`
 * incondicionalmente para qualquer perfil — mas a Security Rule de
 * `students`/`classes` só permite LISTAR a coleção inteira para
 * admin/professor (ver `firestore.rules`); um aluno logado recebia
 * "permission-denied" ao abrir o Dashboard. Este componente busca
 * dados diferentes conforme a role exatamente por isso, não só por UX.
 */
export function DashboardPage() {
  const { profile } = useAuth();

  if (!profile) return <CardGridSkeleton count={4} />;

  if (profile.role === "student") return <StudentDashboard />;
  if (profile.role === "teacher") return <TeacherDashboard />;
  return <AdminDashboard />;
}

/* ------------------------------------------------------------------ */
/* ADMIN                                                                */
/* ------------------------------------------------------------------ */

function AdminDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [overview, setOverview] = useState<AcademicOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const schoolYear = new Date().getFullYear();

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [studentsData, classesData, overviewData] = await Promise.all([
        getStudents(),
        getClasses(),
        getAcademicOverview(schoolYear),
      ]);
      setStudents(studentsData);
      setClasses(classesData);
      setOverview(overviewData);
    } catch (err) {
      setError(describeFirebaseError(err, "dashboard:carregar"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
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

  const recentEnrollments = useMemo(() => [...students].slice(0, 5), [students]);

  const activeCount = overview
    ? overview.byStatus.approved + overview.byStatus.incomplete + overview.byStatus.no_grades
    : 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-28 animate-pulse rounded-card bg-ink-100" />
        <CardGridSkeleton count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={loadData} />
      </Card>
    );
  }

  const quickActions = [
    { icon: UserPlus, label: "Cadastrar aluno", to: "/alunos" },
    { icon: Users, label: "Cadastrar professor", to: "/professores" },
    { icon: School, label: "Criar turma", to: "/turmas" },
    { icon: BookOpen, label: "Criar disciplina", to: "/disciplinas" },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 flex flex-col min-w-0 gap-8">
        <Card className="p-6 md:p-8 bg-surface border-line shadow-sm relative overflow-hidden flex items-center">
          <div className="relative z-10 max-w-xl">
            <h2 className="font-display text-2xl font-bold text-ink900 mb-2">
              Bem-vindo(a) de volta, {profile?.name?.split(" ")[0] || "Usuário"}!
            </h2>
            <p className="text-ink-500 mb-6 text-sm">
              Visão geral do período letivo de {schoolYear}. Você tem {overview?.pendencies.length || 0} pendência
              {overview?.pendencies.length === 1 ? "" : "s"} acadêmica{overview?.pendencies.length === 1 ? "" : "s"} para
              revisar hoje.
            </p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button key={action.to} variant="secondary" size="sm" onClick={() => navigate(action.to)}>
                  <action.icon className="h-3.5 w-3.5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-ink-50 to-transparent hidden md:block">
            <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20">
              <Users className="w-32 h-32 text-ink-700" />
            </div>
          </div>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-display text-lg font-bold text-ink900">Turmas</h3>
            <Link to="/turmas" className="text-sm font-medium text-ink-600 hover:text-ink-900 flex items-center gap-1">
              Ver todas <ChevronRight className="h-4 w-4" />
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
              const studentCount = students.filter((s) => s.classId === schoolClass.id).length;

              return (
                <div
                  key={schoolClass.id}
                  className={`rounded-[20px] bg-gradient-to-br ${gradient} p-5 text-white shadow-md relative overflow-hidden h-40`}
                >
                  <div className="relative z-10 flex flex-col h-full">
                    <h4 className="font-display text-lg font-bold mb-1">{schoolClass.name}</h4>
                    <p className="text-white/80 text-sm mb-4">Período {schoolYear}</p>
                    <div className="mt-auto flex items-center gap-4 text-white/90 text-sm font-medium">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>
                          {studentCount} aluno{studentCount === 1 ? "" : "s"}
                        </span>
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

        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-display text-lg font-bold text-ink900">Alunos recentes</h3>
            <Link to="/alunos" className="text-sm font-medium text-ink-600 hover:text-ink-900 flex items-center gap-1">
              Ver todos <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <Card className="overflow-hidden border-line shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-ink-50 border-b border-line text-ink-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Turma</th>
                    <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Nome do aluno</th>
                    <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Matrícula</th>
                    <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Média</th>
                    <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-surface">
                  {recentEnrollments.map((student) => {
                    const studentOverview = overview?.students.find((o) => o.student.id === student.id);
                    return (
                      <tr key={student.id} className="hover:bg-ink-50/50 transition-colors">
                        <td className="px-5 py-4 font-medium text-ink900">{classNameFor(student) || "—"}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-700">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-ink900">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-ink-500">{student.registrationNumber}</td>
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

      <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-6">
        <Card className="p-6 border-line shadow-sm bg-surface">
          <h3 className="font-display text-base font-bold text-ink900 mb-6">Resumo acadêmico</h3>
          <div className="flex flex-col gap-5">
            <SummaryRow icon={Users} iconClass="bg-success/10 text-success" label="Ativos" sublabel="Situação regular" value={activeCount} />
            <SummaryRow
              icon={AlertTriangle}
              iconClass="bg-danger/10 text-danger"
              label="Risco"
              sublabel="Recuperação / reprova"
              value={(overview?.byStatus.recovery ?? 0) + (overview?.byStatus.failed ?? 0)}
            />
            <SummaryRow
              icon={BarChart3}
              iconClass="bg-ink-100 text-ink-600"
              label="Média geral"
              sublabel="Da escola"
              value={overview?.overallAverage !== null && overview?.overallAverage !== undefined ? overview.overallAverage.toFixed(1) : "—"}
            />
          </div>
        </Card>

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
                  <p className={`text-sm font-semibold mb-1 ${SEVERITY_TEXT_COLOR[pendency.severity]}`}>{pendency.label}</p>
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

function SummaryRow({
  icon: Icon,
  iconClass,
  label,
  sublabel,
  value,
}: {
  icon: typeof Users;
  iconClass: string;
  label: string;
  sublabel: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-ink-900">{label}</p>
          <p className="text-xs text-ink-500">{sublabel}</p>
        </div>
      </div>
      <span className="font-bold text-lg text-ink900">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PROFESSOR                                                            */
/* ------------------------------------------------------------------ */

interface TeacherAssignment {
  discipline: Discipline;
  schoolClass: SchoolClass;
  assessmentCount: number;
  sessionCount: number;
}

function TeacherDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const schoolYear = new Date().getFullYear();

  async function loadData() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const [disciplines, classes, assessments, sessions, counts] = await Promise.all([
        getDisciplines(),
        getClasses(),
        getAssessmentsBySchoolYear(schoolYear),
        getAllSessions(),
        getStudentCountsByClassId(),
      ]);

      const classById: Record<string, SchoolClass> = {};
      for (const c of classes) classById[c.id] = c;

      const myDisciplines = disciplines.filter((d) => d.teacherId === profile.uid);

      const built: TeacherAssignment[] = [];
      for (const discipline of myDisciplines) {
        for (const classId of discipline.classIds) {
          const schoolClass = classById[classId];
          if (!schoolClass) continue;
          const assessmentCount = assessments.filter(
            (a) => a.disciplineId === discipline.id && a.classId === classId
          ).length;
          const sessionCount = sessions.filter(
            (s) => s.disciplineId === discipline.id && s.classId === classId
          ).length;
          built.push({ discipline, schoolClass, assessmentCount, sessionCount });
        }
      }

      setAssignments(built);
      setStudentCounts(counts);
    } catch (err) {
      setError(describeFirebaseError(err, "dashboard:carregar"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-24 animate-pulse rounded-card bg-ink-100" />
        <Card>
          <TableSkeleton columns={4} />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={loadData} />
      </Card>
    );
  }

  const pendingAssessments = assignments.filter((a) => a.assessmentCount === 0);
  const pendingAttendance = assignments.filter((a) => a.sessionCount === 0);

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6 md:p-8 bg-surface border-line shadow-sm">
        <h2 className="font-display text-2xl font-bold text-ink900 mb-1">
          Olá, {profile?.name?.split(" ")[0] || "professor(a)"}!
        </h2>
        <p className="text-ink-500 mb-6 text-sm">
          Você leciona {assignments.length} turma{assignments.length === 1 ? "" : "s"}
          {assignments.length > 0 ? ` em ${new Set(assignments.map((a) => a.discipline.id)).size} disciplina${new Set(assignments.map((a) => a.discipline.id)).size === 1 ? "" : "s"}` : ""} neste ano letivo.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate("/notas")}>
            <ClipboardList className="h-3.5 w-3.5" />
            Lançar notas
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate("/frequencia")}>
            <CalendarCheck className="h-3.5 w-3.5" />
            Registrar frequência
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate("/relatorios")}>
            <FileText className="h-3.5 w-3.5" />
            Ver relatórios
          </Button>
        </div>
      </Card>

      {(pendingAssessments.length > 0 || pendingAttendance.length > 0) && (
        <Card className="p-6 border-line shadow-sm bg-surface">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <h3 className="font-display text-base font-bold text-ink900">Pendências</h3>
          </div>
          <div className="flex flex-col gap-3">
            {pendingAssessments.map((a) => (
              <div key={`assess-${a.discipline.id}-${a.schoolClass.id}`} className="flex items-center justify-between gap-3">
                <p className="text-sm text-ink-600">
                  <span className="font-medium text-ink900">{a.discipline.name}</span> ({a.schoolClass.name}) ainda não tem
                  nenhuma avaliação cadastrada.
                </p>
                <button
                  onClick={() => navigate("/notas")}
                  className="shrink-0 text-xs font-medium text-ink-500 hover:text-ink-900 flex items-center gap-1"
                >
                  Lançar notas <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))}
            {pendingAttendance.map((a) => (
              <div key={`att-${a.discipline.id}-${a.schoolClass.id}`} className="flex items-center justify-between gap-3">
                <p className="text-sm text-ink-600">
                  <span className="font-medium text-ink900">{a.discipline.name}</span> ({a.schoolClass.name}) ainda não tem
                  nenhuma aula de frequência registrada.
                </p>
                <button
                  onClick={() => navigate("/frequencia")}
                  className="shrink-0 text-xs font-medium text-ink-500 hover:text-ink-900 flex items-center gap-1"
                >
                  Registrar frequência <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div>
        <h3 className="font-display text-lg font-bold text-ink900 mb-4 px-1">Suas turmas e disciplinas</h3>
        {assignments.length === 0 ? (
          <Card className="p-8 text-center text-sm text-ink-500">
            Você ainda não está vinculado a nenhuma disciplina. Fale com a coordenação para ser vinculado.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {assignments.map((a) => (
              <Card key={`${a.discipline.id}-${a.schoolClass.id}`} className="p-5 flex flex-col gap-3">
                <div>
                  <p className="font-display font-semibold text-ink900">{a.discipline.name}</p>
                  <p className="text-sm text-ink-500">{a.schoolClass.name}</p>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-ink-400">
                  <Users className="h-3.5 w-3.5" />
                  {studentCounts[a.schoolClass.id] ?? 0} aluno{(studentCounts[a.schoolClass.id] ?? 0) === 1 ? "" : "s"}
                </p>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ALUNO                                                                */
/* ------------------------------------------------------------------ */

function StudentDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [boletim, setBoletim] = useState<StudentBoletim | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const schoolYear = new Date().getFullYear();

  async function loadData() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const studentData = await getStudentByUid(profile.uid);
      setStudent(studentData);

      const tasks: Promise<unknown>[] = [getRecentNotifications(profile.uid)];
      if (studentData?.classId) {
        tasks.push(getStudentBoletim(studentData.id, studentData.classId, schoolYear, "annual"));
      }
      const results = await Promise.all(tasks);
      setNotifications(results[0] as Notification[]);
      if (results[1]) setBoletim(results[1] as StudentBoletim);
    } catch (err) {
      setError(describeFirebaseError(err, "dashboard:carregar"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-24 animate-pulse rounded-card bg-ink-100" />
        <CardGridSkeleton count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={loadData} />
      </Card>
    );
  }

  if (!student) {
    return (
      <Card className="p-8 text-center text-sm text-ink-500">
        Seu cadastro de aluno ainda não foi vinculado a esta conta. Fale com a secretaria.
      </Card>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 flex flex-col min-w-0 gap-6">
        <Card className="p-6 md:p-8 bg-surface border-line shadow-sm">
          <h2 className="font-display text-2xl font-bold text-ink900 mb-1">
            Olá, {student.name.split(" ")[0]}!
          </h2>
          <p className="text-ink-500 mb-6 text-sm">Este é o resumo do seu ano letivo de {schoolYear}.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate("/meu-boletim")}>
              Ver meu boletim completo
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400 mb-2">Média geral</p>
            <p className="font-display text-2xl font-bold text-ink900">
              {boletim?.overallAverage !== null && boletim?.overallAverage !== undefined ? boletim.overallAverage.toFixed(1) : "—"}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400 mb-2">Frequência</p>
            <p className="font-display text-2xl font-bold text-ink900">
              {boletim?.overallAttendanceRate !== null && boletim?.overallAttendanceRate !== undefined
                ? `${boletim.overallAttendanceRate.toFixed(0)}%`
                : "—"}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400 mb-2">Situação</p>
            {boletim ? <AcademicStatusBadge status={boletim.overallStatus} /> : <p className="text-ink-400">—</p>}
          </Card>
        </div>

        <div>
          <h3 className="font-display text-lg font-bold text-ink900 mb-4 px-1">Suas disciplinas</h3>
          {!boletim || boletim.disciplines.length === 0 ? (
            <Card className="p-8 text-center text-sm text-ink-500">
              Nenhuma disciplina vinculada à sua turma ainda.
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y divide-line">
                {boletim.disciplines.map((row) => (
                  <div key={row.discipline.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink900">{row.discipline.name}</p>
                      <p className="text-xs text-ink-400">{row.discipline.teacherName}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-sm tabular text-ink-600">
                        {row.average !== null ? row.average.toFixed(1) : "—"}
                      </span>
                      <SituationBadge situation={row.situation} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="w-full lg:w-[320px] flex-shrink-0">
        <Card className="p-6 border-line shadow-sm bg-surface">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-base font-bold text-ink900">Avisos recentes</h3>
            <div className="h-8 w-8 rounded-full bg-ink-50 flex items-center justify-center text-ink-500">
              <Bell className="h-4 w-4" />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {notifications.slice(0, 5).map((n) => (
              <button
                key={n.id}
                onClick={() => n.link && navigate(n.link)}
                className="text-left group"
              >
                <p className={`text-sm font-medium ${n.read ? "text-ink-600" : "text-ink900"}`}>{n.title}</p>
                <p className="text-xs text-ink-500 mt-0.5">{n.message}</p>
              </button>
            ))}

            {notifications.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle2 className="h-10 w-10 text-success/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-ink-600">Nenhum aviso.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
