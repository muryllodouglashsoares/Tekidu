import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarCheck, CalendarPlus, ClipboardList, History, ListChecks, Table2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/layout/EmptyState";
import { AttendanceFilters } from "@/components/attendance/AttendanceFilters";
import { AttendanceStats } from "@/components/attendance/AttendanceStats";
import { AttendanceSummaryTable } from "@/components/attendance/AttendanceSummaryTable";
import { AttendanceByDateTable } from "@/components/attendance/AttendanceByDateTable";
import { AttendanceRegisterList } from "@/components/attendance/AttendanceRegisterList";
import { AttendanceSessionModal } from "@/components/attendance/AttendanceSessionModal";
import { AttendanceHistoryTable, type AttendanceHistoryRow } from "@/components/attendance/AttendanceHistoryTable";
import { getClasses } from "@/services/classes/classService";
import { getDisciplines } from "@/services/disciplines/disciplineService";
import { getStudents } from "@/services/students/studentService";
import {
  getSessionsByContext,
  getAllSessions,
  createSession,
  deleteSession,
} from "@/services/attendanceSessions/attendanceSessionService";
import {
  getRecordsByContext,
  getRecordsBySessionIds,
  saveAttendanceRecord,
} from "@/services/attendance/attendanceRecordService";
import type { AssessmentTerm } from "@/types/assessment";
import type { SchoolClass } from "@/types/schoolClass";
import type { Discipline } from "@/types/discipline";
import type { Student } from "@/types/student";
import {
  summarizeAttendance,
  type AttendanceRecord,
  type AttendanceRecordStatus,
  type AttendanceSession,
} from "@/types/attendance";

type Tab = "register" | "history";
type ViewMode = "resumo" | "porData";

