import { useEffect, useState } from "react";
import { FileQuestion, UserX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { AdaptiveTableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { BoletimSummary } from "@/components/boletim/BoletimSummary";
import { BoletimTable } from "@/components/boletim/BoletimTable";
import { BoletimPdfDownloadButton } from "@/components/boletim/BoletimPdfDownloadButton";
import { ChildSelect } from "@/components/guardian/ChildSelect";
import { useGuardianChildren } from "@/hooks/useGuardianChildren";
import { getStudentBoletim, type StudentBoletim } from "@/services/boletim/boletimService";
import { BOLETIM_PERIOD_LABEL, type BoletimPeriod } from "@/types/boletim";
import { describeFirebaseError } from "@/utils/firebaseError";

/**
 * Portal do Responsável — "Boletim do filho" (Fase 3 do plano de
 * evolução). Estrutura QUASE idêntica a `MyBoletimPage` (Portal do
 * Aluno) de propósito: reaproveita `getStudentBoletim` e os MESMOS
 * componentes de apresentação (`BoletimSummary`/`BoletimTable`/
 * `BoletimPdfDownloadButton`) — a única diferença real é que o
 * responsável escolhe QUAL filho ver (`useGuardianChildren` +
 * `ChildSelect`), em vez do aluno resolver automaticamente o próprio
 * registro. Somente leitura: nenhum formulário de edição, mesma
 * restrição do Portal do Aluno (a Security Rule nega qualquer escrita
 * de `grades`/`attendanceRecords` para a role "guardian").
 */
export function GuardianBoletimPage() {
  const { children, loading: loadingChildren, error: childrenError, reload: loadChildren } =
    useGuardianChildren("portal-responsavel:boletim:filhos");

  const [selectedId, setSelectedId] = useState<string>("");
  const [period, setPeriod] = useState<BoletimPeriod>("annual");
  const [boletim, setBoletim] = useState<StudentBoletim | null>(null);
  const [boletimLoading, setBoletimLoading] = useState(false);
  const [boletimError, setBoletimError] = useState<string | null>(null);

  const schoolYear = new Date().getFullYear();
  const student = children?.find((c) => c.id === selectedId) ?? null;

  // Seleciona o primeiro filho automaticamente assim que a lista
  // carrega (ou quando o filho selecionado deixa de existir na lista
  // — ex.: recarregamento após o admin desvincular um dos dois).
  useEffect(() => {
    if (!children || children.length === 0) return;
    if (!children.some((c) => c.id === selectedId)) setSelectedId(children[0].id);
  }, [children, selectedId]);

  async function loadBoletim() {
    if (!student?.classId) return;
    setBoletimLoading(true);
    setBoletimError(null);
    try {
      const data = await getStudentBoletim(student.id, student.classId, schoolYear, period);
      setBoletim(data);
    } catch (error) {
      setBoletimError(describeFirebaseError(error, "portal-responsavel:boletim"));
    } finally {
      setBoletimLoading(false);
    }
  }

  useEffect(() => {
    if (student?.classId) loadBoletim();
    else setBoletim(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id, student?.classId, period]);

  if (loadingChildren) {
    return (
      <Card>
        <AdaptiveTableSkeleton columns={5} />
      </Card>
    );
  }

  if (childrenError) {
    return (
      <Card>
        <ErrorState message={childrenError} onRetry={loadChildren} />
      </Card>
    );
  }

  if (!children || children.length === 0) {
    return (
      <EmptyState
        icon={UserX}
        title="Nenhum filho vinculado"
        description="Sua conta ainda não está vinculada a nenhum aluno. Fale com a secretaria da escola."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="hidden font-display text-xl font-semibold text-ink900 md:block">Boletim</h2>
        <p className="text-sm text-ink-500">Acompanhe as notas e a frequência do seu filho(a)</p>
      </div>

      <Card className="mb-6 flex flex-col gap-4 p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <ChildSelect childrenList={children} selectedId={selectedId} onChange={setSelectedId} />
          <div className="w-full sm:w-52">
            <Select
              label="Filtrar por período"
              value={period}
              onChange={(e) => setPeriod(e.target.value as BoletimPeriod)}
            >
              {Object.entries(BOLETIM_PERIOD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {student && boletim && boletim.disciplines.length > 0 && student.classId && (
          <div className="flex justify-end border-t border-line pt-4">
            <BoletimPdfDownloadButton
              student={student}
              classId={student.classId}
              schoolClass={null}
              schoolYear={schoolYear}
              period={period}
              boletim={boletim}
            />
          </div>
        )}
      </Card>

      {!student?.classId ? (
        <EmptyState
          icon={FileQuestion}
          title="Sem turma vinculada"
          description="Este aluno ainda não está matriculado em nenhuma turma neste ano letivo."
        />
      ) : boletimLoading ? (
        <Card>
          <AdaptiveTableSkeleton columns={5} />
        </Card>
      ) : boletimError ? (
        <Card>
          <ErrorState message={boletimError} onRetry={loadBoletim} />
        </Card>
      ) : boletim ? (
        boletim.disciplines.length === 0 ? (
          <EmptyState
            icon={FileQuestion}
            title="Sem dados acadêmicos ainda"
            description="Ainda não há disciplinas vinculadas à turma deste aluno para o ano letivo selecionado."
          />
        ) : (
          <>
            <BoletimSummary boletim={boletim} />
            <Card className="overflow-hidden">
              <div className="border-b border-line px-4 py-3.5">
                <p className="font-medium text-ink900">Desempenho por disciplina</p>
              </div>
              <BoletimTable rows={boletim.disciplines} />
            </Card>
          </>
        )
      ) : null}
    </div>
  );
}
