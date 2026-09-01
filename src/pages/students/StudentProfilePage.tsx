import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarCheck,
  FileText,
  History,
  ShieldAlert,
  User,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { StudentStatusBadge } from "@/components/students/StudentStatusBadge";
import { StudentPhotoPanel } from "@/components/students/StudentPhotoPanel";
import { AcademicStatusBadge } from "@/components/boletim/AcademicStatusBadge";
import { SituationBadge } from "@/components/notes/SituationBadge";
import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";
import { DevelopmentLineChart } from "@/components/reports/DevelopmentLineChart";
import { getStudentById } from "@/services/students/studentService";
import { getClassById } from "@/services/classes/classService";
import { getTeacherStudentsOverview } from "@/services/academic/teacherOverviewService";
import {
  getStudentBoletim,
  getStudentDevelopmentSeries,
  type StudentBoletim,
  type StudentDevelopmentPoint,
} from "@/services/boletim/boletimService";
import {
  getAttendanceRecordsBySchoolYear,
  getRecordsByContext,
} from "@/services/attendance/attendanceRecordService";
import { getAuditLogsForStudent } from "@/services/audit/auditService";
import { computeEvolution } from "@/services/reports/reportsService";
import { ASSESSMENT_TERM_LABEL } from "@/types/assessment";
import { BOLETIM_PERIOD_LABEL, ALL_ASSESSMENT_TERMS, type BoletimPeriod } from "@/types/boletim";
import { calculateAttendanceRate, calculateAttendanceStatus } from "@/types/attendance";
import { AUDIT_EVENT_LABEL } from "@/types/auditLog";
import type { Student } from "@/types/student";
import type { SchoolClass } from "@/types/schoolClass";
import type { AttendanceRecord } from "@/types/attendance";
import type { AuditLog } from "@/types/auditLog";
import { describeFirebaseError } from "@/utils/firebaseError";

type Tab = "overview" | "attendance" | "history";

const SHIFT_LABEL_FALLBACK: Record<string, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  evening: "Noite",
  full: "Integral",
};

/**
 * Perfil 360° do aluno (Fase 8). Central acadêmica de UM aluno,
 * organizada em abas em vez de uma tela gigante — como pedido no
 * plano ("Evitar transformar tudo em uma única tela; utilizar abas ou
 * seções bem organizadas"). Reaproveita integralmente os services já
 * existentes de Boletim/Desenvolvimento (mesma fonte de verdade da
 * página "Meu Boletim" e do Relatório de Desenvolvimento — nenhum
 * cálculo de média/frequência/situação é duplicado aqui).
 */
