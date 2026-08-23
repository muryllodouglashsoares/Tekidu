import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, ClipboardList, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { GradesTable } from "@/components/notes/GradesTable";
import { AssessmentManagerModal } from "@/components/notes/AssessmentManagerModal";
import { getClasses } from "@/services/classes/classService";
import { getDisciplines, getDisciplinesForClass } from "@/services/disciplines/disciplineService";
import { getStudents } from "@/services/students/studentService";
import {
  getAssessmentsByContext,
  createAssessment,
  updateAssessment,
  deleteAssessment,
} from "@/services/assessments/assessmentService";
import { getGradesByContext, saveGrade } from "@/services/grades/gradeService";
import { logAuditEvent } from "@/services/audit/auditService";
import { createNotification, createNotifications } from "@/services/notifications/notificationService";
import { getAcademicSettings } from "@/services/academicSettings/academicSettingsService";
import { ASSESSMENT_TERM_LABEL, type Assessment, type AssessmentTerm } from "@/types/assessment";
import type { Grade } from "@/types/grade";
import { calculateSituation, DEFAULT_ACADEMIC_THRESHOLDS, type AcademicThresholds } from "@/types/grade";
import type { SchoolClass } from "@/types/schoolClass";
import type { Discipline } from "@/types/discipline";
import type { Student } from "@/types/student";
import { describeFirebaseError } from "@/utils/firebaseError";