export function AttendancePage() {
  const { profile } = useAuth();
  const canEdit = profile?.role === "admin" || profile?.role === "teacher";

  const [activeTab, setActiveTab] = useState<Tab>("register");

  // -------------------------------------------------------------
  // Dados base (turmas, disciplinas, alunos) — mesmo padrão de
  // carregamento único usado em Notas, reaproveitado aqui para resolver
  // os filtros dependentes em memória.
  // -------------------------------------------------------------
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [baseLoading, setBaseLoading] = useState(true);
  const [baseError, setBaseError] = useState<string | null>(null);

  async function loadBaseData() {
    setBaseLoading(true);
    setBaseError(null);
    try {
      const [classesData, disciplinesData, studentsData] = await Promise.all([
        getClasses(),
        getDisciplines(),
        getStudents(),
      ]);
      setClasses(classesData);
      setDisciplines(disciplinesData);
      setStudents(studentsData);
    } catch {
      setBaseError("Não foi possível carregar os dados acadêmicos.");
    } finally {
      setBaseLoading(false);
    }
  }

  useEffect(() => {
    loadBaseData();
  }, []);

  const classNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of classes) map[c.id] = c.name;
    return map;
  }, [classes]);

  const disciplineNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of disciplines) map[d.id] = d.name;
    return map;
  }, [disciplines]);

  // -------------------------------------------------------------
  // Filtros dependentes (aba "Registro de presença"): Ano → Turma →
  // Disciplina → Bimestre — mesma cadeia de NotesPage.
  // -------------------------------------------------------------
  const yearOptions = useMemo(
    () => Array.from(new Set(classes.map((c) => c.schoolYear))).sort((a, b) => b - a),
    [classes]
  );
  const [yearFilter, setYearFilter] = useState<string>("");
  useEffect(() => {
    if (!yearFilter && yearOptions.length > 0) setYearFilter(String(yearOptions[0]));
  }, [yearOptions, yearFilter]);

  const [classId, setClassId] = useState<string>("");
  const [disciplineId, setDisciplineId] = useState<string>("");
  const [term, setTerm] = useState<string>("");

  const classOptions = useMemo(
    () => classes.filter((c) => String(c.schoolYear) === yearFilter),
    [classes, yearFilter]
  );

  const disciplineOptions = useMemo(() => {
    if (!classId) return [];
    return disciplines.filter((d) => String(d.schoolYear) === yearFilter && d.classIds.includes(classId));
  }, [disciplines, classId, yearFilter]);

  useEffect(() => {
    setDisciplineId("");
    setTerm("");
  }, [classId, yearFilter]);
  useEffect(() => {
    setTerm("");
  }, [disciplineId]);

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId) ?? null, [classes, classId]);
  const selectedDiscipline = useMemo(
    () => disciplines.find((d) => d.id === disciplineId) ?? null,
    [disciplines, disciplineId]
  );

  const linkedStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter((s) => s.classId === selectedClass.id);
  }, [students, selectedClass]);

  const contextReady = !!(classId && disciplineId && term && yearFilter);

  // -------------------------------------------------------------
  // Aulas (AttendanceSession) + registros (AttendanceRecord) do
  // contexto selecionado.
  // -------------------------------------------------------------
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  async function loadContextData() {
    if (!contextReady) return;
    setContextLoading(true);
    setContextError(null);
    try {
      const [sessionsData, recordsData] = await Promise.all([
        getSessionsByContext(disciplineId, classId, Number(yearFilter), term as AssessmentTerm),
        getRecordsByContext(disciplineId, classId, Number(yearFilter), term as AssessmentTerm),
      ]);
      setSessions(sessionsData);
      setRecords(recordsData);
      // Mantém a aula selecionada se ela ainda existir; caso contrário,
      // seleciona a mais recente (maior `order`) por padrão.
      setSelectedSessionId((prev) => {
        if (prev && sessionsData.some((s) => s.id === prev)) return prev;
        if (sessionsData.length === 0) return "";
        return sessionsData.reduce((latest, s) => (s.order > latest.order ? s : latest)).id;
      });
    } catch {
      setContextError("Não foi possível carregar a frequência deste contexto.");
    } finally {
      setContextLoading(false);
    }
  }

  useEffect(() => {
    if (contextReady) loadContextData();
    else {
      setSessions([]);
      setRecords([]);
      setSelectedSessionId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextReady, classId, disciplineId, term, yearFilter]);

  // studentId -> resumo (presenças/faltas/frequência/situação)
  const summaryByStudent = useMemo(() => {
    const map: Record<string, ReturnType<typeof summarizeAttendance>> = {};
    for (const student of linkedStudents) {
      map[student.id] = summarizeAttendance(
        student.id,
        records.filter((r) => r.studentId === student.id)
      );
    }
    return map;
  }, [linkedStudents, records]);

  // studentId -> sessionId -> registro
  const recordsByStudentAndSession = useMemo(() => {
    const map: Record<string, Record<string, AttendanceRecord | undefined>> = {};
    for (const record of records) {
      if (!map[record.studentId]) map[record.studentId] = {};
      map[record.studentId][record.sessionId] = record;
    }
    return map;
  }, [records]);

  const currentSessionStatusByStudent = useMemo(() => {
    const map: Record<string, AttendanceRecordStatus | undefined> = {};
    if (!selectedSessionId) return map;
    for (const student of linkedStudents) {
      map[student.id] = recordsByStudentAndSession[student.id]?.[selectedSessionId]?.status;
    }
    return map;
  }, [linkedStudents, recordsByStudentAndSession, selectedSessionId]);

  const currentSessionCounts = useMemo(() => {
    if (!selectedSessionId) return null;
    const values = Object.values(currentSessionStatusByStudent);
    return {
      present: values.filter((v) => v === "present").length,
      absent: values.filter((v) => v === "absent").length,
    };
  }, [currentSessionStatusByStudent, selectedSessionId]);

  const [viewMode, setViewMode] = useState<ViewMode>("resumo");

  async function handleMark(studentId: string, status: AttendanceRecordStatus) {
    if (!selectedSessionId) return;
    setSaveError(null);
    const existing = records.find((r) => r.studentId === studentId && r.sessionId === selectedSessionId);
    try {
      await saveAttendanceRecord(existing?.id ?? null, {
        studentId,
        sessionId: selectedSessionId,
        disciplineId,
        classId,
        schoolYear: Number(yearFilter),
        term: term as AssessmentTerm,
        status,
      });
      setRecords((prev) => {
        if (existing) {
          return prev.map((r) => (r.id === existing.id ? { ...r, status } : r));
        }
        return [
          ...prev,
          {
            id: `temp-${studentId}-${selectedSessionId}`,
            studentId,
            sessionId: selectedSessionId,
            disciplineId,
            classId,
            schoolYear: Number(yearFilter),
            term: term as AssessmentTerm,
            status,
            createdAt: null,
            updatedAt: null,
          },
        ];
      });
    } catch {
      setSaveError("Não foi possível salvar a presença. Tente novamente.");
      throw new Error("save-failed");
    }
  }

  async function handleCreateSession(date: string) {
    const nextOrder = sessions.length > 0 ? Math.max(...sessions.map((s) => s.order)) + 1 : 0;
    const label = `Aula ${String(nextOrder + 1).padStart(2, "0")}`;
    await createSession({
      disciplineId,
      classId,
      schoolYear: Number(yearFilter),
      term: term as AssessmentTerm,
      date,
      label,
      order: nextOrder,
    });
    await loadContextData();
  }

  async function handleDeleteSession(sessionId: string) {
    await deleteSession(sessionId);
    if (selectedSessionId === sessionId) setSelectedSessionId("");
    await loadContextData();
  }

  // -------------------------------------------------------------
  // Aba "Histórico" — visão transversal por aula, filtrável por
  // turma/disciplina (independente do contexto ano/bimestre acima).
  // -------------------------------------------------------------
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historySessions, setHistorySessions] = useState<AttendanceSession[]>([]);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [historyClassFilter, setHistoryClassFilter] = useState<string>("");
  const [historyDisciplineFilter, setHistoryDisciplineFilter] = useState<string>("");

  async function loadHistoryData() {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const allSessions = await getAllSessions();
      const allRecords = await getRecordsBySessionIds(allSessions.map((s) => s.id));
      setHistorySessions(allSessions);
      setHistoryRecords(allRecords);
      setHistoryLoaded(true);
    } catch {
      setHistoryError("Não foi possível carregar o histórico de frequência.");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "history" && !historyLoaded && !historyLoading) {
      loadHistoryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, historyLoaded, historyLoading]);

  const historyRows: AttendanceHistoryRow[] = useMemo(() => {
    return historySessions
      .filter((s) => !historyClassFilter || s.classId === historyClassFilter)
      .filter((s) => !historyDisciplineFilter || s.disciplineId === historyDisciplineFilter)
      .map((session) => {
        const sessionRecords = historyRecords.filter((r) => r.sessionId === session.id);
        const present = sessionRecords.filter((r) => r.status === "present").length;
        const absent = sessionRecords.filter((r) => r.status === "absent").length;
        const total = present + absent;
        const rate = total === 0 ? null : Math.round((present / total) * 1000) / 10;
        return {
          session,
          className: classNameById[session.classId] ?? "—",
          disciplineName: disciplineNameById[session.disciplineId] ?? "—",
          present,
          absent,
          rate,
        };
      })
      .sort((a, b) => (a.session.date < b.session.date ? 1 : -1));
  }, [historySessions, historyRecords, historyClassFilter, historyDisciplineFilter, classNameById, disciplineNameById]);

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink900">Frequência</h2>
          <p className="text-sm text-ink-500">Registro e acompanhamento da frequência dos alunos</p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 border-b border-line" role="tablist">
        <TabButton
          icon={ListChecks}
          label="Registro de presença"
          active={activeTab === "register"}
          onClick={() => setActiveTab("register")}
        />
        <TabButton
          icon={History}
          label="Histórico"
          active={activeTab === "history"}
          onClick={() => setActiveTab("history")}
        />
      </div>

      {activeTab === "register" ? (
        <RegisterTab
          baseLoading={baseLoading}
          baseError={baseError}
          onRetryBase={loadBaseData}
          yearOptions={yearOptions}
          yearFilter={yearFilter}
          onYearChange={setYearFilter}
          classOptions={classOptions}
          classId={classId}
          onClassChange={setClassId}
          disciplineOptions={disciplineOptions}
          disciplineId={disciplineId}
          onDisciplineChange={setDisciplineId}
          term={term}
          onTermChange={setTerm}
          contextLoading={contextLoading}
          contextError={contextError}
          onRetryContext={loadContextData}
          selectedClass={selectedClass}
          selectedDiscipline={selectedDiscipline}
          linkedStudents={linkedStudents}
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelectedSessionChange={setSelectedSessionId}
          onOpenSessionModal={() => setShowSessionModal(true)}
          summaryByStudent={summaryByStudent}
          recordsByStudentAndSession={recordsByStudentAndSession}
          currentSessionStatusByStudent={currentSessionStatusByStudent}
          currentSessionCounts={currentSessionCounts}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          canEdit={canEdit}
          saveError={saveError}
          onMark={handleMark}
        />
      ) : (
        <HistoryTab
          loading={historyLoading}
          error={historyError}
          onRetry={loadHistoryData}
          rows={historyRows}
          classes={classes}
          disciplines={disciplines}
          classFilter={historyClassFilter}
          onClassFilterChange={setHistoryClassFilter}
          disciplineFilter={historyDisciplineFilter}
          onDisciplineFilterChange={setHistoryDisciplineFilter}
        />
      )}

      {showSessionModal && selectedDiscipline && selectedClass && (
        <AttendanceSessionModal
          disciplineName={selectedDiscipline.name}
          className={selectedClass.name}
          sessions={sessions}
          onClose={() => setShowSessionModal(false)}
          onCreate={handleCreateSession}
          onDelete={handleDeleteSession}
          onSelect={(sessionId) => {
            setSelectedSessionId(sessionId);
            setShowSessionModal(false);
          }}
        />
      )}
    </div>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof ListChecks;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "border-ink-700 text-ink900" : "border-transparent text-ink-500 hover:text-ink-700"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

