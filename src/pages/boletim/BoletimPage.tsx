import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, FileQuestion, School, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ClassCard } from "@/components/boletim/ClassCard";
import { BoletimStudentTable } from "@/components/boletim/BoletimStudentTable";
import { BoletimFilters } from "@/components/boletim/BoletimFilters";
import { BoletimSummary } from "@/components/boletim/BoletimSummary";
import { BoletimTable } from "@/components/boletim/BoletimTable";
import { getClasses, getStudentCountsByClassId } from "@/services/classes/classService";
import { getDisciplines } from "@/services/disciplines/disciplineService";
import { getStudents } from "@/services/students/studentService";
import { getStudentBoletim, type StudentBoletim } from "@/services/boletim/boletimService";
import { useAuth } from "@/contexts/AuthContext";
import { BOLETIM_PERIOD_LABEL, type BoletimPeriod } from "@/types/boletim";
import type { SchoolClass } from "@/types/schoolClass";
import type { Discipline } from "@/types/discipline";
import type { Student } from "@/types/student";
import { describeFirebaseError } from "@/utils/firebaseError";

export function BoletimPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();

  // -------------------------------------------------------------
  // Dados base (turmas + alunos) — mesmo padrão de carregamento único
  // usado em Notas/Frequência, reaproveitado aqui para resolver as duas
  // formas de acesso (Turma → Aluno e Filtros) em memória.
  // -------------------------------------------------------------
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [baseLoading, setBaseLoading] = useState(true);
  const [baseError, setBaseError] = useState<string | null>(null);

  async function loadBaseData() {
    setBaseLoading(true);
    setBaseError(null);
    try {
      const [classesData, disciplinesData, studentsData, counts] = await Promise.all([
        getClasses(),
        getDisciplines(),
        getStudents(),
        getStudentCountsByClassId(),
      ]);
      setClasses(classesData);
      setDisciplines(disciplinesData);
      setStudents(studentsData);
      setStudentCounts(counts);
    } catch (error) {
      setBaseError(describeFirebaseError(error, "boletim:dados-base (turmas/alunos)"));
    } finally {
      setBaseLoading(false);
    }
  }

  useEffect(() => {
    loadBaseData();
  }, []);

  // -------------------------------------------------------------
  // Estado compartilhado pelas DUAS formas de acesso (item 11 do
  // briefing) — fica na query string, não em state local: clicar num
  // ClassCard/linha de aluno e escolher pelos Selects de filtro
  // escrevem exatamente nos mesmos parâmetros, então levam ao mesmo
  // lugar e o botão "voltar" do navegador funciona nos dois casos.
  // -------------------------------------------------------------
  const yearOptions = useMemo(
    () => Array.from(new Set(classes.map((c) => c.schoolYear))).sort((a, b) => b - a),
    [classes]
  );
  const yearFilter = searchParams.get("year") ?? (yearOptions[0] ? String(yearOptions[0]) : "");
  const classId = searchParams.get("classId") ?? "";
  const studentId = searchParams.get("studentId") ?? "";
  const period = (searchParams.get("period") as BoletimPeriod | null) ?? "annual";

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

  const classOptions = useMemo(() => {
    const inYear = classes.filter((c) => String(c.schoolYear) === yearFilter);
    // Etapa 7 — escopo de turma para o professor: `/boletim` é
    // acessível a admin E professor (ver AppRoutes.tsx); antes, um
    // professor podia consultar o boletim de QUALQUER turma da escola,
    // não só das suas — o boletim consolida notas de TODAS as
    // disciplinas de um aluno, então isso vazava dados acadêmicos de
    // disciplinas de outros professores. Restringe a lista de turmas às
    // que têm ao menos uma disciplina deste professor.
    if (profile?.role !== "teacher") return inYear;
    const myClassIds = new Set(
      disciplines.filter((d) => d.teacherId === profile.uid).flatMap((d) => d.classIds)
    );
    return inYear.filter((c) => myClassIds.has(c.id));
  }, [classes, yearFilter, profile, disciplines]);

  const selectedClass = useMemo(
    () => classOptions.find((c) => c.id === classId) ?? null,
    [classOptions, classId]
  );

  const studentsInClass = useMemo(
    () => (selectedClass ? students.filter((s) => s.classId === selectedClass.id) : []),
    [students, selectedClass]
  );

  const selectedStudent = useMemo(
    () => studentsInClass.find((s) => s.id === studentId) ?? null,
    [studentsInClass, studentId]
  );

  function handleYearChange(value: string) {
    updateParams({ year: value, classId: undefined, studentId: undefined });
  }
  function handleClassChange(value: string) {
    updateParams({ classId: value, studentId: undefined });
  }
  function handleStudentChange(value: string) {
    updateParams({ studentId: value });
  }
  function handlePeriodChange(value: BoletimPeriod) {
    updateParams({ period: value });
  }

  // -------------------------------------------------------------
  // Boletim do aluno selecionado (Notas + Frequência consolidadas).
  // -------------------------------------------------------------
  const [boletim, setBoletim] = useState<StudentBoletim | null>(null);
  const [boletimLoading, setBoletimLoading] = useState(false);
  const [boletimError, setBoletimError] = useState<string | null>(null);

  const boletimReady = !!(selectedClass && selectedStudent && yearFilter);

  async function loadBoletim() {
    if (!selectedClass || !selectedStudent) return;
    setBoletimLoading(true);
    setBoletimError(null);
    try {
      const data = await getStudentBoletim(selectedStudent.id, selectedClass.id, Number(yearFilter), period);
      setBoletim(data);
    } catch (error) {
      setBoletimError(describeFirebaseError(error, "boletim:boletim-do-aluno"));
    } finally {
      setBoletimLoading(false);
    }
  }

  useEffect(() => {
    if (boletimReady) loadBoletim();
    else setBoletim(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boletimReady, selectedClass?.id, selectedStudent?.id, yearFilter, period]);

  // -------------------------------------------------------------
  // Breadcrumb: Boletins > Turma > Aluno (item 7 e 12 do briefing).
  // -------------------------------------------------------------
  const breadcrumbItems = [
    {
      label: "Boletins",
      onClick:
        selectedClass || selectedStudent
          ? () => updateParams({ classId: undefined, studentId: undefined })
          : undefined,
    },
    ...(selectedClass
      ? [
          {
            label: selectedClass.name,
            onClick: selectedStudent ? () => updateParams({ studentId: undefined }) : undefined,
          },
        ]
      : []),
    ...(selectedStudent ? [{ label: selectedStudent.name }] : []),
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-semibold text-ink900">Boletim</h2>
        <p className="text-sm text-ink-500">Acompanhe o desempenho acadêmico dos alunos</p>
      </div>

      <BoletimFilters
        yearOptions={yearOptions}
        yearFilter={yearFilter}
        onYearChange={handleYearChange}
        classOptions={classOptions}
        classId={classId}
        onClassChange={handleClassChange}
        studentOptions={studentsInClass}
        studentId={studentId}
        onStudentChange={handleStudentChange}
        period={period}
        onPeriodChange={handlePeriodChange}
      />

      {(selectedClass || selectedStudent) && <Breadcrumb items={breadcrumbItems} />}

      {baseLoading ? (
        <Card>
          <TableSkeleton columns={5} />
        </Card>
      ) : baseError ? (
        <Card>
          <ErrorState message={baseError} onRetry={loadBaseData} />
        </Card>
      ) : !selectedClass ? (
        <ClassesSection classes={classOptions} allClassesEmpty={classes.length === 0} studentCounts={studentCounts} onSelect={handleClassChange} />
      ) : !selectedStudent ? (
        <StudentsSection
          schoolClass={selectedClass}
          students={studentsInClass}
          onSelectStudent={(student) => handleStudentChange(student.id)}
        />
      ) : boletimLoading ? (
        <Card>
          <TableSkeleton columns={5} />
        </Card>
      ) : boletimError ? (
        <Card>
          <ErrorState message={boletimError} onRetry={loadBoletim} />
        </Card>
      ) : boletim ? (
        <BoletimView
          student={selectedStudent}
          schoolClass={selectedClass}
          schoolYear={yearFilter}
          period={period}
          boletim={boletim}
        />
      ) : null}
    </div>
  );
}

