import { useEffect, useMemo, useState, Suspense, lazy } from "react";
import { Plus, Search, Eye, Pencil, Trash2, BookOpen, User, Layers, Clock, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TableSkeleton, CardGridSkeleton, MobileCardListSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DisciplineFormModal } from "@/components/disciplines/DisciplineFormModal";
import { DisciplineDetailModal } from "@/components/disciplines/DisciplineDetailModal";
import { DisciplineStatusBadge } from "@/components/disciplines/DisciplineStatusBadge";
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
  createDiscipline,
  deleteDiscipline,
  getDisciplines,
  updateDiscipline,
} from "@/services/disciplines/disciplineService";
import { getClasses, getStudentCountsByClassId } from "@/services/classes/classService";
import { getTeachers } from "@/services/users/userService";
import { createNotification } from "@/services/notifications/notificationService";
import {
  DISCIPLINE_STATUS_LABEL,
  type Discipline,
  type DisciplineInput,
  type DisciplineStatus,
} from "@/types/discipline";
import type { SchoolClass } from "@/types/schoolClass";
import type { UserProfile } from "@/types/user";
import { describeFirebaseError } from "@/utils/firebaseError";

const ALL = "all";
type SortKey = "name" | "teacher" | "classes" | "workload" | "status";

export function DisciplinesPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const isMobile = useIsMobile();
  const canManage = profile?.role === "admin" || profile?.role === "teacher";
  const canDelete = profile?.role === "admin";

  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [yearFilter, setYearFilter] = useState<string>(ALL);
  const [teacherFilter, setTeacherFilter] = useState<string>(ALL);
  const [classFilter, setClassFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [editing, setEditing] = useState<Discipline | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<Discipline | null>(null);
  const [deleting, setDeleting] = useState<Discipline | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<DisciplineStatus>("active");
  const [bulkStatusChanging, setBulkStatusChanging] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [disciplinesData, classesData, counts, teachersData] = await Promise.all([
        getDisciplines(),
        getClasses(),
        getStudentCountsByClassId(),
        getTeachers(),
      ]);
      setDisciplines(disciplinesData);
      setClasses(classesData);
      setStudentCounts(counts);
      setTeachers(teachersData);
    } catch (error) {
      setError(describeFirebaseError(error, "disciplinas:listar"));
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

  const activeFilterCount = [
    search.trim() !== "",
    yearFilter !== ALL,
    teacherFilter !== ALL,
    classFilter !== ALL,
    statusFilter !== ALL,
  ].filter(Boolean).length;

  function clearFilters() {
    setSearchInput("");
    setYearFilter(ALL);
    setTeacherFilter(ALL);
    setClassFilter(ALL);
    setStatusFilter(ALL);
  }

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

  const { sort, toggleSort, sorted } = useSort<Discipline, SortKey>(filtered, (d, key) => {
    switch (key) {
      case "name":
        return d.name;
      case "teacher":
        return d.teacherName;
      case "classes":
        return d.classIds.length;
      case "workload":
        return d.workload;
      case "status":
        return DISCIPLINE_STATUS_LABEL[d.status];
      default:
        return null;
    }
  });

  const { page, pageSize, totalPages, totalItems, pageItems, setPage, changePageSize, resetPage } =
    usePagination(sorted, 10);

  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, yearFilter, teacherFilter, classFilter, statusFilter]);

  const selection = useRowSelection<Discipline>((d) => d.id);
  const pageSelectionState = selection.visibleSelectionState(pageItems);

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
    const previousTeacherId = editing?.teacherId ?? null;
    if (editing) {
      await updateDiscipline(editing.id, data);
      toast.success(`${data.name} foi atualizada com sucesso.`);
    } else {
      await createDiscipline(data);
      toast.success(`${data.name} foi cadastrada com sucesso.`);
    }

    // Fase 5 — notifica o professor quando ele é vinculado (ou trocado)
    // como responsável pela disciplina. Só dispara se o vínculo
    // realmente mudou, para não notificar em toda edição (ex.: só
    // mudar a carga horária) — mesmo cuidado de "só loga quando o
    // campo relevante muda" já usado em `updateTeacherProfile`.
    if (data.teacherId && data.teacherId !== previousTeacherId) {
      createNotification({
        recipientUid: data.teacherId,
        type: "discipline_assigned",
        title: "Você foi vinculado a uma disciplina",
        message: `Você agora é o(a) professor(a) responsável por ${data.name}.`,
        link: "/disciplinas",
      });
    }

    await loadData();
  }

  async function handleDelete() {
    if (!deleting || !profile) return;
    const label = `${deleting.name} (${deleting.code})`;
    await deleteDiscipline(deleting.id, { id: profile.uid, name: profile.name });
    setDeleting(null);
    await loadData();
    toast.success(`${label} foi excluída.`);
  }

  async function handleBulkDelete() {
    if (!profile) return;
    const ids = Array.from(selection.selectedIds);
    await Promise.all(ids.map((id) => deleteDiscipline(id, { id: profile.uid, name: profile.name })));
    setBulkDeleting(false);
    selection.clear();
    await loadData();
    toast.success(`${ids.length} disciplina${ids.length === 1 ? "" : "s"} excluída${ids.length === 1 ? "" : "s"}.`);
  }

  async function handleBulkStatusChange() {
    const targets = disciplines.filter((d) => selection.selectedIds.has(d.id));
    await Promise.all(
      targets.map((d) =>
        updateDiscipline(d.id, {
          name: d.name,
          code: d.code,
          workload: d.workload,
          schoolYear: d.schoolYear,
          status: bulkStatusValue,
          teacherId: d.teacherId,
          teacherName: d.teacherName,
          classIds: d.classIds,
        })
      )
    );
    setBulkStatusChanging(false);
    selection.clear();
    await loadData();
    toast.success(
      `Status de ${targets.length} disciplina${targets.length === 1 ? "" : "s"} atualizado para "${DISCIPLINE_STATUS_LABEL[bulkStatusValue]}".`
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="hidden font-display text-xl font-semibold text-ink900 md:block">Disciplinas</h2>
          <p className="text-sm text-ink-500">
            Gerencie as disciplinas e suas relações com turmas e professores
          </p>
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
            Nova disciplina
          </Button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading && disciplines.length === 0 ? (
          <CardGridSkeleton count={4} />
        ) : (
          <>
            <StatCard icon={BookOpen} label="Disciplinas" sublabel="Total cadastradas" value={stats.total} />
            <StatCard icon={BookOpen} label="Ativas" sublabel="Em funcionamento" value={stats.active} />
            <StatCard icon={Layers} label="Turmas" sublabel="Turmas vinculadas" value={stats.classes} />
            <StatCard icon={User} label="Professores" sublabel="Responsáveis" value={stats.teachers} />
          </>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Card className="flex flex-1 items-center gap-2 px-3.5 py-2.5">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            className="w-full bg-transparent text-sm text-ink900 outline-none placeholder:text-ink-300"
            placeholder="Buscar disciplina, professor ou turma..."
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
            <Select label="Professor" value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)}>
              <option value={ALL}>Todos os professores</option>
              {teacherOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
            <Select label="Turma" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              <option value={ALL}>Todas as turmas</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </Select>
            <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value={ALL}>Todos os status</option>
              {Object.entries(DISCIPLINE_STATUS_LABEL).map(([value, label]) => (
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
              onChange={(e) => setBulkStatusValue(e.target.value as DisciplineStatus)}
              className="!w-auto"
            >
              {Object.entries(DISCIPLINE_STATUS_LABEL).map(([value, label]) => (
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
            isMobile ? <MobileCardListSkeleton /> : <TableSkeleton columns={6} />
          ) : error ? (
            <ErrorState message={error} onRetry={loadData} />
          ) : disciplines.length === 0 ? (
            <EmptyState
              bare
              icon={BookOpen}
              title="Nenhuma disciplina cadastrada ainda"
              description="Cadastre a primeira disciplina e vincule-a a turmas e a um professor responsável."
              action={
                canManage
                  ? {
                      label: "Cadastrar disciplina",
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
              title="Nenhuma disciplina encontrada"
              description="Não encontramos disciplinas para os filtros selecionados. Tente ajustá-los ou limpar a busca."
            />
          )}
        </Card>
      )}

      {!loading && !error && totalItems > 0 && isMobile && (
        <div className="flex flex-col gap-2.5">
          {pageItems.map((discipline) => (
            <MobileDataCard
              key={discipline.id}
              onClick={() => setViewing(discipline)}
              selection={
                canManage ? (
                  <RowCheckbox
                    checked={selection.isSelected(discipline)}
                    onChange={() => selection.toggle(discipline)}
                    label={`Selecionar ${discipline.name}`}
                  />
                ) : undefined
              }
              leading={
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-700">
                  <BookOpen className="h-4 w-4" />
                </span>
              }
              title={discipline.name}
              subtitle={discipline.code}
              meta={
                <>
                  <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                    <User className="h-3.5 w-3.5 text-ink-400" />
                    {discipline.teacherName || "—"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                    <Layers className="h-3.5 w-3.5 text-ink-400" />
                    {discipline.classIds.length} turma{discipline.classIds.length === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                    <Clock className="h-3.5 w-3.5 text-ink-400" />
                    {discipline.workload}h
                  </span>
                  <DisciplineStatusBadge status={discipline.status} />
                </>
              }
              actions={
                canManage ? (
                  <>
                    <button
                      type="button"
                      aria-label={`Editar ${discipline.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-card text-ink-400 active:bg-ink-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(discipline);
                        setShowForm(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        aria-label={`Excluir ${discipline.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-card text-ink-400 active:bg-danger/10 active:text-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(discipline);
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
                        label="Selecionar todas as disciplinas desta página"
                      />
                    </th>
                  )}
                  <SortableTh label="Disciplina" active={sort.key === "name"} direction={sort.direction} onClick={() => toggleSort("name")} />
                  <SortableTh label="Professor" active={sort.key === "teacher"} direction={sort.direction} onClick={() => toggleSort("teacher")} />
                  <SortableTh label="Turmas" active={sort.key === "classes"} direction={sort.direction} onClick={() => toggleSort("classes")} />
                  <SortableTh label="Carga horária" active={sort.key === "workload"} direction={sort.direction} onClick={() => toggleSort("workload")} />
                  <SortableTh label="Status" active={sort.key === "status"} direction={sort.direction} onClick={() => toggleSort("status")} />
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((discipline) => (
                  <tr key={discipline.id} className="border-b border-line last:border-0">
                    {canManage && (
                      <td className="px-4 py-3">
                        <RowCheckbox
                          checked={selection.isSelected(discipline)}
                          onChange={() => selection.toggle(discipline)}
                          label={`Selecionar ${discipline.name}`}
                        />
                      </td>
                    )}
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
          label="Nova disciplina"
          icon={<Plus className="h-6 w-6" />}
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        />
      )}

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

      {bulkDeleting && (
        <ConfirmDialog
          title="Excluir disciplinas selecionadas"
          description={`Tem certeza de que deseja excluir ${selection.count} disciplina${
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
          description={`O status de ${selection.count} disciplina${
            selection.count === 1 ? "" : "s"
          } será alterado para "${DISCIPLINE_STATUS_LABEL[bulkStatusValue]}".`}
          confirmLabel="Confirmar"
          onCancel={() => setBulkStatusChanging(false)}
          onConfirm={handleBulkStatusChange}
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
