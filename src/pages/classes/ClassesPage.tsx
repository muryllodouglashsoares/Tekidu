import { useEffect, useMemo, useState, Suspense, lazy } from "react";
import { Plus, Search, Eye, Pencil, Trash2, Users, School, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TableSkeleton, MobileCardListSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ClassFormModal } from "@/components/classes/ClassFormModal";
import { ClassDetailModal } from "@/components/classes/ClassDetailModal";
import { ClassShiftBadge } from "@/components/classes/ClassShiftBadge";
import { ClassStatusBadge } from "@/components/classes/ClassStatusBadge";
import { SortableTh } from "@/components/table/SortableTh";
import { Pagination } from "@/components/table/Pagination";
import { FilterSummary } from "@/components/table/FilterSummary";
import { BulkActionsBar } from "@/components/table/BulkActionsBar";
import { RowCheckbox } from "@/components/table/RowCheckbox";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSort } from "@/hooks/useSort";
import { usePagination } from "@/hooks/usePagination";
import { useRowSelection } from "@/hooks/useRowSelection";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { MobileDataCard } from "@/components/mobile/MobileDataCard";
import { MobileFab } from "@/components/mobile/MobileFab";

const MobileSheet = lazy(() =>
  import("@/components/mobile/MobileSheet").then((m) => ({ default: m.MobileSheet }))
);
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
  type ClassStatus,
  type SchoolClass,
} from "@/types/schoolClass";
import { describeFirebaseError } from "@/utils/firebaseError";

const ALL = "all";
type SortKey = "name" | "grade" | "schoolYear" | "shift" | "students" | "status";

