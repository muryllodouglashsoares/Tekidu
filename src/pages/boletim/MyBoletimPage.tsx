import { useEffect, useState } from "react";
import { FileQuestion, UserX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { BoletimSummary } from "@/components/boletim/BoletimSummary";
import { BoletimTable } from "@/components/boletim/BoletimTable";
import { useOwnStudent } from "@/hooks/useOwnStudent";
import { getStudentBoletim, type StudentBoletim } from "@/services/boletim/boletimService";
import { BOLETIM_PERIOD_LABEL, type BoletimPeriod } from "@/types/boletim";
import { describeFirebaseError } from "@/utils/firebaseError";

/**
 * Portal do Aluno — "Meu Boletim" (Tarefa 3, Fase 1 pós-auditoria V8).
 *
 * Diferente de `BoletimPage` (Turma → Aluno, uso de staff), esta tela
 * NUNCA pede para o aluno escolher "qual aluno": o `studentId` é
 * resolvido automaticamente a partir do `uid` logado (`AuthContext` →
 * `getStudentByUid`). Reaproveita integralmente `boletimService.
 * getStudentBoletim` e os componentes de APRESENTAÇÃO já existentes
 * (`BoletimSummary`/`BoletimTable`) — sem nenhum formulário de edição,
 * como pedido: o aluno só pode LER seu próprio boletim/frequência,
 * nunca alterar notas ou presença (ver `firestore.rules`, que nega
 * qualquer escrita de `grades`/`attendanceRecords` pela role
 * "student").
 *
 * ANO LETIVO: usa o ano corrente (`new Date().getFullYear()`), mesma
 * convenção já usada em `DashboardPage` — evita precisar ler
 * `classes/{classId}` (que a Security Rule ainda restringe a staff, e
 * que não guarda nada além do nome/turno da turma, irrelevante para o
 * cálculo do boletim em si).
 */
export function MyBoletimPage() {
  const { student, loading: loadingStudent, error: studentError, reload: loadStudent } =
    useOwnStudent("meu-boletim:aluno");

  const [period, setPeriod] = useState<BoletimPeriod>("annual");
  const [boletim, setBoletim] = useState<StudentBoletim | null>(null);
  const [boletimLoading, setBoletimLoading] = useState(false);
  const [boletimError, setBoletimError] = useState<string | null>(null);

  const schoolYear = new Date().getFullYear();

  async function loadBoletim() {
    if (!student?.classId) return;
    setBoletimLoading(true);
    setBoletimError(null);
    try {
      const data = await getStudentBoletim(student.id, student.classId, schoolYear, period);
      setBoletim(data);
    } catch (error) {
      setBoletimError(describeFirebaseError(error, "meu-boletim:boletim"));
    } finally {
      setBoletimLoading(false);
    }
  }

  useEffect(() => {
    if (student?.classId) loadBoletim();
    else setBoletim(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id, student?.classId, period]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-semibold text-ink900">Meu Boletim</h2>
        <p className="text-sm text-ink-500">Acompanhe suas notas e sua frequência</p>
      </div>

      {loadingStudent ? (
        <Card>
          <TableSkeleton columns={5} />
        </Card>
      ) : studentError ? (
        <Card>
          <ErrorState message={studentError} onRetry={loadStudent} />
        </Card>
      ) : !student ? (
        <EmptyState
          icon={UserX}
          title="Cadastro não encontrado"
          description="Sua conta ainda não está vinculada a nenhum registro acadêmico. Fale com a secretaria da escola."
        />
      ) : !student.classId ? (
        <EmptyState
          icon={FileQuestion}
          title="Sem turma vinculada"
          description="Você ainda não está matriculado em nenhuma turma neste ano letivo."
        />
      ) : (
        <>
          <Card className="mb-6 flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-end">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Nome" value={student.name} />
              <Field label="Matrícula" value={student.registrationNumber || "—"} />
              <Field label="Ano letivo" value={String(schoolYear)} />
            </div>
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
          </Card>

          {boletimLoading ? (
            <Card>
              <TableSkeleton columns={5} />
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
                description="Ainda não há disciplinas vinculadas à sua turma para o ano letivo selecionado."
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
