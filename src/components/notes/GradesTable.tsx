import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Assessment } from "@/types/assessment";
import { effectiveMaxScore, effectiveWeight } from "@/types/assessment";
import type { Student } from "@/types/student";
import {
  GRADE_MIN,
  GRADE_MAX,
  calculateWeightedAverage,
  calculateSituation,
  DEFAULT_ACADEMIC_THRESHOLDS,
  type AcademicThresholds,
} from "@/types/grade";
import { SituationBadge } from "@/components/notes/SituationBadge";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface GradesTableProps {
  students: Student[];
  assessments: Assessment[];
  /** scores[studentId][assessmentId] = nota (null = não lançada) */
  scores: Record<string, Record<string, number | null>>;
  canEdit: boolean;
  onSaveGrade: (studentId: string, assessmentId: string, score: number | null) => Promise<void>;
  /** Média mínima/recuperação do ano letivo (item 6 do plano V8). Cai
   * para o padrão do sistema quando não informado. */
  thresholds?: AcademicThresholds;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/**
 * Reproduz a edição direta na tabela mostrada no Figma (\"Clique em uma
 * nota para editar\"). Cada célula alterna entre exibição e um `<input>`
 * nativo (não usa o componente `Input` do design system aqui de
 * propósito: `Input` sempre renderiza um `<label>` associado, o que não
 * cabe numa célula de tabela densa — a validação/estilo de erro segue a
 * mesma linguagem visual, só sem o wrapper de formulário).
 *
 * Em mobile, uma tabela de N avaliações por M alunos vira "planilha"
 * inevitavelmente (ver "NOTAS MOBILE" no briefing: evitar essa
 * aparência) — a mesma edição vira uma lista de alunos com
 * progressive disclosure: card fechado mostra média/situação, expandir
 * revela um input grande por avaliação, fácil de tocar.
 */
export function GradesTable({
  students,
  assessments,
  scores,
  canEdit,
  onSaveGrade,
  thresholds = DEFAULT_ACADEMIC_THRESHOLDS,
}: GradesTableProps) {
  const isMobile = useIsMobile();
  const { trigger } = useHapticFeedback();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  function cellKey(studentId: string, assessmentId: string) {
    return `${studentId}__${assessmentId}`;
  }

  function startEditing(studentId: string, assessmentId: string, current: number | null) {
    if (!canEdit) return;
    setEditingKey(cellKey(studentId, assessmentId));
    setDraft(current === null ? "" : String(current).replace(".", ","));
    setErrorKey(null);
  }

  async function commitEdit(studentId: string, assessmentId: string) {
    const key = cellKey(studentId, assessmentId);
    const raw = draft.trim().replace(",", ".");

    if (raw === "") {
      setEditingKey(null);
      setSavingKey(key);
      try {
        await onSaveGrade(studentId, assessmentId, null);
      } catch {
        // Erro já é exibido pelo chamador (banner acima da tabela);
        // aqui só garantimos que o spinner da célula não fique preso.
      } finally {
        setSavingKey(null);
      }
      return;
    }

    const value = Number(raw);
    const assessment = assessments.find((a) => a.id === assessmentId);
    const maxScore = assessment ? effectiveMaxScore(assessment) : GRADE_MAX;
    if (Number.isNaN(value) || value < GRADE_MIN || value > maxScore) {
      setErrorKey(key);
      return;
    }

    setEditingKey(null);
    setErrorKey(null);
    setSavingKey(key);
    try {
      await onSaveGrade(studentId, assessmentId, Math.round(value * 100) / 100);
      trigger("light");
    } catch {
      // Erro já é exibido pelo chamador (banner acima da tabela).
    } finally {
      setSavingKey(null);
    }
  }

  if (assessments.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-ink-500">
        Nenhuma avaliação cadastrada para este contexto ainda.
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-ink-500">
        Nenhum aluno vinculado a esta turma.
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex flex-col divide-y divide-line">
        {students.map((student) => {
          const studentScores = assessments.map((a) => scores[student.id]?.[a.id] ?? null);
          const average = calculateWeightedAverage(
            assessments.map((a, i) => ({ score: studentScores[i], weight: effectiveWeight(a) }))
          );
          const situation = calculateSituation(studentScores, assessments.length, thresholds);
          const expanded = expandedStudentId === student.id;

          return (
            <div key={student.id}>
              <button
                type="button"
                onClick={() => setExpandedStudentId(expanded ? null : student.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-ink-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                  {initials(student.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink900">{student.name}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-xs tabular text-ink-500">
                      Média: {average === null ? "—" : String(average).replace(".", ",")}
                    </span>
                    <SituationBadge situation={situation} />
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </button>

              {expanded && (
                <div className="flex flex-col gap-2.5 bg-ink-50/50 px-4 pb-4">
                  {assessments.map((assessment) => {
                    const key = cellKey(student.id, assessment.id);
                    const value = scores[student.id]?.[assessment.id] ?? null;
                    const isEditing = editingKey === key;
                    const isSaving = savingKey === key;
                    const hasError = errorKey === key;

                    return (
                      <div key={assessment.id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-ink-700">{assessment.name}</p>
                          {((assessment.weight !== undefined && assessment.weight !== 1) ||
                            (assessment.maxScore !== undefined && assessment.maxScore !== 10)) && (
                            <p className="text-[11px] text-ink-400">
                              peso {effectiveWeight(assessment)} · máx. {effectiveMaxScore(assessment)}
                            </p>
                          )}
                        </div>
                        {isEditing ? (
                          <input
                            autoFocus
                            type="text"
                            inputMode="decimal"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={() => commitEdit(student.id, assessment.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                              if (e.key === "Escape") {
                                setEditingKey(null);
                                setErrorKey(null);
                              }
                            }}
                            className={`h-11 w-20 shrink-0 rounded-card border px-2 text-center text-base outline-none ${
                              hasError ? "border-danger" : "border-ink-400"
                            }`}
                          />
                        ) : (
                          <button
                            type="button"
                            disabled={!canEdit || isSaving}
                            onClick={() => startEditing(student.id, assessment.id, value)}
                            className={`flex h-11 w-20 shrink-0 items-center justify-center rounded-card text-base font-semibold transition-colors ${
                              isSaving
                                ? "animate-pulse bg-ink-100 text-ink-300"
                                : value === null
                                  ? "border border-dashed border-line text-ink-300"
                                  : value < 6
                                    ? "bg-danger/10 text-danger active:bg-danger/20"
                                    : "bg-success/10 text-success active:bg-success/20"
                            }`}
                          >
                            {value === null ? "—" : String(value).replace(".", ",")}
                          </button>
                        )}
                        {hasError && <p className="shrink-0 text-[11px] text-danger">0 a {effectiveMaxScore(assessment)}</p>}
                      </div>
                    );
                  })}
                  {!canEdit && (
                    <p className="pt-1 text-xs text-ink-400">Você não tem permissão para editar notas.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-400">
            <th className="px-4 py-3 font-medium">Aluno</th>
            <th className="px-4 py-3 font-medium">Matrícula</th>
            {assessments.map((a) => (
              <th key={a.id} className="px-4 py-3 text-center font-medium">
                {a.name}
                {(a.weight !== undefined && a.weight !== 1) || (a.maxScore !== undefined && a.maxScore !== 10) ? (
                  <span className="block text-[10px] normal-case text-ink-300">
                    peso {effectiveWeight(a)} · máx. {effectiveMaxScore(a)}
                  </span>
                ) : null}
              </th>
            ))}
            <th className="px-4 py-3 text-center font-medium">Média</th>
            <th className="px-4 py-3 font-medium">Situação</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const studentScores = assessments.map((a) => scores[student.id]?.[a.id] ?? null);
            // Média ponderada (item 4 do plano V8): equivalente à média
            // simples quando todas as avaliações têm peso 1 (caso mais
            // comum), mas passa a refletir o peso real assim que uma
            // avaliação tiver `weight` diferente — sem exigir uma
            // fórmula à parte quando os pesos são todos iguais.
            const average = calculateWeightedAverage(
              assessments.map((a, i) => ({ score: studentScores[i], weight: effectiveWeight(a) }))
            );
            const situation = calculateSituation(studentScores, assessments.length, thresholds);

            return (
              <tr key={student.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                      {initials(student.name)}
                    </span>
                    <span className="truncate font-medium text-ink900">{student.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-500">
                  {student.registrationNumber}
                </td>
                {assessments.map((assessment) => {
                  const key = cellKey(student.id, assessment.id);
                  const value = scores[student.id]?.[assessment.id] ?? null;
                  const isEditing = editingKey === key;
                  const isSaving = savingKey === key;
                  const hasError = errorKey === key;

                  return (
                    <td key={assessment.id} className="px-4 py-3 text-center">
                      {isEditing ? (
                        <input
                          autoFocus
                          type="text"
                          inputMode="decimal"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => commitEdit(student.id, assessment.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            if (e.key === "Escape") {
                              setEditingKey(null);
                              setErrorKey(null);
                            }
                          }}
                          className={`w-16 rounded-card border px-2 py-1.5 text-center text-sm outline-none ${
                            hasError ? "border-danger" : "border-ink-400"
                          }`}
                        />
                      ) : (
                        <button
                          type="button"
                          disabled={!canEdit || isSaving}
                          onClick={() => startEditing(student.id, assessment.id, value)}
                          className={`w-16 rounded-card px-2 py-1.5 text-sm font-medium transition-colors ${
                            isSaving
                              ? "animate-pulse bg-ink-50 text-ink-300"
                              : value === null
                                ? "border border-dashed border-line text-ink-300"
                                : value < 6
                                  ? "bg-danger/10 text-danger hover:bg-danger/20"
                                  : "bg-success/10 text-success hover:bg-success/20"
                          } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
                        >
                          {value === null ? "—" : String(value).replace(".", ",")}
                        </button>
                      )}
                      {hasError && (
                        <p className="mt-1 text-[11px] text-danger">0 a 10</p>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-center font-display font-semibold text-ink900">
                  {average === null ? "—" : String(average).replace(".", ",")}
                </td>
                <td className="px-4 py-3">
                  <SituationBadge situation={situation} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-line px-4 py-2.5 text-xs text-ink-400">
        {canEdit
          ? "Clique em uma nota para editar · Esc cancela, Enter/clique fora salva"
          : "Você não tem permissão para editar notas."}
      </p>
    </div>
  );
}
