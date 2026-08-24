import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Power, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TeacherFormModal } from "@/components/teachers/TeacherFormModal";
import { TeacherStatusBadge } from "@/components/teachers/TeacherStatusBadge";
import { SortableTh } from "@/components/table/SortableTh";
import { Pagination } from "@/components/table/Pagination";
import { FilterSummary } from "@/components/table/FilterSummary";
import { BulkActionsBar } from "@/components/table/BulkActionsBar";
import { RowCheckbox } from "@/components/table/RowCheckbox";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSort } from "@/hooks/useSort";
import { usePagination } from "@/hooks/usePagination";
import { useRowSelection } from "@/hooks/useRowSelection";
import { createTeacher, getAllTeachers, updateTeacherProfile } from "@/services/users/userService";
import { getDisciplines } from "@/services/disciplines/disciplineService";
import type { UserProfile } from "@/types/user";
import type { Discipline } from "@/types/discipline";
import { describeFirebaseError } from "@/utils/firebaseError";

const ALL = "all";
type StatusFilter = typeof ALL | "active" | "inactive";
type SortKey = "name" | "status";

export function TeachersPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [disciplineFilter, setDisciplineFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL);

  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [togglingActive, setTogglingActive] = useState<UserProfile | null>(null);
  const [bulkAction, setBulkAction] = useState<"activate" | "deactivate" | null>(null);

  async function loadTeachers() {
    setLoading(true);
    setError(null);
    try {
      const [teachersData, disciplinesData] = await Promise.all([getAllTeachers(), getDisciplines()]);
      setTeachers(teachersData);
      setDisciplines(disciplinesData);
    } catch (error) {
      setError(describeFirebaseError(error, "professores:listar"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeachers();
  }, []);

  const teacherIdsByDiscipline = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const d of disciplines) {
      if (!d.teacherId) continue;
      if (!map[d.id]) map[d.id] = new Set();
      map[d.id].add(d.teacherId);
    }
    return map;
  }, [disciplines]);

  const activeFilterCount = [search.trim() !== "", disciplineFilter !== ALL, statusFilter !== ALL].filter(
    Boolean
  ).length;

  function clearFilters() {
    setSearchInput("");
    setDisciplineFilter(ALL);
    setStatusFilter(ALL);
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return teachers.filter((t) => {
      if (term && !(t.name.toLowerCase().includes(term) || t.email.toLowerCase().includes(term))) {
        return false;
      }
      if (disciplineFilter !== ALL && !teacherIdsByDiscipline[disciplineFilter]?.has(t.uid)) return false;
      if (statusFilter !== ALL && t.active !== (statusFilter === "active")) return false;
      return true;
    });
  }, [teachers, search, disciplineFilter, statusFilter, teacherIdsByDiscipline]);

  const { sort, toggleSort, sorted } = useSort<UserProfile, SortKey>(filtered, (t, key) =>
    key === "name" ? t.name : t.active ? "Ativo" : "Inativo"
  );

  const { page, pageSize, totalPages, totalItems, pageItems, setPage, changePageSize, resetPage } =
    usePagination(sorted, 10);

  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, disciplineFilter, statusFilter]);

  const selection = useRowSelection<UserProfile>((t) => t.uid);
  const pageSelectionState = selection.visibleSelectionState(pageItems);

  async function handleCreate(data: { name: string; email: string }) {
    if (!profile) return;
    await createTeacher(data, { id: profile.uid, name: profile.name });
    await loadTeachers();
    toast.success(`${data.name} foi cadastrado com sucesso.`);
  }

  async function handleUpdate(data: { name: string; active: boolean }) {
    if (!editing || !profile) return;
    await updateTeacherProfile(editing.uid, data, { id: profile.uid, name: profile.name });
    await loadTeachers();
    toast.success(`${data.name} foi atualizado com sucesso.`);
  }

  async function handleToggleActive() {
    if (!togglingActive || !profile) return;
    const nextActive = !togglingActive.active;
    await updateTeacherProfile(
      togglingActive.uid,
      { name: togglingActive.name, active: nextActive },
      { id: profile.uid, name: profile.name }
    );
    setTogglingActive(null);
    await loadTeachers();
    toast.success(
      nextActive
        ? `${togglingActive.name} foi ativado.`
        : `${togglingActive.name} foi desativado.`
    );
  }

  async function handleBulkToggle() {
    if (!bulkAction || !profile) return;
    const nextActive = bulkAction === "activate";
    const targets = teachers.filter((t) => selection.selectedIds.has(t.uid));
    await Promise.all(
      targets.map((t) =>
        updateTeacherProfile(t.uid, { name: t.name, active: nextActive }, { id: profile.uid, name: profile.name })
      )
    );
    setBulkAction(null);
    selection.clear();
    await loadTeachers();
    toast.success(
      `${targets.length} professor${targets.length === 1 ? "" : "es"} ${nextActive ? "ativado" : "desativado"}${
        targets.length === 1 ? "" : "s"
      }.`
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
          <h2 className="font-display text-xl font-semibold text-ink900">Professores</h2>
          <p className="text-sm text-ink-500">
            {teachers.length} professor{teachers.length === 1 ? "" : "es"} cadastrado
            {teachers.length === 1 ? "" : "s"}
          </p>
        </div>

        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo professor
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Card className="flex flex-1 items-center gap-2 px-3.5 py-2.5">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            className="w-full bg-transparent text-sm text-ink900 outline-none placeholder:text-ink-300"
            placeholder="Buscar por nome ou e-mail..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </Card>

        <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Filtrar por disciplina"
              hideLabel
              value={disciplineFilter}
              onChange={(e) => setDisciplineFilter(e.target.value)}
            >
              <option value={ALL}>Disciplina</option>
              {disciplines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <Select
              label="Filtrar por status"
              hideLabel
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value={ALL}>Status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </Select>
          </div>
          <FilterSummary activeCount={activeFilterCount} onClear={clearFilters} />
        </div>
      </div>

      <BulkActionsBar count={selection.count} onClear={selection.clear}>
        <Button size="sm" variant="secondary" onClick={() => setBulkAction("activate")}>
          Ativar
        </Button>
        <Button size="sm" variant="secondary" className="!text-danger" onClick={() => setBulkAction("deactivate")}>
          Desativar
        </Button>
      </BulkActionsBar>

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton columns={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={loadTeachers} />
        ) : totalItems === 0 ? (
          teachers.length === 0 ? (
            <EmptyState
              bare
              icon={GraduationCap}
              title="Nenhum professor cadastrado ainda"
              description="Cadastre o primeiro professor para vinculá-lo a disciplinas e turmas."
              action={{
                label: "Cadastrar professor",
                onClick: () => {
                  setEditing(null);
                  setShowForm(true);
                },
              }}
            />
          ) : (
            <EmptyState
              bare
              icon={Search}
              title="Nenhum professor encontrado"
              description="Não encontramos professores para os filtros selecionados. Tente ajustá-los ou limpar a busca."
            />
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-400">
                    <th className="w-10 px-4 py-3">
                      <RowCheckbox
                        checked={pageSelectionState === "all"}
                        indeterminate={pageSelectionState === "some"}
                        onChange={() => selection.toggleAllVisible(pageItems)}
                        label="Selecionar todos os professores desta página"
                      />
                    </th>
                    <SortableTh
                      label="Professor"
                      active={sort.key === "name"}
                      direction={sort.direction}
                      onClick={() => toggleSort("name")}
                    />
                    <SortableTh
                      label="Status"
                      active={sort.key === "status"}
                      direction={sort.direction}
                      onClick={() => toggleSort("status")}
                    />
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((teacher) => (
                    <tr key={teacher.uid} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <RowCheckbox
                          checked={selection.isSelected(teacher)}
                          onChange={() => selection.toggle(teacher)}
                          label={`Selecionar ${teacher.name}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                            {initials(teacher.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink900">{teacher.name}</p>
                            <p className="truncate text-xs text-ink-400">{teacher.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <TeacherStatusBadge active={teacher.active} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            aria-label={`Editar ${teacher.name}`}
                            className="rounded-card p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
                            onClick={() => {
                              setEditing(teacher);
                              setShowForm(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            aria-label={
                              teacher.active ? `Desativar ${teacher.name}` : `Ativar ${teacher.name}`
                            }
                            className="rounded-card p-1.5 text-ink-400 hover:bg-danger/10 hover:text-danger"
                            onClick={() => setTogglingActive(teacher)}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
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
        <TeacherFormModal
          teacher={editing}
          onClose={() => setShowForm(false)}
          onSubmitCreate={handleCreate}
          onSubmitUpdate={handleUpdate}
        />
      )}

      {togglingActive && (
        <ConfirmDialog
          title={togglingActive.active ? "Desativar professor" : "Ativar professor"}
          description={
            togglingActive.active
              ? `${togglingActive.name} não poderá mais ser selecionado como responsável por novas disciplinas nem acessar o sistema. Isso não exclui o cadastro.`
              : `${togglingActive.name} voltará a poder acessar o sistema e ser selecionado como responsável por disciplinas.`
          }
          confirmLabel={togglingActive.active ? "Desativar" : "Ativar"}
          onCancel={() => setTogglingActive(null)}
          onConfirm={handleToggleActive}
        />
      )}

      {bulkAction && (
        <ConfirmDialog
          title={bulkAction === "activate" ? "Ativar professores selecionados" : "Desativar professores selecionados"}
          description={`${selection.count} professor${selection.count === 1 ? "" : "es"} será${
            selection.count === 1 ? "" : "ão"
          } ${bulkAction === "activate" ? "ativado" : "desativado"}${selection.count === 1 ? "" : "s"}.`}
          confirmLabel={bulkAction === "activate" ? "Ativar" : "Desativar"}
          onCancel={() => setBulkAction(null)}
          onConfirm={handleBulkToggle}
        />
      )}
    </div>
  );
}
