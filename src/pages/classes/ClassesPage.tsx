import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Eye, Pencil, Trash2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ClassFormModal } from "@/components/classes/ClassFormModal";
import { ClassDetailModal } from "@/components/classes/ClassDetailModal";
import { ClassShiftBadge } from "@/components/classes/ClassShiftBadge";
import { ClassStatusBadge } from "@/components/classes/ClassStatusBadge";
import {
  createClass,
  deleteClass,
  getClasses,
  getStudentCountsByClassId,
  updateClass,
} from "@/services/classes/classService";
import {
  CLASS_SHIFT_LABEL,
  CLASS_STATUS_LABEL,
  type ClassInput,
  type SchoolClass,
} from "@/types/schoolClass";
import { describeFirebaseError } from "@/utils/firebaseError";

const ALL = "all";

export function ClassesPage() {
  const { profile } = useAuth();
  const canManage = profile?.role === "admin" || profile?.role === "teacher";
  const canDelete = profile?.role === "admin";

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<string>(ALL);
  const [gradeFilter, setGradeFilter] = useState<string>(ALL);
  const [shiftFilter, setShiftFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<SchoolClass | null>(null);
  const [deleting, setDeleting] = useState<SchoolClass | null>(null);

  async function loadClasses() {
    setLoading(true);
    setError(null);
    try {
      const [classesData, counts] = await Promise.all([
        getClasses(),
        getStudentCountsByClassId(),
      ]);
      setClasses(classesData);
      setStudentCounts(counts);
    } catch (error) {
      setError(describeFirebaseError(error, "turmas:listar"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClasses();
  }, []);

  const yearOptions = useMemo(
    () => Array.from(new Set(classes.map((c) => c.schoolYear))).sort((a, b) => b - a),
    [classes]
  );
  const gradeOptions = useMemo(
    () => Array.from(new Set(classes.map((c) => c.grade))).sort(),
    [classes]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return classes.filter((c) => {
      if (term && !c.name.toLowerCase().includes(term)) return false;
      if (yearFilter !== ALL && String(c.schoolYear) !== yearFilter) return false;
      if (gradeFilter !== ALL && c.grade !== gradeFilter) return false;
      if (shiftFilter !== ALL && c.shift !== shiftFilter) return false;
      if (statusFilter !== ALL && c.status !== statusFilter) return false;
      return true;
    });
  }, [classes, search, yearFilter, gradeFilter, shiftFilter, statusFilter]);

  async function handleCreateOrUpdate(data: ClassInput) {
    if (editing) {
      await updateClass(editing.id, data);
    } else {
      await createClass(data);
    }
    await loadClasses();
  }

  async function handleDelete() {
    if (!deleting || !profile) return;
    await deleteClass(deleting.id, { id: profile.uid, name: profile.name });
    setDeleting(null);
    await loadClasses();
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink900">Turmas</h2>
          <p className="text-sm text-ink-500">Gerencie as turmas da sua instituição</p>
        </div>

        {canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nova turma
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Card className="flex flex-1 items-center gap-2 px-3.5 py-2.5">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            className="w-full bg-transparent text-sm text-ink900 outline-none placeholder:text-ink-300"
            placeholder="Buscar turma..."
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
            label="Filtrar por série"
            hideLabel
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
          >
            <option value={ALL}>Série</option>
            {gradeOptions.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </Select>
          <Select
            label="Filtrar por turno"
            hideLabel
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
          >
            <option value={ALL}>Turno</option>
            {Object.entries(CLASS_SHIFT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
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
            {Object.entries(CLASS_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner label="Carregando turmas..." />
        ) : error ? (
          <div className="p-8 text-center">
            <p className="mb-3 text-sm text-danger">{error}</p>
            <Button variant="secondary" onClick={loadClasses}>
              Tentar novamente
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500">
            {classes.length === 0
              ? "Nenhuma turma cadastrada ainda."
              : "Nenhuma turma encontrada para esses filtros."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 font-medium">Turma</th>
                  <th className="px-4 py-3 font-medium">Série</th>
                  <th className="px-4 py-3 font-medium">Ano letivo</th>
                  <th className="px-4 py-3 font-medium">Turno</th>
                  <th className="px-4 py-3 font-medium">Alunos</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((schoolClass) => (
                  <tr key={schoolClass.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink900">{schoolClass.name}</td>
                    <td className="px-4 py-3 text-ink-600">{schoolClass.grade}</td>
                    <td className="px-4 py-3 tabular text-ink-600">{schoolClass.schoolYear}</td>
                    <td className="px-4 py-3">
                      <ClassShiftBadge shift={schoolClass.shift} />
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-ink-400" />
                        {studentCounts[schoolClass.id] ?? 0} aluno
                        {(studentCounts[schoolClass.id] ?? 0) === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ClassStatusBadge status={schoolClass.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          aria-label={`Ver detalhes de ${schoolClass.name}`}
                          className="rounded-card p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
                          onClick={() => setViewing(schoolClass)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canManage && (
                          <button
                            aria-label={`Editar ${schoolClass.name}`}
                            className="rounded-card p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
                            onClick={() => {
                              setEditing(schoolClass);
                              setShowForm(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            aria-label={`Excluir ${schoolClass.name}`}
                            className="rounded-card p-1.5 text-ink-400 hover:bg-danger/10 hover:text-danger"
                            onClick={() => setDeleting(schoolClass)}
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
        <ClassFormModal
          schoolClass={editing}
          onClose={() => setShowForm(false)}
          onSubmit={handleCreateOrUpdate}
        />
      )}

      {viewing && <ClassDetailModal schoolClass={viewing} onClose={() => setViewing(null)} />}

      {deleting && (
        <ConfirmDialog
          title="Excluir turma"
          description={`Tem certeza de que deseja excluir a turma ${deleting.name}? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
