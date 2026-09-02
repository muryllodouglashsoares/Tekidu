import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2, BarChart3, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StudentFormModal } from "@/components/students/StudentFormModal";
import { StudentStatusBadge } from "@/components/students/StudentStatusBadge";
import { SortableTh } from "@/components/table/SortableTh";
import { Pagination } from "@/components/table/Pagination";
import { FilterSummary } from "@/components/table/FilterSummary";
import { BulkActionsBar } from "@/components/table/BulkActionsBar";
import { RowCheckbox } from "@/components/table/RowCheckbox";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSort } from "@/hooks/useSort";
import { usePagination } from "@/hooks/usePagination";
import { useRowSelection } from "@/hooks/useRowSelection";
import {
  createStudent,
  deleteStudent,
  getStudents,
  updateStudent,
  type StudentCreateInput,
} from "@/services/students/studentService";
import { getClasses } from "@/services/classes/classService";
import { STUDENT_STATUS_LABEL, type Student, type StudentInput, type StudentStatus } from "@/types/student";
import type { SchoolClass } from "@/types/schoolClass";
import { describeFirebaseError } from "@/utils/firebaseError";

const ALL = "all";
type SortKey = "name" | "registrationNumber" | "class" | "average" | "status";

export function StudentsPage() {
  const { profile } = useAuth();
  const canManage = profile?.role === "admin" || profile?.role === "teacher";
  const navigate = useNavigate();
  const toast = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [classFilter, setClassFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  const [editing, setEditing] = useState<Student | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<StudentStatus>("active");
  const [bulkStatusChanging, setBulkStatusChanging] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [studentsData, classesData] = await Promise.all([getStudents(), getClasses()]);
      setStudents(studentsData);
      setClasses(classesData);
    } catch (error) {
      setError(describeFirebaseError(error, "alunos:listar"));
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

  const activeFilterCount = [search.trim() !== "", classFilter !== ALL, statusFilter !== ALL].filter(
    Boolean
  ).length;

  function clearFilters() {
    setSearchInput("");
    setClassFilter(ALL);
    setStatusFilter(ALL);
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((s) => {
      const className = s.classId ? classNameById[s.classId] ?? "" : "";
      if (term) {
        const matches =
          s.name.toLowerCase().includes(term) ||
          s.email.toLowerCase().includes(term) ||
          s.registrationNumber.toLowerCase().includes(term) ||
          className.toLowerCase().includes(term);
        if (!matches) return false;
      }
      if (classFilter !== ALL && s.classId !== classFilter) return false;
      if (statusFilter !== ALL && s.status !== statusFilter) return false;
      return true;
    });
  }, [students, search, classFilter, statusFilter, classNameById]);

  const { sort, toggleSort, sorted } = useSort<Student, SortKey>(filtered, (student, key) => {
    switch (key) {
      case "name":
        return student.name;
      case "registrationNumber":
        return student.registrationNumber;
      case "class":
        return student.classId ? classNameById[student.classId] ?? "" : "";
      case "average":
        return student.average;
      case "status":
        return STUDENT_STATUS_LABEL[student.status];
      default:
        return null;
    }
  });

  const { page, pageSize, totalPages, totalItems, pageItems, setPage, changePageSize, resetPage } =
    usePagination(sorted, 10);

  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, classFilter, statusFilter]);

  const selection = useRowSelection<Student>((s) => s.id);
  const pageSelectionState = selection.visibleSelectionState(pageItems);

  async function handleCreate(data: StudentCreateInput) {
    await createStudent(data);
    await loadData();
    toast.success(`${data.name} foi cadastrado com sucesso.`);
  }

  async function handleUpdate(data: StudentInput) {
    if (!editing) return;
    await updateStudent(editing.id, data);
    await loadData();
    toast.success(`${data.name} foi atualizado com sucesso.`);
  }

  async function handleDelete() {
    if (!deleting) return;
    const name = deleting.name;
    await deleteStudent(deleting.id);
    setDeleting(null);
    await loadData();
    toast.success(`${name} foi excluído.`);
  }

  async function handleBulkDelete() {
    const ids = Array.from(selection.selectedIds);
    await Promise.all(ids.map((id) => deleteStudent(id)));
    setBulkDeleting(false);
    selection.clear();
    await loadData();
    toast.success(`${ids.length} aluno${ids.length === 1 ? "" : "s"} excluído${ids.length === 1 ? "" : "s"}.`);
  }

  async function handleBulkStatusChange() {
    const targets = students.filter((s) => selection.selectedIds.has(s.id));
    await Promise.all(
      targets.map((s) =>
        updateStudent(s.id, {
          name: s.name,
          email: s.email,
          registrationNumber: s.registrationNumber,
          classId: s.classId,
          status: bulkStatusValue,
          average: s.average,
        })
      )
    );
    setBulkStatusChanging(false);
    selection.clear();
    await loadData();
    toast.success(
      `Situação de ${targets.length} aluno${targets.length === 1 ? "" : "s"} atualizada para "${STUDENT_STATUS_LABEL[bulkStatusValue]}".`
    );
  }

  function initials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink900">Alunos</h2>
          <p className="text-sm text-ink-500">
            {students.length} aluno{students.length === 1 ? "" : "s"} cadastrado
            {students.length === 1 ? "" : "s"}
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
            Novo aluno
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Card className="flex flex-1 items-center gap-2 px-3.5 py-2.5">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            className="w-full bg-transparent text-sm text-ink900 outline-none placeholder:text-ink-300"
            placeholder="Buscar por nome, e-mail, matrícula ou turma..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </Card>

        <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Filtrar por turma"
              hideLabel
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value={ALL}>Turma</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              label="Filtrar por situação"
              hideLabel
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value={ALL}>Situação</option>
              {Object.entries(STUDENT_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <FilterSummary activeCount={activeFilterCount} onClear={clearFilters} />
        </div>
      </div>

      {canManage && (
        <BulkActionsBar count={selection.count} onClear={selection.clear}>
          <div className="flex items-center gap-1.5">
            <Select
              label="Nova situação"
              hideLabel
              value={bulkStatusValue}
              onChange={(e) => setBulkStatusValue(e.target.value as StudentStatus)}
              className="!w-auto"
            >
              {Object.entries(STUDENT_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Button size="sm" variant="secondary" onClick={() => setBulkStatusChanging(true)}>
              Alterar situação
            </Button>
          </div>
          <Button size="sm" variant="secondary" className="!text-danger" onClick={() => setBulkDeleting(true)}>
            <Trash2 className="h-3.5 w-3.5" />
            Excluir
          </Button>
        </BulkActionsBar>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton columns={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : totalItems === 0 ? (
          students.length === 0 ? (
            <EmptyState
              bare
              icon={Users}
              title="Nenhum aluno cadastrado ainda"
              description="Cadastre o primeiro aluno para começar a acompanhar turmas, notas e frequência."
              action={
                canManage
                  ? {
                      label: "Adicionar aluno",
                      onClick: () => {
                        setEditing(null);
                        setShowForm(true);
                      },
                    }
                  : undefined
              }
            />
          ) : (
            <EmptyState
              bare
              icon={Search}
              title="Nenhum aluno encontrado"
              description="Não encontramos alunos para os filtros selecionados. Tente ajustá-los ou limpar a busca."
            />
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-400">
                    {canManage && (
                      <th className="w-10 px-4 py-3">
                        <RowCheckbox
                          checked={pageSelectionState === "all"}
                          indeterminate={pageSelectionState === "some"}
                          onChange={() => selection.toggleAllVisible(pageItems)}
                          label="Selecionar todos os alunos desta página"
                        />
                      </th>
                    )}
                    <SortableTh
                      label="Aluno"
                      active={sort.key === "name"}
                      direction={sort.direction}
                      onClick={() => toggleSort("name")}
                    />
                    <SortableTh
                      label="Matrícula"
                      active={sort.key === "registrationNumber"}
                      direction={sort.direction}
                      onClick={() => toggleSort("registrationNumber")}
                    />
                    <SortableTh
                      label="Turma"
                      active={sort.key === "class"}
                      direction={sort.direction}
                      onClick={() => toggleSort("class")}
                    />
                    <SortableTh
                      label="Média"
                      active={sort.key === "average"}
                      direction={sort.direction}
                      onClick={() => toggleSort("average")}
                    />
                    <SortableTh
                      label="Situação"
                      active={sort.key === "status"}
                      direction={sort.direction}
                      onClick={() => toggleSort("status")}
                    />
                    <th className="px-4 py-3 font-medium" />
                    {canManage && <th className="px-4 py-3 font-medium" />}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((student) => (
                    <tr key={student.id} className="border-b border-line last:border-0">
                      {canManage && (
                        <td className="px-4 py-3">
                          <RowCheckbox
                            checked={selection.isSelected(student)}
                            onChange={() => selection.toggle(student)}
                            label={`Selecionar ${student.name}`}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/alunos/${student.id}`)}
                          className="flex items-center gap-3 text-left hover:underline"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                            {initials(student.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink900">{student.name}</span>
                            <span className="block truncate text-xs text-ink-400">{student.email}</span>
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 tabular text-ink-600">
                        {student.registrationNumber}
                      </td>
                      <td className="px-4 py-3 text-ink-600">
                        {student.classId ? classNameById[student.classId] ?? "—" : "—"}
                      </td>
                      <td className="px-4 py-3 tabular text-ink-600">
                        {student.average !== null ? student.average.toFixed(1) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StudentStatusBadge status={student.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            aria-label={`Ver relatório de desenvolvimento de ${student.name}`}
                            title={
                              student.classId ? "Ver relatório de desenvolvimento" : "Aluno sem turma vinculada"
                            }
                            disabled={!student.classId}
                            className="rounded-card p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                            onClick={() => navigate(`/relatorios?studentId=${student.id}&view=${student.classId}`)}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              aria-label={`Editar ${student.name}`}
                              className="rounded-card p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
                              onClick={() => {
                                setEditing(student);
                                setShowForm(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              aria-label={`Excluir ${student.name}`}
                              className="rounded-card p-1.5 text-ink-400 hover:bg-danger/10 hover:text-danger"
                              onClick={() => setDeleting(student)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={changePageSize}
            />
          </>
        )}
      </Card>

      {showForm && (
        <StudentFormModal
          student={editing}
          classes={classes}
          onClose={() => setShowForm(false)}
          onSubmitCreate={handleCreate}
          onSubmitUpdate={handleUpdate}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir aluno"
          description={`Tem certeza de que deseja excluir ${deleting.name}? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}

      {bulkDeleting && (
        <ConfirmDialog
          title="Excluir alunos selecionados"
          description={`Tem certeza de que deseja excluir ${selection.count} aluno${
            selection.count === 1 ? "" : "s"
          }? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onCancel={() => setBulkDeleting(false)}
          onConfirm={handleBulkDelete}
        />
      )}

      {bulkStatusChanging && (
        <ConfirmDialog
          title="Alterar situação em lote"
          description={`A situação de ${selection.count} aluno${
            selection.count === 1 ? "" : "s"
          } será alterada para "${STUDENT_STATUS_LABEL[bulkStatusValue]}".`}
          confirmLabel="Confirmar"
          onCancel={() => setBulkStatusChanging(false)}
          onConfirm={handleBulkStatusChange}
        />
      )}
    </div>
  );
}
