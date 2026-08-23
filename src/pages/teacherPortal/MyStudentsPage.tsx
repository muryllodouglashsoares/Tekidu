import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { SituationBadge } from "@/components/notes/SituationBadge";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  getTeacherStudentsOverview,
  type TeacherStudentOverview,
} from "@/services/academic/teacherOverviewService";
import { describeFirebaseError } from "@/utils/firebaseError";

const ALL = "all";

/**
 * "Meus Alunos" (seção 5 do plano multi-role) — mostra somente alunos
 * matriculados em turmas de disciplinas do professor logado
 * (`teacherOverviewService.getTeacherStudentsOverview`). Média e
 * frequência exibidas aqui são calculadas SÓ sobre as disciplinas
 * deste professor com o aluno, não a média geral do aluno na escola.
 *
 * "Ver perfil" reaproveita a mesma `StudentProfilePage` já usada por
 * staff em `/alunos/:studentId` (a rota já permite `teacher`) — não
 * duplica a tela de perfil acadêmico só para o portal do professor.
 */
export function MyStudentsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<TeacherStudentOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [classFilter, setClassFilter] = useState<string>(ALL);

  const schoolYear = new Date().getFullYear();

  async function load() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const overview = await getTeacherStudentsOverview(profile.uid, schoolYear);
      setStudents(overview);
    } catch (err) {
      setError(describeFirebaseError(err, "meus-alunos:listar"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid]);

  const classOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of students) seen.set(s.schoolClass.id, s.schoolClass.name);
    return Array.from(seen.entries());
  }, [students]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((s) => {
      if (term && !s.student.name.toLowerCase().includes(term)) return false;
      if (classFilter !== ALL && s.schoolClass.id !== classFilter) return false;
      return true;
    });
  }, [students, search, classFilter]);

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
        <ErrorState message={error} onRetry={load} />
      </Card>
    );
  }

  if (students.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Nenhum aluno vinculado"
        description="Seus alunos aparecerão aqui assim que você estiver vinculado a uma disciplina/turma."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Card className="flex flex-1 items-center gap-2 px-3.5 py-2.5">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            className="w-full bg-transparent text-sm text-ink900 outline-none placeholder:text-ink-300"
            placeholder="Buscar aluno..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </Card>
        <Select
          label="Filtrar por turma"
          hideLabel
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="lg:w-56"
        >
          <option value={ALL}>Todas as turmas</option>
          {classOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum aluno encontrado"
            description="Ajuste a busca ou o filtro de turma."
            bare
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Turma</th>
                  <th className="px-4 py-3">Média</th>
                  <th className="px-4 py-3">Frequência</th>
                  <th className="px-4 py-3">Situação</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.student.id} className="border-b border-line last:border-0 hover:bg-ink-50/50">
                    <td className="px-4 py-3 font-medium text-ink900">{row.student.name}</td>
                    <td className="px-4 py-3 text-ink-600">{row.schoolClass.name}</td>
                    <td className="px-4 py-3 text-ink-600">
                      {row.average === null ? (
                        <span className="text-ink-400">Sem notas</span>
                      ) : (
                        row.average.toFixed(1)
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {row.attendanceRate === null ? (
                        <span className="text-ink-400">Sem registros</span>
                      ) : (
                        `${row.attendanceRate}%`
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SituationBadge situation={row.situation} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/alunos/${row.student.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-ink-600 hover:text-ink-900"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver perfil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