export function ClassesPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const isMobile = useIsMobile();
  const canManage = profile?.role === "admin" || profile?.role === "teacher";
  const canDelete = profile?.role === "admin";

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [yearFilter, setYearFilter] = useState<string>(ALL);
  const [gradeFilter, setGradeFilter] = useState<string>(ALL);
  const [shiftFilter, setShiftFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<SchoolClass | null>(null);
  const [deleting, setDeleting] = useState<SchoolClass | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<ClassStatus>("active");
  const [bulkStatusChanging, setBulkStatusChanging] = useState(false);

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

  const activeFilterCount = [
    search.trim() !== "",
    yearFilter !== ALL,
    gradeFilter !== ALL,
    shiftFilter !== ALL,
    statusFilter !== ALL,
  ].filter(Boolean).length;

  function clearFilters() {
    setSearchInput("");
    setYearFilter(ALL);
    setGradeFilter(ALL);
    setShiftFilter(ALL);
    setStatusFilter(ALL);
  }

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

  const { sort, toggleSort, sorted } = useSort<SchoolClass, SortKey>(filtered, (c, key) => {
    switch (key) {
      case "name":
        return c.name;
      case "grade":
        return c.grade;
      case "schoolYear":
        return c.schoolYear;
      case "shift":
        return CLASS_SHIFT_LABEL[c.shift];
      case "students":
        return studentCounts[c.id] ?? 0;
      case "status":
        return CLASS_STATUS_LABEL[c.status];
      default:
        return null;
    }
  });

  const { page, pageSize, totalPages, totalItems, pageItems, setPage, changePageSize, resetPage } =
    usePagination(sorted, 10);

  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, yearFilter, gradeFilter, shiftFilter, statusFilter]);

  const selection = useRowSelection<SchoolClass>((c) => c.id);
  const pageSelectionState = selection.visibleSelectionState(pageItems);

  async function handleCreateOrUpdate(data: ClassInput) {
    if (editing) {
      await updateClass(editing.id, data);
      toast.success(`${data.name} foi atualizada com sucesso.`);
    } else {
      await createClass(data);
      toast.success(`${data.name} foi cadastrada com sucesso.`);
    }
    await loadClasses();
  }

  async function handleDelete() {
    if (!deleting || !profile) return;
    const name = deleting.name;
    await deleteClass(deleting.id, { id: profile.uid, name: profile.name });
    setDeleting(null);
    await loadClasses();
    toast.success(`${name} foi excluída.`);
  }

  async function handleBulkDelete() {
    if (!profile) return;
    const ids = Array.from(selection.selectedIds);
    await Promise.all(ids.map((id) => deleteClass(id, { id: profile.uid, name: profile.name })));
    setBulkDeleting(false);
    selection.clear();
    await loadClasses();
    toast.success(`${ids.length} turma${ids.length === 1 ? "" : "s"} excluída${ids.length === 1 ? "" : "s"}.`);
  }

  async function handleBulkStatusChange() {
    const targets = classes.filter((c) => selection.selectedIds.has(c.id));
    await Promise.all(
      targets.map((c) =>
        updateClass(c.id, {
          name: c.name,
          grade: c.grade,
          schoolYear: c.schoolYear,
          shift: c.shift,
          status: bulkStatusValue,
        })
      )
    );
    setBulkStatusChanging(false);
    selection.clear();
    await loadClasses();
    toast.success(
      `Status de ${targets.length} turma${targets.length === 1 ? "" : "s"} atualizado para "${CLASS_STATUS_LABEL[bulkStatusValue]}".`
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="hidden font-display text-xl font-semibold text-ink900 md:block">Turmas</h2>
          <p className="text-sm text-ink-500">Gerencie as turmas da sua instituição</p>
        </div>

        {canManage && (
          <Button
            className="hidden md:inline-flex"
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </Card>

        <div className="hidden flex-wrap items-center gap-3 lg:flex lg:shrink-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          <FilterSummary activeCount={activeFilterCount} onClear={clearFilters} />
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-card border border-line bg-surface px-4 text-sm font-medium text-ink-600 shadow-sm"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink-700 px-1 text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && <FilterSummary activeCount={activeFilterCount} onClear={clearFilters} />}
        </div>
      </div>

      <Suspense fallback={null}>
        <MobileSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtros">
          <div className="flex flex-col gap-4 px-5 pb-6">
            <Select label="Ano letivo" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option value={ALL}>Todos os anos</option>
              {yearOptions.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </Select>
            <Select label="Série" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
              <option value={ALL}>Todas as séries</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </Select>
            <Select label="Turno" value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
              <option value={ALL}>Todos os turnos</option>
              {Object.entries(CLASS_SHIFT_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value={ALL}>Todos os status</option>
              {Object.entries(CLASS_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <div className="mt-2 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={clearFilters}>
                Limpar
              </Button>
              <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
                Aplicar filtros
              </Button>
            </div>
          </div>
        </MobileSheet>
      </Suspense>

      {canManage && (
        <BulkActionsBar count={selection.count} onClear={selection.clear}>
          <div className="flex items-center gap-1.5">
            <Select
              label="Novo status"
              hideLabel
              value={bulkStatusValue}
              onChange={(e) => setBulkStatusValue(e.target.value as ClassStatus)}
              className="!w-auto"
            >
              {Object.entries(CLASS_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Button size="sm" variant="secondary" onClick={() => setBulkStatusChanging(true)}>
              Alterar status
            </Button>
          </div>
          {canDelete && (
            <Button size="sm" variant="secondary" className="!text-danger" onClick={() => setBulkDeleting(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </Button>
          )}
        </BulkActionsBar>
      )}

      {(loading || error || totalItems === 0) && (
        <Card className="overflow-hidden">
          {loading ? (
            isMobile ? <MobileCardListSkeleton /> : <TableSkeleton columns={7} />
          ) : error ? (
            <ErrorState message={error} onRetry={loadClasses} />
          ) : classes.length === 0 ? (
            <EmptyState
              bare
              icon={School}
              title="Nenhuma turma cadastrada ainda"
              description="Crie a primeira turma para começar a matricular alunos e vincular disciplinas."
              action={
                canManage
                  ? {
                      label: "Nova turma",
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
              title="Nenhuma turma encontrada"
              description="Não encontramos turmas para os filtros selecionados. Tente ajustá-los ou limpar a busca."
            />
          )}
        </Card>
      )}

      {!loading && !error && totalItems > 0 && isMobile && (
        <div className="flex flex-col gap-2.5">
          {pageItems.map((schoolClass) => (
            <MobileDataCard
              key={schoolClass.id}
              onClick={() => setViewing(schoolClass)}
              selection={
                canManage ? (
                  <RowCheckbox
                    checked={selection.isSelected(schoolClass)}
                    onChange={() => selection.toggle(schoolClass)}
                    label={`Selecionar ${schoolClass.name}`}
                  />
                ) : undefined
              }
              leading={
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-700">
                  <School className="h-4 w-4" />
                </span>
              }
              title={schoolClass.name}
              subtitle={`${schoolClass.grade} · ${schoolClass.schoolYear}`}
              meta={
                <>
                  <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                    <Users className="h-3.5 w-3.5 text-ink-400" />
                    {studentCounts[schoolClass.id] ?? 0} aluno
                    {(studentCounts[schoolClass.id] ?? 0) === 1 ? "" : "s"}
                  </span>
                  <ClassShiftBadge shift={schoolClass.shift} />
                  <ClassStatusBadge status={schoolClass.status} />
                </>
              }
              actions={
                canManage ? (
                  <>
                    <button
                      type="button"
                      aria-label={`Editar ${schoolClass.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-card text-ink-400 active:bg-ink-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(schoolClass);
                        setShowForm(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        aria-label={`Excluir ${schoolClass.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-card text-ink-400 active:bg-danger/10 active:text-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(schoolClass);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </>
                ) : undefined
              }
            />
          ))}
          <div className="mt-1">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={changePageSize}
            />
          </div>
        </div>
      )}

      {!loading && !error && totalItems > 0 && !isMobile && (
        <Card className="overflow-hidden">
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
                          label="Selecionar todas as turmas desta página"
                        />
                      </th>
                    )}
                    <SortableTh label="Turma" active={sort.key === "name"} direction={sort.direction} onClick={() => toggleSort("name")} />
                    <SortableTh label="Série" active={sort.key === "grade"} direction={sort.direction} onClick={() => toggleSort("grade")} />
                    <SortableTh label="Ano letivo" active={sort.key === "schoolYear"} direction={sort.direction} onClick={() => toggleSort("schoolYear")} />
                    <SortableTh label="Turno" active={sort.key === "shift"} direction={sort.direction} onClick={() => toggleSort("shift")} />
                    <SortableTh label="Alunos" active={sort.key === "students"} direction={sort.direction} onClick={() => toggleSort("students")} />
                    <SortableTh label="Status" active={sort.key === "status"} direction={sort.direction} onClick={() => toggleSort("status")} />
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((schoolClass) => (
                    <tr key={schoolClass.id} className="border-b border-line last:border-0">
                      {canManage && (
                        <td className="px-4 py-3">
                          <RowCheckbox
                            checked={selection.isSelected(schoolClass)}
                            onChange={() => selection.toggle(schoolClass)}
                            label={`Selecionar ${schoolClass.name}`}
                          />
                        </td>
                      )}
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
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={changePageSize}
            />
        </Card>
      )}

      {canManage && (
        <MobileFab
          label="Nova turma"
          icon={<Plus className="h-6 w-6" />}
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        />
      )}

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

      {bulkDeleting && (
        <ConfirmDialog
          title="Excluir turmas selecionadas"
          description={`Tem certeza de que deseja excluir ${selection.count} turma${
            selection.count === 1 ? "" : "s"
          }? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onCancel={() => setBulkDeleting(false)}
          onConfirm={handleBulkDelete}
        />
      )}

      {bulkStatusChanging && (
        <ConfirmDialog
          title="Alterar status em lote"
          description={`O status de ${selection.count} turma${
            selection.count === 1 ? "" : "s"
          } será alterado para "${CLASS_STATUS_LABEL[bulkStatusValue]}".`}
          confirmLabel="Confirmar"
          onCancel={() => setBulkStatusChanging(false)}
          onConfirm={handleBulkStatusChange}
        />
      )}
    </div>
  );
}