export function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState<BoletimPeriod>("annual");
  const [boletim, setBoletim] = useState<StudentBoletim | null>(null);
  const [series, setSeries] = useState<StudentDevelopmentPoint[]>([]);
  const [boletimLoading, setBoletimLoading] = useState(true);
  const [boletimError, setBoletimError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("overview");
  const schoolYear = new Date().getFullYear();

  // Reaproveitada por staff ("/alunos/:studentId", só admin) e pelo
  // professor ("/meus-alunos/:studentId", escopado). O `basePath`
  // decide para onde os links "Voltar"/breadcrumb apontam, já que o
  // professor não tem mais acesso a "/alunos"/"/turmas" (ver decisão
  // registrada em AppRoutes.tsx).
  const isTeacherView = profile?.role === "teacher";
  const basePath = isTeacherView ? "/meus-alunos" : "/alunos";
  const classPath = isTeacherView ? "/minhas-turmas" : "/turmas";

  const [unauthorized, setUnauthorized] = useState(false);
  // Disciplinas do professor vinculadas a este aluno (Etapa 7) — vem
  // pronta de `getTeacherStudentsOverview` (já escopada a
  // `discipline.teacherId === profile.uid`), reaproveitada por
  // `AttendanceTab` para nunca buscar frequência fora das disciplinas
  // do professor. `null` para admin (não se aplica) ou enquanto não
  // carregou.
  const [teacherDisciplineIds, setTeacherDisciplineIds] = useState<string[] | null>(null);

  async function loadStudent() {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    setUnauthorized(false);
    try {
      const studentData = await getStudentById(studentId);

      // Verificação de escopo do professor (consequência direta de
      // "/meus-alunos/:studentId" reaproveitar este MESMO componente):
      // como a rota não impede, por si só, que um professor troque o
      // `:studentId` na URL por qualquer outro (ver nota de segurança
      // em ProtectedRoute — rota é UX, não barreira), confirmamos aqui
      // que o aluno pertence a alguma disciplina do professor logado,
      // reaproveitando a MESMA lista já usada por "/meus-alunos"
      // (`getTeacherStudentsOverview` — nenhum cálculo novo).
      if (studentData && isTeacherView && profile) {
        const myStudents = await getTeacherStudentsOverview(profile.uid, schoolYear);
        const match = myStudents.find((s) => s.student.id === studentData.id);
        if (!match) {
          setUnauthorized(true);
          setStudent(null);
          setLoading(false);
          return;
        }
        setTeacherDisciplineIds(match.disciplines.map((d) => d.id));
      }

      setStudent(studentData);
      if (studentData?.classId) {
        setSchoolClass(await getClassById(studentData.classId));
      }
    } catch (err) {
      setError(describeFirebaseError(err, "perfil-aluno:carregar"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, profile?.uid]);

  async function loadBoletim() {
    if (!student?.classId) return;
    setBoletimLoading(true);
    setBoletimError(null);
    try {
      const [boletimData, seriesData] = await Promise.all([
        getStudentBoletim(student.id, student.classId, schoolYear, period),
        getStudentDevelopmentSeries(student.id, student.classId, schoolYear),
      ]);
      setBoletim(boletimData);
      setSeries(seriesData);
    } catch (err) {
      setBoletimError(describeFirebaseError(err, "perfil-aluno:boletim"));
    } finally {
      setBoletimLoading(false);
    }
  }

  useEffect(() => {
    loadBoletim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id, student?.classId, period]);

  const evolution = computeEvolution(series.map((p) => ({ term: p.term, average: p.average })));
  const chartPoints = series.map((p) => ({
    label: ASSESSMENT_TERM_LABEL[p.term].replace("º Bimestre", "º Bim"),
    value: p.average,
  }));

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
        <ErrorState message={error} onRetry={loadStudent} />
      </Card>
    );
  }

  if (unauthorized) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Aluno fora do seu escopo"
        description="Este aluno não está matriculado em nenhuma turma/disciplina vinculada a você."
        action={{ label: "Voltar para Meus Alunos", onClick: () => navigate(basePath) }}
      />
    );
  }

  if (!student) {
    return (
      <EmptyState
        icon={User}
        title="Aluno não encontrado"
        description="Este aluno pode ter sido removido. Volte para a lista de alunos."
        action={{ label: "Voltar para Alunos", onClick: () => navigate(basePath) }}
      />
    );
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: isTeacherView ? "Meus Alunos" : "Alunos", onClick: () => navigate(basePath) },
          ...(schoolClass ? [{ label: schoolClass.name, onClick: () => navigate(classPath) }] : []),
          { label: student.name },
        ]}
      />

      <button
        type="button"
        onClick={() => navigate(basePath)}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" />
        {isTeacherView ? "Voltar para Meus Alunos" : "Voltar para Alunos"}
      </button>

      <Card className="mb-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {profile && (
              <StudentPhotoPanel
                student={student}
                canEdit={profile.role === "admin"}
                actor={{ uid: profile.uid, name: profile.name }}
                onChanged={loadStudent}
              />
            )}
            <div>
              <h2 className="font-display text-xl font-semibold text-ink900">{student.name}</h2>
              <p className="text-sm text-ink-500">{student.email}</p>
            </div>
          </div>
          <StudentStatusBadge status={student.status} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-4">
          <IdentField label="Matrícula" value={student.registrationNumber || "—"} />
          <IdentField label="Turma" value={schoolClass?.name ?? "Sem turma"} />
          <IdentField label="Período" value={String(schoolYear)} />
          <IdentField label="Turno" value={schoolClass ? SHIFT_LABEL_FALLBACK[schoolClass.shift] ?? schoolClass.shift : "—"} />
        </div>
      </Card>

      <div className="mb-6 flex gap-1 border-b border-line">
        <TabButton icon={FileText} label="Visão geral" active={tab === "overview"} onClick={() => setTab("overview")} />
        <TabButton icon={CalendarCheck} label="Frequência" active={tab === "attendance"} onClick={() => setTab("attendance")} />
        {profile?.role === "admin" && (
          <TabButton icon={History} label="Histórico" active={tab === "history"} onClick={() => setTab("history")} />
        )}
      </div>

      {tab === "overview" && (
        <OverviewTab
          period={period}
          onPeriodChange={setPeriod}
          loading={boletimLoading}
          error={boletimError}
          onRetry={loadBoletim}
          boletim={boletim}
          evolution={evolution}
          chartPoints={chartPoints}
          studentFirstName={student.name.split(" ")[0]}
        />
      )}

      {tab === "attendance" && student.classId && (
        <AttendanceTab
          studentId={student.id}
          schoolYear={schoolYear}
          boletim={boletim}
          classId={student.classId}
          teacherDisciplineIds={teacherDisciplineIds}
        />
      )}

      {tab === "history" && profile?.role === "admin" && <HistoryTab studentId={student.id} />}
    </div>
  );
}

