import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, ClipboardList, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/layout/EmptyState";
import { GradesTable } from "@/components/notes/GradesTable";
import { AssessmentManagerModal } from "@/components/notes/AssessmentManagerModal";
import { getClasses } from "@/services/classes/classService";
import { getDisciplines } from "@/services/disciplines/disciplineService";
import { getStudents } from "@/services/students/studentService";
import {
  getAssessmentsByContext,
  createAssessment,
  deleteAssessment,
} from "@/services/assessments/assessmentService";
import { getGradesByContext, saveGrade } from "@/services/grades/gradeService";
import { ASSESSMENT_TERM_LABEL, type Assessment, type AssessmentTerm } from "@/types/assessment";
import type { Grade } from "@/types/grade";
import { calculateSituation } from "@/types/grade";
import type { SchoolClass } from "@/types/schoolClass";
import type { Discipline } from "@/types/discipline";
import type { Student } from "@/types/student";

export function NotesPage() {
  const { profile } = useAuth();
  const canEdit = profile?.role === "admin" || profile?.role === "teacher";

  // -------------------------------------------------------------
  // Dados base (turmas, disciplinas, alunos) — mesmo padrão de
  // carregamento único usado em Disciplinas, reaproveitado aqui para
  // resolver os filtros dependentes em memória, sem N+1 queries.
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

  // -------------------------------------------------------------
  // Filtros — dependentes: Ano → Turma → Disciplina → Bimestre.
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

  // Só disciplinas vinculadas à turma selecionada (evita combinações
  // inválidas — ex.: aluno da Turma A aparecendo numa disciplina
  // exclusiva da Turma B).
  const disciplineOptions = useMemo(() => {
    if (!classId) return [];
    return disciplines.filter(
      (d) => String(d.schoolYear) === yearFilter && d.classIds.includes(classId)
    );
  }, [disciplines, classId, yearFilter]);

  // Reseta seleções dependentes quando o pai muda, para nunca deixar
  // uma combinação inválida selecionada.
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

  // Alunos vinculados à turma selecionada — comparação direta por
  // `classId` (referência estável), substituindo a antiga comparação
  // por nome de turma em texto livre.
  const linkedStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter((s) => s.classId === selectedClass.id);
  }, [students, selectedClass]);

  const contextReady = !!(classId && disciplineId && term && yearFilter);

  // -------------------------------------------------------------
  // Avaliações + Notas do contexto selecionado.
  // -------------------------------------------------------------
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAssessmentManager, setShowAssessmentManager] = useState(false);

  async function loadContextData() {
    if (!contextReady) return;
    setContextLoading(true);
    setContextError(null);
    try {
      const [assessmentsData, gradesData] = await Promise.all([
        getAssessmentsByContext(disciplineId, classId, Number(yearFilter), term as AssessmentTerm),
        getGradesByContext(disciplineId, classId, Number(yearFilter), term as AssessmentTerm),
      ]);
      setAssessments(assessmentsData);
      setGrades(gradesData);
    } catch {
      setContextError("Não foi possível carregar as notas deste contexto.");
    } finally {
      setContextLoading(false);
    }
  }

  useEffect(() => {
    if (contextReady) loadContextData();
    else {
      setAssessments([]);
      setGrades([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextReady, classId, disciplineId, term, yearFilter]);

  // studentId -> assessmentId -> nota
  const scores = useMemo(() => {
    const map: Record<string, Record<string, number | null>> = {};
    for (const grade of grades) {
      if (!map[grade.studentId]) map[grade.studentId] = {};
      map[grade.studentId][grade.assessmentId] = grade.score;
    }
    return map;
  }, [grades]);

  const pendingCount = useMemo(() => {
    if (assessments.length === 0) return 0;
    return linkedStudents.filter((student) => {
      const studentScores = assessments.map((a) => scores[student.id]?.[a.id] ?? null);
      const situation = calculateSituation(studentScores, assessments.length);
      return situation === "no_grades" || situation === "incomplete";
    }).length;
  }, [linkedStudents, assessments, scores]);

  async function handleSaveGrade(studentId: string, assessmentId: string, score: number | null) {
    setSaveError(null);
    const existing = grades.find((g) => g.studentId === studentId && g.assessmentId === assessmentId);
    try {
      await saveGrade(existing?.id ?? null, {
        studentId,
        assessmentId,
        disciplineId,
        classId,
        schoolYear: Number(yearFilter),
        term: term as AssessmentTerm,
        score,
      });
      // Atualização otimista local — evita recarregar a tabela inteira
      // a cada nota editada.
      setGrades((prev) => {
        if (existing) {
          return prev.map((g) => (g.id === existing.id ? { ...g, score } : g));
        }
        return [
          ...prev,
          {
            id: `temp-${studentId}-${assessmentId}`,
            studentId,
            assessmentId,
            disciplineId,
            classId,
            schoolYear: Number(yearFilter),
            term: term as AssessmentTerm,
            score,
            createdAt: null,
            updatedAt: null,
          },
        ];
      });
    } catch {
      setSaveError("Não foi possível salvar a nota. Tente novamente.");
      throw new Error("save-failed");
    }
  }

  async function handleCreateAssessment(name: string, order: number) {
    await createAssessment({
      disciplineId,
      classId,
      schoolYear: Number(yearFilter),
      term: term as AssessmentTerm,
      name,
      order,
    });
    await loadContextData();
  }

  async function handleDeleteAssessment(assessmentId: string) {
    await deleteAssessment(assessmentId);
    await loadContextData();
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink900">Notas</h2>
          <p className="text-sm text-ink-500">
            Lançamento e acompanhamento das avaliações acadêmicas
          </p>
        </div>
      </div>

      <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          <Select
            label="Filtrar por ano letivo"
            hideLabel
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            disabled={yearOptions.length === 0}
          >
            {yearOptions.length === 0 && <option value="">—</option>}
            {yearOptions.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </Select>

          <Select
            label="Filtrar por turma"
            hideLabel
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            disabled={classOptions.length === 0}
          >
            <option value="">Selecionar turma</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            label="Filtrar por disciplina"
            hideLabel
            value={disciplineId}
            onChange={(e) => setDisciplineId(e.target.value)}
            disabled={!classId}
          >
            <option value="">
              {classId ? "Selecionar disciplina" : "Selecione uma turma primeiro"}
            </option>
            {disciplineOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>

          <Select
            label="Filtrar por bimestre"
            hideLabel
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            disabled={!disciplineId}
          >
            <option value="">
              {disciplineId ? "Selecionar bimestre" : "Selecione uma disciplina primeiro"}
            </option>
            {Object.entries(ASSESSMENT_TERM_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {baseLoading ? (
        <Card>
          <Spinner label="Carregando dados acadêmicos..." />
        </Card>
      ) : baseError ? (
        <Card className="p-8 text-center">
          <p className="mb-3 text-sm text-danger">{baseError}</p>
          <Button variant="secondary" onClick={loadBaseData}>
            Tentar novamente
          </Button>
        </Card>
      ) : !classId ? (
        <EmptyState
          icon={Users}
          title="Selecione uma turma"
          description="Escolha o ano letivo e a turma para começar a lançar ou consultar notas."
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
          description="Escolha o período letivo para ver as avaliações e notas."
        />
      ) : (
        <>
          {pendingCount > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-card border border-honors-200 bg-honors-50 px-4 py-3 text-sm text-honors-600">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                <strong>{pendingCount}</strong> aluno{pendingCount === 1 ? "" : "s"} com
                avaliações pendentes nesta disciplina
              </span>
            </div>
          )}

          {saveError && (
            <p role="alert" className="mb-4 text-sm text-danger">
              {saveError}
            </p>
          )}

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink900">{selectedDiscipline?.name}</p>
                <p className="truncate text-xs text-ink-500">
                  {selectedDiscipline?.teacherName || "—"} · {linkedStudents.length} aluno
                  {linkedStudents.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="rounded-full bg-ink-50 px-2.5 py-1 font-mono text-xs text-ink-500">
                  {selectedDiscipline?.code}
                </span>
                {canEdit && (
                  <Button variant="secondary" onClick={() => setShowAssessmentManager(true)}>
                    Avaliações
                  </Button>
                )}
              </div>
            </div>

            {contextLoading ? (
              <Spinner label="Carregando notas..." />
            ) : contextError ? (
              <div className="p-8 text-center">
                <p className="mb-3 text-sm text-danger">{contextError}</p>
                <Button variant="secondary" onClick={loadContextData}>
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <GradesTable
                students={linkedStudents}
                assessments={assessments}
                scores={scores}
                canEdit={canEdit}
                onSaveGrade={handleSaveGrade}
              />
            )}
          </Card>
        </>
      )}

      {showAssessmentManager && selectedDiscipline && selectedClass && (
        <AssessmentManagerModal
          disciplineName={selectedDiscipline.name}
          className={selectedClass.name}
          assessments={assessments}
          onClose={() => setShowAssessmentManager(false)}
          onCreate={handleCreateAssessment}
          onDelete={handleDeleteAssessment}
        />
      )}
    </div>
  );
}