interface RegisterTabProps {
  baseLoading: boolean;
  baseError: string | null;
  onRetryBase: () => void;
  yearOptions: number[];
  yearFilter: string;
  onYearChange: (v: string) => void;
  classOptions: SchoolClass[];
  classId: string;
  onClassChange: (v: string) => void;
  disciplineOptions: Discipline[];
  disciplineId: string;
  onDisciplineChange: (v: string) => void;
  term: string;
  onTermChange: (v: string) => void;
  contextLoading: boolean;
  contextError: string | null;
  onRetryContext: () => void;
  selectedClass: SchoolClass | null;
  selectedDiscipline: Discipline | null;
  linkedStudents: Student[];
  sessions: AttendanceSession[];
  selectedSessionId: string;
  onSelectedSessionChange: (v: string) => void;
  onOpenSessionModal: () => void;
  summaryByStudent: Record<string, ReturnType<typeof summarizeAttendance>>;
  recordsByStudentAndSession: Record<string, Record<string, AttendanceRecord | undefined>>;
  currentSessionStatusByStudent: Record<string, AttendanceRecordStatus | undefined>;
  currentSessionCounts: { present: number; absent: number } | null;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  canEdit: boolean;
  saveError: string | null;
  onMark: (studentId: string, status: AttendanceRecordStatus) => Promise<void>;
}