function ClassesSection({
  classes,
  allClassesEmpty,
  studentCounts,
  onSelect,
}: {
  classes: SchoolClass[];
  allClassesEmpty: boolean;
  studentCounts: Record<string, number>;
  onSelect: (classId: string) => void;
}) {
  if (allClassesEmpty) {
    return (
      <EmptyState
        icon={School}
        title="Nenhuma turma cadastrada"
        description="Cadastre uma turma na aba Turmas para começar a consultar boletins."
      />
    );
  }

  return (
    <div>
      <div className="mb-3">
        <h3 className="font-display text-base font-semibold text-ink900">Turmas</h3>
        <p className="text-sm text-ink-500">
          Selecione uma turma para visualizar os alunos e acessar seus boletins.
        </p>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          icon={School}
          title="Nenhuma turma neste ano letivo"
          description="Ajuste o filtro de ano letivo acima para ver outras turmas."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((schoolClass) => (
            <ClassCard
              key={schoolClass.id}
              schoolClass={schoolClass}
              studentCount={studentCounts[schoolClass.id] ?? 0}
              onSelect={() => onSelect(schoolClass.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StudentsSection({
  schoolClass,
  students,
  onSelectStudent,
}: {
  schoolClass: SchoolClass;
  students: Student[];
  onSelectStudent: (student: Student) => void;
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="font-display text-base font-semibold text-ink900">Alunos — {schoolClass.name}</h3>
        <p className="text-sm text-ink-500">Selecione um aluno para acessar o boletim.</p>
      </div>

      <Card className="overflow-hidden">
        {students.length === 0 ? (
          <EmptyState
            bare
            icon={Users}
            title="Turma sem alunos"
            description="Esta turma ainda não possui alunos cadastrados."
          />
        ) : (
          <BoletimStudentTable students={students} onSelectStudent={onSelectStudent} />
        )}
      </Card>
    </div>
  );
}

function BoletimView({
  student,
  schoolClass,
  schoolYear,
  period,
  boletim,
}: {
  student: Student;
  schoolClass: SchoolClass;
  schoolYear: string;
  period: BoletimPeriod;
  boletim: StudentBoletim;
}) {
  return (
    <div>
      <Card className="mb-6 p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-400">Identificação do aluno</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Field label="Nome" value={student.name} />
          <Field label="Matrícula" value={student.registrationNumber || "—"} />
          <Field label="Turma" value={schoolClass.name} />
          <Field label="Ano letivo" value={schoolYear} />
          <Field label="Período" value={BOLETIM_PERIOD_LABEL[period]} />
        </div>
      </Card>

      <BoletimSummary boletim={boletim} />

      {boletim.disciplines.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="Aluno sem dados acadêmicos"
          description="Ainda não há disciplinas vinculadas a esta turma para o ano letivo selecionado."
        />
      ) : (
        <>
          {boletim.overallStatus === "failed" && (
            <div className="mb-4 flex items-center gap-2 rounded-card border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Este aluno está em situação de reprovação em uma ou mais disciplinas, ou com frequência crítica.</span>
            </div>
          )}

          <Card className="overflow-hidden">
            <div className="border-b border-line px-4 py-3.5">
              <p className="font-medium text-ink900">Desempenho por disciplina</p>
            </div>
            <BoletimTable rows={boletim.disciplines} />
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