export function NotesPage() {
  const { profile } = useAuth();
  const toast = useToast();
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
    } catch (error) {
      setBaseError(describeFirebaseError(error, "notas:dados-base (turmas/disciplinas/alunos)"));
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

  // Etapa 7 — escopo de turma/disciplina para o professor: disciplinas
  // sem `teacherId === profile.uid` nem aparecem nos seletores. Antes,
  // um professor via TODAS as disciplinas da escola em "Notas" (a
  // escrita já era bloqueada por `canWriteAcademicRecord` nas Rules,
  // mas a LEITURA de avaliações/notas de disciplinas de outros
  // professores não era escopada nem na UI nem no servidor). Admin
  // continua vendo tudo, sem filtro.
  const myDisciplines = useMemo(() => {
    if (profile?.role !== "teacher") return disciplines;
    return disciplines.filter((d) => d.teacherId === profile.uid);
  }, [disciplines, profile]);

  const classOptions = useMemo(() => {
    const inYear = classes.filter((c) => String(c.schoolYear) === yearFilter);
    if (profile?.role !== "teacher") return inYear;
    const myClassIds = new Set(myDisciplines.flatMap((d) => d.classIds));
    return inYear.filter((c) => myClassIds.has(c.id));
  }, [classes, yearFilter, profile, myDisciplines]);

  // Só disciplinas vinculadas à turma selecionada (evita combinações
  // inválidas — ex.: aluno da Turma A aparecendo numa disciplina
  // exclusiva da Turma B). Ver nota em `getDisciplinesForClass`
  // (disciplineService) sobre por que essa comparação não deve incluir
  // `discipline.schoolYear`.
  const disciplineOptions = useMemo(() => {
    if (!classId) return [];
    return getDisciplinesForClass(myDisciplines, classId);
  }, [myDisciplines, classId]);

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
  const [thresholds, setThresholds] = useState<AcademicThresholds>(DEFAULT_ACADEMIC_THRESHOLDS);

  // Regras acadêmicas configuráveis por ano letivo (item 6 do plano
  // V8) — carregadas uma vez por ano selecionado, não hardcoded aqui.
  useEffect(() => {
    if (!yearFilter) return;
    let cancelled = false;
    getAcademicSettings(Number(yearFilter))
      .then((settings) => {
        if (!cancelled) {
          setThresholds({ passingAverage: settings.passingAverage, recoveryThreshold: settings.recoveryThreshold });
        }
      })
      .catch(() => {
        if (!cancelled) setThresholds(DEFAULT_ACADEMIC_THRESHOLDS);
      });
    return () => {
      cancelled = true;
    };
  }, [yearFilter]);

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
    } catch (error) {
      setContextError(describeFirebaseError(error, "notas:avaliações+notas-do-contexto"));
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
      const situation = calculateSituation(studentScores, assessments.length, thresholds);
      return situation === "no_grades" || situation === "incomplete";
    }).length;
  }, [linkedStudents, assessments, scores]);

  async function handleSaveGrade(studentId: string, assessmentId: string, score: number | null) {
    setSaveError(null);
    // Usado apenas para a atualização otimista local e para o log de
    // auditoria (antes/depois) — a decisão de criar ou atualizar em si
    // agora é feita pelo `gradeService` via ID determinístico
    // (`buildGradeId`), não por este lookup em memória. Ver nota em
    // `gradeService.saveGrade` sobre por que isso elimina o risco de
    // duplicação de notas.
    const existing = grades.find((g) => g.studentId === studentId && g.assessmentId === assessmentId);
    try {
      await saveGrade({
        studentId,
        assessmentId,
        disciplineId,
        classId,
        schoolYear: Number(yearFilter),
        term: term as AssessmentTerm,
        score,
      });

      if (profile && existing && existing.score !== score) {
        const student = linkedStudents.find((s) => s.id === studentId);
        const assessment = assessments.find((a) => a.id === assessmentId);
        logAuditEvent({
          type: "grade_updated",
          actorId: profile.uid,
          actorName: profile.name,
          studentId,
          studentName: student?.name ?? null,
          disciplineId,
          disciplineName: selectedDiscipline?.name ?? null,
          assessmentId,
          assessmentName: assessment?.name ?? null,
          before: existing.score === null ? null : String(existing.score),
          after: score === null ? null : String(score),
        });
      }

      // Fase 5 — notifica o aluno quando uma nota dele é lançada ou
      // alterada ("nova nota" / "alteração de nota"). Mesma condição
      // do log de auditoria acima (só dispara quando o valor realmente
      // muda, não a cada clique que resalva o mesmo valor) e só
      // notifica se o aluno já tem conta de acesso vinculada (`uid` —
      // ver nota em `types/student.ts`).
      if (score !== null && (!existing || existing.score !== score)) {
        const student = linkedStudents.find((s) => s.id === studentId);
        const assessment = assessments.find((a) => a.id === assessmentId);
        if (student?.uid) {
          createNotification({
            recipientUid: student.uid,
            type: "grade_posted",
            title: existing ? "Nota atualizada" : "Nova nota lançada",
            message: `${assessment?.name ?? "Uma avaliação"} em ${selectedDiscipline?.name ?? "sua disciplina"}: ${score.toFixed(1)}`,
            link: "/meu-boletim",
          });
        }
      }

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
    } catch (error) {
      const message = describeFirebaseError(error, "notas:salvar-nota");
      setSaveError(message);
      toast.error(message);
      throw new Error("save-failed");
    }
  }

  async function handleCreateAssessment(values: { name: string; weight: number; maxScore: number }, order: number) {
    await createAssessment({
      disciplineId,
      classId,
      schoolYear: Number(yearFilter),
      term: term as AssessmentTerm,
      name: values.name,
      order,
      weight: values.weight,
      maxScore: values.maxScore,
    });

    // Etapa 6 — notifica os alunos da turma que uma nova avaliação foi
    // cadastrada, ANTES do lançamento da nota (que já é coberto por
    // `grade_posted` em `handleSaveGrade`). Só os alunos com conta
    // vinculada (`student.uid`) recebem — mesmo filtro já usado em
    // `handleSaveGrade`.
    createNotifications(
      linkedStudents
        .filter((s) => s.uid)
        .map((s) => ({
          recipientUid: s.uid as string,
          type: "assessment_created" as const,
          title: "Nova avaliação cadastrada",
          message: `${values.name} em ${selectedDiscipline?.name ?? "sua disciplina"}.`,
          link: "/meu-boletim",
        }))
    );

    await loadContextData();
    toast.success(`Avaliação "${values.name}" criada com sucesso.`);
  }

  async function handleUpdateAssessment(
    assessmentId: string,
    values: { name: string; weight: number; maxScore: number }
  ) {
    const assessment = assessments.find((a) => a.id === assessmentId);
    if (!assessment) return;
    await updateAssessment(assessmentId, {
      disciplineId: assessment.disciplineId,
      classId: assessment.classId,
      schoolYear: assessment.schoolYear,
      term: assessment.term,
      name: values.name,
      order: assessment.order,
      weight: values.weight,
      maxScore: values.maxScore,
    });

    // Etapa 6 — só notifica em atualização quando o NOME muda (ex.:
    // "Prova 1" virou "Prova remarcada"). Ajustar peso/nota máxima não
    // muda nada que o aluno precise saber antes da nota ser lançada,
    // então não gera notificação — mesmo critério de "só quando há
    // valor real" já usado em `DisciplinesPage.handleSave` (só notifica
    // quando o vínculo de professor realmente muda).
    if (values.name !== assessment.name) {
      createNotifications(
        linkedStudents
          .filter((s) => s.uid)
          .map((s) => ({
            recipientUid: s.uid as string,
            type: "assessment_updated" as const,
            title: "Avaliação atualizada",
            message: `${assessment.name} agora é "${values.name}" em ${selectedDiscipline?.name ?? "sua disciplina"}.`,
            link: "/meu-boletim",
          }))
      );
    }

    await loadContextData();
    toast.success(`Avaliação "${values.name}" atualizada com sucesso.`);
  }

  async function handleDeleteAssessment(assessmentId: string) {
    const assessment = assessments.find((a) => a.id === assessmentId);
    await deleteAssessment(assessmentId);
    if (profile) {
      logAuditEvent({
        type: "assessment_deleted",
        actorId: profile.uid,
        actorName: profile.name,
        disciplineId,
        disciplineName: selectedDiscipline?.name ?? null,
        assessmentId,
        assessmentName: assessment?.name ?? null,
      });
    }
    await loadContextData();
    toast.success(`Avaliação "${assessment?.name ?? ""}" excluída.`);
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
            disabled={!classId || disciplineOptions.length === 0}
          >
            <option value="">
              {!classId
                ? "Selecione uma turma primeiro"
                : disciplineOptions.length === 0
                  ? "Nenhuma disciplina vinculada a esta turma"
                  : "Selecionar disciplina"}
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
          <TableSkeleton columns={5} />
        </Card>
      ) : baseError ? (
        <Card>
          <ErrorState message={baseError} onRetry={loadBaseData} />
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
              <TableSkeleton columns={4} />
            ) : contextError ? (
              <ErrorState message={contextError} onRetry={loadContextData} />
            ) : (
              <GradesTable
                students={linkedStudents}
                assessments={assessments}
                scores={scores}
                canEdit={canEdit}
                onSaveGrade={handleSaveGrade}
                thresholds={thresholds}
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
          onUpdate={handleUpdateAssessment}
          onDelete={handleDeleteAssessment}
        />
      )}
    </div>
  );
}
