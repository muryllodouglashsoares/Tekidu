import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, School, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TableSkeleton, CardGridSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportIndicatorCards } from "@/components/reports/ReportIndicatorCards";
import { ClassReportCard } from "@/components/reports/ClassReportCard";
import { StudentReportTable } from "@/components/reports/StudentReportTable";
import { DevelopmentLineChart } from "@/components/reports/DevelopmentLineChart";
import { StudentDevelopmentReport } from "@/components/reports/StudentDevelopmentReport";
import { getClasses } from "@/services/classes/classService";
import { getDisciplines, getDisciplinesForClass } from "@/services/disciplines/disciplineService";
import { getStudents } from "@/services/students/studentService";
import { getGradesBySchoolYear, getGradesByDisciplineIds } from "@/services/grades/gradeService";
import { getAttendanceRecordsBySchoolYear, getAttendanceRecordsByDisciplineIds } from "@/services/attendance/attendanceRecordService";
import { getStudentBoletim, getStudentDevelopmentSeries, type StudentBoletim } from "@/services/boletim/boletimService";
import {
  computeClassSummaries,
  computeReportOverview,
  computeStudentSummaries,
  type ReportScope,
} from "@/services/reports/reportsService";
import { useAuth } from "@/contexts/AuthContext";
import { ASSESSMENT_TERM_LABEL, type AssessmentTerm } from "@/types/assessment";
import type { SchoolClass } from "@/types/schoolClass";
import type { Discipline } from "@/types/discipline";
import type { Student } from "@/types/student";
import type { Grade } from "@/types/grade";
import type { AttendanceRecord } from "@/types/attendance";
import type { StudentDevelopmentPoint } from "@/services/boletim/boletimService";
import { describeFirebaseError } from "@/utils/firebaseError";

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();

  // -------------------------------------------------------------
  // Dados base do ano letivo selecionado — carregados uma única vez
  // por ano (mesmo padrão de Notas/Frequência/Boletim), e reaproveitados
  // por todos os níveis da tela (visão geral, turma, aluno).
  // -------------------------------------------------------------
  const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [baseLoading, setBaseLoading] = useState(true);
  const [baseError, setBaseError] = useState<string | null>(null);

  const yearOptions = useMemo(
    () => Array.from(new Set(allClasses.map((c) => c.schoolYear))).sort((a, b) => b - a),
    [allClasses]
  );
  const yearFilter = searchParams.get("year") ?? (yearOptions[0] ? String(yearOptions[0]) : "");

  async function loadBaseData() {
    setBaseLoading(true);
    setBaseError(null);
    try {
      const classesData = await getClasses();
      const yearToLoad = Number(searchParams.get("year")) || classesData[0]?.schoolYear || new Date().getFullYear();
      const disciplinesData = await getDisciplines();

      // Etapa 7 — escopo de disciplina para o professor: `/relatorios`
      // é acessível a admin E professor. Antes, um professor buscava
      // as notas/frequência do ANO LETIVO INTEIRO (`getXBySchoolYear`,
      // sem filtro de disciplina) para montar os indicadores — a leitura
      // em si não era restrita às disciplinas do professor, só a UI
      // filtrava depois. Ver o mesmo racional em
      // `teacherOverviewService.loadTeacherRawData`.
      const isTeacher = profile?.role === "teacher";
      const myDisciplineIds = isTeacher
        ? disciplinesData.filter((d) => d.teacherId === profile?.uid).map((d) => d.id)
        : [];

      const [studentsData, gradesData, recordsData] = await Promise.all([
        getStudents(),
        isTeacher ? getGradesByDisciplineIds(myDisciplineIds, yearToLoad) : getGradesBySchoolYear(yearToLoad),
        isTeacher
          ? getAttendanceRecordsByDisciplineIds(myDisciplineIds, yearToLoad)
          : getAttendanceRecordsBySchoolYear(yearToLoad),
      ]);
      setAllClasses(classesData);
      setDisciplines(disciplinesData);
      setStudents(studentsData);
      setGrades(gradesData);
      setRecords(recordsData);
    } catch (error) {
      setBaseError(describeFirebaseError(error, "relatórios:dados-base"));
    } finally {
      setBaseLoading(false);
    }
  }

  useEffect(() => {
    loadBaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearFilter]);

  const classes = useMemo(() => {
    const inYear = allClasses.filter((c) => String(c.schoolYear) === yearFilter);
    // Mesmo escopo de turma do professor já aplicado em Notas/
    // Frequência/Boletim: só turmas onde o professor leciona alguma
    // disciplina aparecem nos indicadores e no fluxo Turma → Alunos.
    if (profile?.role !== "teacher") return inYear;
    const myClassIds = new Set(
      disciplines.filter((d) => d.teacherId === profile.uid).flatMap((d) => d.classIds)
    );
    return inYear.filter((c) => myClassIds.has(c.id));
  }, [allClasses, yearFilter, profile, disciplines]);

  // -------------------------------------------------------------
  // Estado compartilhado pelos fluxos de navegação (chart/filtros →
  // turma → aluno, e busca direta) — na query string, mesmo padrão do
  // Boletim, para o botão "voltar" do navegador funcionar.
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // `classId`/`disciplineId`/`term` = filtros do gráfico (item 10).
  // `view` = turma "aberta" para navegação Turma → Alunos (item 15) —
  // é um estado DIFERENTE do filtro: selecionar uma turma no filtro só
  // deve atualizar o gráfico, nunca navegar sozinho para a lista de
  // alunos (só o botão "Ver alunos" faz isso).
  // -------------------------------------------------------------
  const classId = searchParams.get("classId") ?? "";
  const disciplineId = searchParams.get("disciplineId") ?? "";
  const term = searchParams.get("term") ?? "";
  const view = searchParams.get("view") ?? "";
  const studentId = searchParams.get("studentId") ?? "";

  function updateParams(patch: Record<string, string | undefined>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(patch)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      return next;
    });
  }

  // Etapa 7 — mesmo escopo de disciplina do professor já aplicado em
  // Notas/Frequência/Boletim (ver nota lá para o racional completo).
  const myDisciplines = useMemo(() => {
    if (profile?.role !== "teacher") return disciplines;
    return disciplines.filter((d) => d.teacherId === profile.uid);
  }, [disciplines, profile]);

  const disciplineOptions = useMemo(() => {
    if (!classId) return [];
    return getDisciplinesForClass(myDisciplines, classId);
  }, [myDisciplines, classId]);

  const filterClass = useMemo(() => classes.find((c) => c.id === classId) ?? null, [classes, classId]);
  const selectedDiscipline = useMemo(
    () => myDisciplines.find((d) => d.id === disciplineId) ?? null,
    [myDisciplines, disciplineId]
  );
  // Etapa 7 — `view` (turma "aberta" via URL) resolvida a partir de
  // `classes` (já escopada ao professor), não de `allClasses` (todos
  // os anos/turmas da escola): sem isso, um professor digitando
  // `?view=<id de turma alheia>` na URL conseguiria abrir a lista de
  // alunos de uma turma onde não leciona, mesmo sem aparecer no
  // seletor. Para admin, `classes` cobre o ano selecionado; a
  // navegação entre anos já passa por `yearFilter`, então isso não
  // reduz nada do que o admin via antes.
  const viewClass = useMemo(() => classes.find((c) => c.id === view) ?? null, [classes, view]);
  const studentsInClass = useMemo(
    () => (viewClass ? students.filter((s) => s.classId === viewClass.id) : []),
    [students, viewClass]
  );
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId) ?? null,
    [students, studentId]
  );
  const selectedStudentClass = useMemo(
    () => (selectedStudent?.classId ? allClasses.find((c) => c.id === selectedStudent.classId) ?? null : null),
    [allClasses, selectedStudent]
  );

  const scope: ReportScope = {
    classId: classId || undefined,
    disciplineId: disciplineId || undefined,
    term: (term as AssessmentTerm) || undefined,
  };

  const overview = useMemo(
    () => computeReportOverview(students, grades, records, scope),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [students, grades, records, classId, disciplineId, term]
  );

  const classSummaries = useMemo(
    () =>
      computeClassSummaries(classes, students, grades, records, {
        disciplineId: disciplineId || undefined,
        term: (term as AssessmentTerm) || undefined,
      }),
    [classes, students, grades, records, disciplineId, term]
  );

  const studentSummaries = useMemo(
    () => (viewClass ? computeStudentSummaries(students, grades, records, viewClass.id) : []),
    [students, grades, records, viewClass]
  );

  const contextLabel = buildContextLabel(filterClass, selectedDiscipline, term as AssessmentTerm | "");

  // -------------------------------------------------------------
  // Busca individual (item 16) — atalho direto para o relatório do
  // aluno, sem passar pelo fluxo Turma → Alunos.
  //
  // Etapa 7 — escopo para o professor: a busca livre por nome/matrícula
  // pesquisava em `students` (toda a escola), o que deixava um
  // professor descobrir/selecionar QUALQUER aluno da escola pelo nome,
  // inclusive de turmas onde ele não leciona — contornando o mesmo
  // escopo por turma já aplicado acima em `classes`. Restrita ao
  // conjunto de alunos das turmas do professor (`searchableStudents`).
  // -------------------------------------------------------------
  const searchableStudents = useMemo(() => {
    if (profile?.role !== "teacher") return students;
    const myClassIds = new Set(classes.map((c) => c.id));
    return students.filter((s) => s.classId && myClassIds.has(s.classId));
  }, [students, profile, classes]);

  const [search, setSearch] = useState("");
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return searchableStudents
      .filter((s) => s.name.toLowerCase().includes(q) || s.registrationNumber.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchableStudents, search]);

  function handleSelectClass(id: string) {
    updateParams({ view: id, studentId: undefined });
  }
  function handleSelectStudent(student: Student) {
    updateParams({ studentId: student.id, view: student.classId ?? undefined });
    setSearch("");
  }

  // -------------------------------------------------------------
  // Relatório individual do aluno selecionado.
  // -------------------------------------------------------------
  const [boletim, setBoletim] = useState<StudentBoletim | null>(null);
  const [series, setSeries] = useState<StudentDevelopmentPoint[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const reportReady = !!(selectedStudent && selectedStudentClass);

  async function loadStudentReport() {
    if (!selectedStudent || !selectedStudentClass) return;
    setReportLoading(true);
    setReportError(null);
    try {
      const [boletimData, seriesData] = await Promise.all([
        getStudentBoletim(selectedStudent.id, selectedStudentClass.id, selectedStudentClass.schoolYear, "annual"),
        getStudentDevelopmentSeries(selectedStudent.id, selectedStudentClass.id, selectedStudentClass.schoolYear),
      ]);
      setBoletim(boletimData);
      setSeries(seriesData);
    } catch (error) {
      setReportError(describeFirebaseError(error, "relatórios:relatório-do-aluno"));
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
    if (reportReady) loadStudentReport();
    else {
      setBoletim(null);
      setSeries([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportReady, selectedStudent?.id, selectedStudentClass?.id]);

  // -------------------------------------------------------------
  // Breadcrumb: Relatórios > Turma > Aluno. A turma exibida é a de
  // navegação (`viewClass`) ou, quando o aluno veio direto da busca
  // (sem passar por uma turma "aberta"), a turma do próprio aluno.
  // -------------------------------------------------------------
  const breadcrumbClass = viewClass ?? selectedStudentClass;
  const breadcrumbItems = [
    {
      label: "Relatórios",
      onClick: view || studentId ? () => updateParams({ view: undefined, studentId: undefined }) : undefined,
    },
    ...(breadcrumbClass
      ? [
          {
            label: breadcrumbClass.name,
            onClick: selectedStudent ? () => updateParams({ studentId: undefined }) : undefined,
          },
        ]
      : []),
    ...(selectedStudent ? [{ label: selectedStudent.name }] : []),
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-semibold text-ink900">Relatórios de Desenvolvimento</h2>
        <p className="text-sm text-ink-500">Acompanhe a evolução acadêmica dos alunos</p>
      </div>

      {(view || studentId) && <Breadcrumb items={breadcrumbItems} />}

      {baseLoading ? (
        <Card>
          <CardGridSkeleton count={4} />
        </Card>
      ) : baseError ? (
        <Card>
          <ErrorState message={baseError} onRetry={loadBaseData} />
        </Card>
      ) : selectedStudent && selectedStudentClass ? (
        reportLoading ? (
          <Card>
            <TableSkeleton columns={5} />
          </Card>
        ) : reportError ? (
          <Card>
            <ErrorState message={reportError} onRetry={loadStudentReport} />
          </Card>
        ) : boletim ? (
          <StudentDevelopmentReport
            student={selectedStudent}
            schoolClass={selectedStudentClass}
            schoolYear={String(selectedStudentClass.schoolYear)}
            boletim={boletim}
            series={series}
          />
        ) : null
      ) : viewClass ? (
        <div>
          <div className="mb-3">
            <h3 className="font-display text-base font-semibold text-ink900">Alunos — {viewClass.name}</h3>
            <p className="text-sm text-ink-500">Selecione um aluno para acessar o relatório de desenvolvimento.</p>
          </div>
          <Card className="overflow-hidden">
            {studentsInClass.length === 0 ? (
              <EmptyState bare icon={Users} title="Turma sem alunos" description="Esta turma ainda não possui alunos cadastrados." />
            ) : (
              <StudentReportTable
                summaries={studentSummaries}
                onSelectStudent={(id) => updateParams({ studentId: id })}
              />
            )}
          </Card>
        </div>
      ) : (
        <>
          <ReportFilters
            yearOptions={yearOptions}
            yearFilter={yearFilter}
            onYearChange={(v) => updateParams({ year: v, classId: undefined, disciplineId: undefined })}
            classOptions={classes}
            classId={classId}
            onClassChange={(v) => updateParams({ classId: v || undefined, disciplineId: undefined })}
            disciplineOptions={disciplineOptions}
            disciplineId={disciplineId}
            onDisciplineChange={(v) => updateParams({ disciplineId: v || undefined })}
            term={term}
            onTermChange={(v) => updateParams({ term: v || undefined })}
          />

          <Card className="mb-6 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Contexto</p>
                <p className="font-display text-base font-semibold text-ink900">{contextLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Média global</p>
                <p className="font-display text-2xl font-semibold text-ink-700">
                  {overview.overallAverage === null ? "—" : overview.overallAverage.toFixed(1)}
                </p>
                {overview.evolution !== null && (
                  <p className={`text-xs font-medium ${overview.evolution >= 0 ? "text-success" : "text-danger"}`}>
                    {overview.evolution > 0 ? "+" : ""}
                    {overview.evolution.toFixed(1)} vs período anterior
                  </p>
                )}
              </div>
            </div>
            <DevelopmentLineChart
              points={overview.series.map((p) => ({
                label: ASSESSMENT_TERM_LABEL[p.term].replace("º Bimestre", "º Bim"),
                value: p.average,
              }))}
            />
          </Card>

          <ReportIndicatorCards
            overallAverage={overview.overallAverage}
            evolution={overview.evolution}
            studentCount={overview.studentCount}
            averageAttendanceRate={overview.averageAttendanceRate}
          />

          <div className="mb-3">
            <h3 className="font-display text-base font-semibold text-ink900">Turmas</h3>
            <p className="text-sm text-ink-500">
              Selecione uma turma para visualizar seus alunos e acessar os relatórios individuais.
            </p>
          </div>

          {classSummaries.length === 0 ? (
            <EmptyState icon={School} title="Nenhuma turma cadastrada" description="Cadastre uma turma para começar a ver relatórios." />
          ) : (
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {classSummaries.map((summary) => (
                <ClassReportCard key={summary.schoolClass.id} summary={summary} onSelect={() => handleSelectClass(summary.schoolClass.id)} />
              ))}
            </div>
          )}

          <Card className="p-5">
            <h3 className="mb-1 font-display text-base font-semibold text-ink900">Análise individual</h3>
            <p className="mb-4 text-sm text-ink-500">Busque diretamente por um aluno pelo nome ou matrícula.</p>
            <div className="flex items-center gap-2 rounded-card border border-line px-3.5 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-ink-400" />
              <input
                className="w-full bg-transparent text-sm text-ink900 outline-none placeholder:text-ink-300"
                placeholder="Buscar aluno por nome ou matrícula..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {search.trim() && (
              <ul className="mt-3 flex flex-col divide-y divide-line overflow-hidden rounded-card border border-line">
                {searchResults.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-ink-500">Nenhum aluno encontrado.</li>
                ) : (
                  searchResults.map((student) => (
                    <li key={student.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectStudent(student)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-ink-50"
                      >
                        <span className="font-medium text-ink900">{student.name}</span>
                        <span className="tabular text-ink-500">{student.registrationNumber || "—"}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function buildContextLabel(
  selectedClass: SchoolClass | null,
  selectedDiscipline: Discipline | null,
  term: AssessmentTerm | ""
): string {
  const parts: string[] = [];
  if (selectedClass) parts.push(selectedClass.name);
  if (selectedDiscipline) parts.push(selectedDiscipline.name);
  if (term) parts.push(ASSESSMENT_TERM_LABEL[term]);
  return parts.length > 0 ? parts.join(" · ") : "Todos os alunos";
}
