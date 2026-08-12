import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Eye, Pencil, Trash2, BookOpen, User, Layers, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DisciplineFormModal } from "@/components/disciplines/DisciplineFormModal";
import { DisciplineDetailModal } from "@/components/disciplines/DisciplineDetailModal";
import { DisciplineStatusBadge } from "@/components/disciplines/DisciplineStatusBadge";
import {
  createDiscipline,
  deleteDiscipline,
  getDisciplines,
  updateDiscipline,
} from "@/services/disciplines/disciplineService";
import { getClasses, getStudentCountsByClassName } from "@/services/classes/classService";
import { getTeachers } from "@/services/users/userService";
import {
  DISCIPLINE_STATUS_LABEL,
  type Discipline,
  type DisciplineInput,
} from "@/types/discipline";
import type { SchoolClass } from "@/types/schoolClass";
import type { UserProfile } from "@/types/user";

const ALL = "all";

export function DisciplinesPage() {
  const { profile } = useAuth();
  const canManage = profile?.role === "admin" || profile?.role === "teacher";
  const canDelete = profile?.role === "admin";

  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<string>(ALL);
  const [teacherFilter, setTeacherFilter] = useState<string>(ALL);
  const [classFilter, setClassFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  const [editing, setEditing] = useState<Discipline | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<Discipline | null>(null);
  const [deleting, setDeleting] = useState<Discipline | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [disciplinesData, classesData, counts, teachersData] = await Promise.all([
        getDisciplines(),
        getClasses(),
        getStudentCountsByClassName(),
        getTeachers(),
      ]);
      setDisciplines(disciplinesData);
      setClasses(classesData);
      setStudentCounts(counts);
      setTeachers(teachersData);
    } catch {
      setError("Não foi possível carregar as disciplinas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const classNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const schoolClass of classes) map[schoolClass.id] = schoolClass.name;
    return map;
  }, [classes]);

  const yearOptions = useMemo(
    () => Array.from(new Set(disciplines.map((d) => d.schoolYear))).sort((a, b) => b - a),
    [disciplines]
  );
  const teacherOptions = useMemo(
    () =>
      Array.from(new Set(disciplines.map((d) => d.teacherName).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [disciplines]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return disciplines.filter((d) => {
      if (term) {
        const classNames = d.classIds.map((id) => classNameById[id] ?? "").join(" ");
        const haystack = `${d.name} ${d.code} ${d.teacherName} ${classNames}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (yearFilter !== ALL && String(d.schoolYear) !== yearFilter) return false;
      if (teacherFilter !== ALL && d.teacherName !== teacherFilter) return false;
      if (classFilter !== ALL && !d.classIds.includes(classFilter)) return false;
      if (statusFilter !== ALL && d.status !== statusFilter) return false;
      return true;
    });
  }, [disciplines, search, yearFilter, teacherFilter, classFilter, statusFilter, classNameById]);

  const stats = useMemo(() => {
    const active = disciplines.filter((d) => d.status === "active").length;
    const linkedClassIds = new Set(disciplines.flatMap((d) => d.classIds));
    const linkedTeachers = new Set(
      disciplines.map((d) => d.teacherId).filter((id): id is string => !!id)
    );
    return {
      total: disciplines.length,
      active,
      classes: linkedClassIds.size,
      teachers: linkedTeachers.size,
    };
  }, [disciplines]);

  async function handleCreateOrUpdate(data: DisciplineInput) {
    if (editing) {
      await updateDiscipline(editing.id, data);
    } else {
      await createDiscipline(data);
    }
    await loadData();
  }

  async function handleDelete() {
    if (!deleting) return;
    await deleteDiscipline(deleting.id);
    setDeleting(null);
    await loadData();
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink900">Disciplinas</h2>
          <p className="text-sm text-ink-500">
            Gerencie as disciplinas e suas relações com turmas e professores
          </p>
        </div>

        {canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nova disciplina
          </Button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Disciplinas" sublabel="Total cadastradas" value={stats.total} />
        <StatCard icon={BookOpen} label="Ativas" sublabel="Em funcionamento" value={stats.active} />
        <StatCard icon={Layers} label="Turmas" sublabel="Turmas vinculadas" value={stats.classes} />
        <StatCard icon={User} label="Professores" sublabel="Responsáveis" value={stats.teachers} />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Card className="flex flex-1 items-center gap-2 px-3.5 py-2.5">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            className="w-full bg-transparent text-sm text-ink900 outline-none placeholder:text-ink-300"
            placeholder="Buscar disciplina, professor ou turma..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto lg:shrink-0">
          <Select
            label="Filtrar por ano letivo"
            hideLabel
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value={ALL}>Ano letivo</option>
            {yearOptions.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </Select>
          <Select
            label="Filtrar por professor"
            hideLabel
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
          >
            <option value={ALL}>Professor</option>
            {teacherOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
          <Select
            label="Filtrar por turma"
            hideLabel
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value={ALL}>Turma</option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name}
              </option>
            ))}
          </Select>
          <Select
            label="Filtrar por status"
            hideLabel
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value={ALL}>Status</option>
            {Object.entries(DISCIPLINE_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner label="Carregando disciplinas..." />
        ) : error ? (
          <div className="p-8 text-center">
            <p className="mb-3 text-sm text-danger">{error}</p>
            <Button variant="secondary" onClick={loadData}>
              Tentar novamente
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500">
            {disciplines.length === 0 ? (
              <div className="flex flex-col items-center gap-3">
                <p>Nenhuma disciplina cadastrada ainda.</p>
                {canManage && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditing(null);
                      setShowForm(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Cadastrar disciplina
                  </Button>
                )}
              </div>
            ) : (
              "Nenhuma disciplina encontrada para esses filtros."
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 font-medium">Disciplina</th>
                  <th className="px-4 py-3 font-medium">Professor</th>
                  <th className="px-4 py-3 font-medium">Turmas</th>
                  <th className="px-4 py-3 font-medium">Carga horária</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((discipline) => (
                  <tr key={discipline.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card bg-ink-50 text-ink-600">
                          <BookOpen className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink900">{discipline.name}</p>
                          <p className="truncate font-mono text-xs text-ink-400">
                            {discipline.code}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-ink-400" />
                        {discipline.teacherName || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-ink-400" />
                        {discipline.classIds.length} turma
                        {discipline.classIds.length === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-ink-400" />
                        {discipline.workload}h
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DisciplineStatusBadge status={discipline.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          aria-label={`Ver detalhes de ${discipline.name}`}
                          className="rounded-card p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
                          onClick={() => setViewing(discipline)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canManage && (
                          <button
                            aria-label={`Editar ${discipline.name}`}
                            className="rounded-card p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
                            onClick={() => {
                              setEditing(discipline);
                              setShowForm(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            aria-label={`Excluir ${discipline.name}`}
                            className="rounded-card p-1.5 text-ink-400 hover:bg-danger/10 hover:text-danger"
                            onClick={() => setDeleting(discipline)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showForm && (
        <DisciplineFormModal
          discipline={editing}
          classes={classes}
          studentCounts={studentCounts}
          teachers={teachers}
          onClose={() => setShowForm(false)}
          onSubmit={handleCreateOrUpdate}
        />
      )}

      {viewing && (
        <DisciplineDetailModal
          discipline={viewing}
          canManage={canManage}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
            setShowForm(true);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir disciplina"
          description={`A disciplina ${deleting.name} (${deleting.code}) será removida permanentemente. Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  sublabel,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  sublabel: string;
  value: number;
}) {
  return (
    <Card className="flex items-center gap-3 px-4 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-ink-700 text-white">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold text-ink900">{value}</p>
        <p className="truncate text-xs font-medium text-ink-600">{label}</p>
        <p className="truncate text-xs text-ink-400">{sublabel}</p>
      </div>
    </Card>
  );
}