function IdentField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-ink-400">{label}</p>
      <p className="truncate font-medium text-ink900">{value}</p>
    </div>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "border-ink-700 text-ink900" : "border-transparent text-ink-500 hover:text-ink-700"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

/* -------------------------------------------------------------------- */
/* Aba: Visão geral (resumo + notas por disciplina + desenvolvimento)    */
/* -------------------------------------------------------------------- */

function OverviewTab({
  period,
  onPeriodChange,
  loading,
  error,
  onRetry,
  boletim,
  evolution,
  chartPoints,
  studentFirstName,
}: {
  period: BoletimPeriod;
  onPeriodChange: (p: BoletimPeriod) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  boletim: StudentBoletim | null;
  evolution: number | null;
  chartPoints: { label: string; value: number | null }[];
  studentFirstName: string;
}) {
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Select label="Filtrar por período" hideLabel value={period} onChange={(e) => onPeriodChange(e.target.value as BoletimPeriod)} className="!w-auto">
          {Object.entries(BOLETIM_PERIOD_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <Card>
          <TableSkeleton columns={5} />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={onRetry} />
        </Card>
      ) : !boletim ? (
        <EmptyState icon={BookOpen} title="Sem turma vinculada" description="Este aluno ainda não está vinculado a uma turma." />
      ) : (
        <>
          <Card className="mb-6 p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">Média geral</p>
                <p className="font-display text-xl font-semibold text-ink900">
                  {boletim.overallAverage === null ? "—" : boletim.overallAverage.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">Frequência</p>
                <p className="font-display text-xl font-semibold text-ink900">
                  {boletim.overallAttendanceRate === null ? "—" : `${boletim.overallAttendanceRate}%`}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">Disciplinas</p>
                <p className="font-display text-xl font-semibold text-ink900">{boletim.disciplines.length}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">Situação geral</p>
                <AcademicStatusBadge status={boletim.overallStatus} />
              </div>
            </div>
          </Card>

          <Card className="mb-6 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-ink900">Evolução de {studentFirstName}</h3>
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
            <EmptyState icon={BookOpen} title="Nenhuma disciplina" description="Ainda não há disciplinas vinculadas a esta turma." />
          ) : (
            <Card className="overflow-hidden">
              <div className="border-b border-line px-4 py-3.5">
                <p className="font-medium text-ink900">Notas por disciplina</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-400">
                      <th className="px-4 py-3 font-medium">Disciplina</th>
                      <th className="px-4 py-3 font-medium">Professor</th>
                      <th className="px-4 py-3 font-medium">Média</th>
                      <th className="px-4 py-3 font-medium">Frequência</th>
                      <th className="px-4 py-3 font-medium">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boletim.disciplines.map((row) => (
                      <tr key={row.discipline.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 font-medium text-ink900">{row.discipline.name}</td>
                        <td className="px-4 py-3 text-ink-600">{row.discipline.teacherName || "—"}</td>
                        <td className="px-4 py-3 tabular text-ink-600">{row.average === null ? "—" : row.average.toFixed(1)}</td>
                        <td className="px-4 py-3 tabular text-ink-600">{row.attendanceRate === null ? "—" : `${row.attendanceRate}%`}</td>
                        <td className="px-4 py-3">
                          <SituationBadge situation={row.situation} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Aba: Frequência (percentual, faltas, presença, por disciplina)        */
/* -------------------------------------------------------------------- */

function AttendanceTab({
  studentId,
  schoolYear,
  boletim,
  classId,
  teacherDisciplineIds,
}: {
  studentId: string;
  schoolYear: number;
  boletim: StudentBoletim | null;
  classId: string | null;
  /**
   * Etapa 7 — quando não-nulo (visão do professor), restringe a busca
   * de presença às disciplinas informadas em vez do ano letivo inteiro
   * (ver `load` abaixo). `null` = visão do admin, sem restrição.
   */
  teacherDisciplineIds: string[] | null;
}) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (teacherDisciplineIds !== null) {
        // Etapa 7 — visão do professor: em vez de uma única consulta
        // ampla de `attendanceRecords` do ano letivo inteiro (que
        // dependia só da UI para esconder disciplinas de outros
        // professores), busca uma consulta por disciplina PRÓPRIA x
        // bimestre, já filtrada por `studentId` no servidor — mesmo
        // padrão de `boletimService.getStudentBoletim`. Sem `classId`
        // (aluno sem turma) não há o que buscar.
        if (!classId || teacherDisciplineIds.length === 0) {
          setRecords([]);
        } else {
          const results = await Promise.all(
            teacherDisciplineIds.flatMap((disciplineId) =>
              ALL_ASSESSMENT_TERMS.map((term) =>
                getRecordsByContext(disciplineId, classId, schoolYear, term, studentId)
              )
            )
          );
          setRecords(results.flat());
        }
      } else {
        // Uma única consulta de campo simples (admin lê `attendanceRecords`
        // sem restrição por aluno — ver firestore.rules), filtrada aqui no
        // cliente para este aluno. Evita N consultas (uma por disciplina x
        // bimestre) só para montar os totais de faltas/presenças abaixo.
        const all = await getAttendanceRecordsBySchoolYear(schoolYear);
        setRecords(all.filter((r) => r.studentId === studentId));
      }
    } catch (err) {
      setError(describeFirebaseError(err, "perfil-aluno:frequencia"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, schoolYear, classId, teacherDisciplineIds]);

  const presentCount = records.filter((r) => r.status === "present").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const totalCount = records.length;
  const rate = totalCount > 0 ? calculateAttendanceRate(presentCount, totalCount) : null;
  const status = rate !== null ? calculateAttendanceStatus(rate) : null;

  const byDiscipline = useMemo(() => {
    const map = new Map<string, { present: number; absent: number }>();
    for (const record of records) {
      const entry = map.get(record.disciplineId) ?? { present: 0, absent: 0 };
      if (record.status === "present") entry.present += 1;
      else entry.absent += 1;
      map.set(record.disciplineId, entry);
    }
    return map;
  }, [records]);

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

  if (totalCount === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="Nenhum registro de frequência"
        description="Ainda não há aulas registradas para este aluno neste ano letivo."
      />
    );
  }

  return (
    <div>
      <Card className="mb-6 p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">Percentual</p>
            <p className="font-display text-xl font-semibold text-ink900">{rate === null ? "—" : `${rate}%`}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">Presenças</p>
            <p className="font-display text-xl font-semibold text-success">{presentCount}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">Faltas</p>
            <p className="font-display text-xl font-semibold text-danger">{absentCount}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">Situação</p>
            {status ? <AttendanceStatusBadge status={status} /> : "—"}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3.5">
          <p className="font-medium text-ink900">Frequência por disciplina</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-400">
                <th className="px-4 py-3 font-medium">Disciplina</th>
                <th className="px-4 py-3 font-medium">Presenças</th>
                <th className="px-4 py-3 font-medium">Faltas</th>
                <th className="px-4 py-3 font-medium">Percentual</th>
              </tr>
            </thead>
            <tbody>
              {(boletim?.disciplines ?? []).map((row) => {
                const counts = byDiscipline.get(row.discipline.id) ?? { present: 0, absent: 0 };
                return (
                  <tr key={row.discipline.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink900">{row.discipline.name}</td>
                    <td className="px-4 py-3 tabular text-success">{counts.present}</td>
                    <td className="px-4 py-3 tabular text-danger">{counts.absent}</td>
                    <td className="px-4 py-3 tabular text-ink-600">
                      {row.attendanceRate === null ? "—" : `${row.attendanceRate}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Aba: Histórico (admin) — eventos de auditoria relacionados ao aluno   */
/* -------------------------------------------------------------------- */

function HistoryTab({ studentId }: { studentId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setLogs(await getAuditLogsForStudent(studentId));
    } catch (err) {
      setError(describeFirebaseError(err, "perfil-aluno:historico"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

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

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Nenhum evento registrado"
        description="Ainda não há alterações de nota, frequência ou avaliação registradas para este aluno."
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-line">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 px-4 py-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600">
              <Award className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink900">{AUDIT_EVENT_LABEL[log.type]}</p>
              <p className="mt-0.5 text-xs text-ink-500">
                {log.disciplineName && `${log.disciplineName} · `}
                {log.assessmentName && `${log.assessmentName} · `}
                {log.before !== null && log.after !== null && `${log.before} → ${log.after}`}
              </p>
              <p className="mt-1 text-xs text-ink-400">por {log.actorName}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