function RegisterTab({
  baseLoading,
  baseError,
  onRetryBase,
  yearOptions,
  yearFilter,
  onYearChange,
  classOptions,
  classId,
  onClassChange,
  disciplineOptions,
  disciplineId,
  onDisciplineChange,
  term,
  onTermChange,
  contextLoading,
  contextError,
  onRetryContext,
  selectedClass,
  selectedDiscipline,
  linkedStudents,
  sessions,
  selectedSessionId,
  onSelectedSessionChange,
  onOpenSessionModal,
  summaryByStudent,
  recordsByStudentAndSession,
  currentSessionStatusByStudent,
  currentSessionCounts,
  viewMode,
  onViewModeChange,
  canEdit,
  saveError,
  onMark,
}: RegisterTabProps) {
  return (
    <>
      <AttendanceFilters
        yearOptions={yearOptions}
        yearFilter={yearFilter}
        onYearChange={onYearChange}
        classOptions={classOptions}
        classId={classId}
        onClassChange={onClassChange}
        disciplineOptions={disciplineOptions}
        disciplineId={disciplineId}
        onDisciplineChange={onDisciplineChange}
        term={term}
        onTermChange={onTermChange}
      />

      {baseLoading ? (
        <Card>
          <Spinner label="Carregando dados acadêmicos..." />
        </Card>
      ) : baseError ? (
        <Card className="p-8 text-center">
          <p className="mb-3 text-sm text-danger">{baseError}</p>
          <Button variant="secondary" onClick={onRetryBase}>
            Tentar novamente
          </Button>
        </Card>
      ) : !classId ? (
        <EmptyState
          icon={Users}
          title="Selecione uma turma"
          description="Escolha o ano letivo e a turma para começar a registrar ou consultar a frequência."
        />
      ) : !disciplineId ? (
        <EmptyState
          icon={BookOpen}
          title="Selecione uma disciplina"
          description="Escolha a disciplina lecionada nesta turma para continuar."
        />
      ) : !term ? (
        <EmptyState
          icon={ClipboardList}
          title="Selecione o bimestre"
          description="Escolha o período letivo para ver as aulas e a frequência registrada."
        />
      ) : contextLoading ? (
        <Card>
          <Spinner label="Carregando frequência..." />
        </Card>
      ) : contextError ? (
        <Card className="p-8 text-center">
          <p className="mb-3 text-sm text-danger">{contextError}</p>
          <Button variant="secondary" onClick={onRetryContext}>
            Tentar novamente
          </Button>
        </Card>
      ) : (
        <>
          <AttendanceStats
            summaries={linkedStudents.map((s) => summaryByStudent[s.id])}
            currentSession={selectedSessionId ? currentSessionCounts : null}
          />

          {saveError && (
            <p role="alert" className="mb-4 text-sm text-danger">
              {saveError}
            </p>
          )}

          <Card className="mb-6 overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink900">{selectedDiscipline?.name}</p>
                <p className="truncate text-xs text-ink-500">
                  {selectedClass?.name} · {linkedStudents.length} aluno{linkedStudents.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {sessions.length > 0 && (
                  <Select
                    label="Selecionar aula"
                    hideLabel
                    value={selectedSessionId}
                    onChange={(e) => onSelectedSessionChange(e.target.value)}
                    className="min-w-[11rem]"
                  >
                    {[...sessions]
                      .sort((a, b) => b.order - a.order)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label} — {formatDatePtBr(s.date)}
                        </option>
                      ))}
                  </Select>
                )}
                {canEdit && (
                  <Button variant="secondary" onClick={onOpenSessionModal}>
                    <CalendarPlus className="h-4 w-4" />
                    Aulas
                  </Button>
                )}
              </div>
            </div>

            {sessions.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="Nenhuma frequência registrada"
                description="Cadastre a primeira aula deste bimestre para começar a lançar presença."
              />
            ) : !selectedSessionId ? (
              <div className="p-8 text-center text-sm text-ink-500">Selecione uma aula para lançar a presença.</div>
            ) : (
              <AttendanceRegisterList
                students={linkedStudents}
                statusByStudent={currentSessionStatusByStudent}
                canEdit={canEdit}
                onMark={onMark}
              />
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center gap-1 border-b border-line px-4 py-2">
              <ViewModeButton
                icon={Table2}
                label="Resumo"
                active={viewMode === "resumo"}
                onClick={() => onViewModeChange("resumo")}
              />
              <ViewModeButton
                icon={CalendarCheck}
                label="Por data"
                active={viewMode === "porData"}
                onClick={() => onViewModeChange("porData")}
              />
            </div>

            {viewMode === "resumo" ? (
              <AttendanceSummaryTable students={linkedStudents} summaryByStudent={summaryByStudent} />
            ) : (
              <AttendanceByDateTable
                students={linkedStudents}
                sessions={sessions}
                recordsByStudentAndSession={recordsByStudentAndSession}
              />
            )}
          </Card>
        </>
      )}
    </>
  );
}

function ViewModeButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Table2;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-card px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-ink-700 text-white" : "text-ink-600 hover:bg-ink-50"
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

interface HistoryTabProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  rows: AttendanceHistoryRow[];
  classes: SchoolClass[];
  disciplines: Discipline[];
  classFilter: string;
  onClassFilterChange: (v: string) => void;
  disciplineFilter: string;
  onDisciplineFilterChange: (v: string) => void;
}

function HistoryTab({
  loading,
  error,
  onRetry,
  rows,
  classes,
  disciplines,
  classFilter,
  onClassFilterChange,
  disciplineFilter,
  onDisciplineFilterChange,
}: HistoryTabProps) {
  return (
    <>
      <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex items-center gap-2 pb-2.5 text-sm text-ink-500 sm:pb-3">
          <History className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Filtros:</span>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-2">
          <Select
            label="Filtrar por turma"
            hideLabel
            value={classFilter}
            onChange={(e) => onClassFilterChange(e.target.value)}
          >
            <option value="">Todas as turmas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            label="Filtrar por disciplina"
            hideLabel
            value={disciplineFilter}
            onChange={(e) => onDisciplineFilterChange(e.target.value)}
          >
            <option value="">Todas as disciplinas</option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {loading ? (
        <Card>
          <Spinner label="Carregando histórico..." />
        </Card>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="mb-3 text-sm text-danger">{error}</p>
          <Button variant="secondary" onClick={onRetry}>
            Tentar novamente
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <AttendanceHistoryTable rows={rows} />
        </Card>
      )}
    </>
  );
}

function formatDatePtBr(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}
