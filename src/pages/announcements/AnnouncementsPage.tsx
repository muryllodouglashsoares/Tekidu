import { useEffect, useMemo, useState, Suspense, lazy } from "react";
import { Megaphone, Plus, Search, Sparkles, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/layout/EmptyState";
import { ErrorState } from "@/components/layout/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { FilterSummary } from "@/components/table/FilterSummary";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { MobileFab } from "@/components/mobile/MobileFab";

const MobileSheet = lazy(() =>
  import("@/components/mobile/MobileSheet").then((m) => ({ default: m.MobileSheet }))
);
import { AnnouncementCard, type AnnouncementCardAction } from "@/components/announcements/AnnouncementCard";
import { AnnouncementDetailModal } from "@/components/announcements/AnnouncementDetailModal";
import { AnnouncementFormModal } from "@/components/announcements/AnnouncementFormModal";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementsForRole,
  isAnnouncementExpired,
  publishAnnouncement,
  sortAnnouncements,
  toggleAnnouncementPinned,
  unpublishAnnouncement,
  updateAnnouncement,
} from "@/services/announcements/announcementService";
import { logAuditEvent } from "@/services/audit/auditService";
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  ANNOUNCEMENT_PRIORITY_LABELS,
  type Announcement,
  type AnnouncementCategory,
  type AnnouncementInput,
  type AnnouncementPriority,
} from "@/types/announcement";
import { describeFirebaseError } from "@/utils/firebaseError";

const ALL = "all";

type AdminTab = "all" | "published" | "drafts" | "expired";
type TeacherTab = "all" | "mine" | "drafts";

export function AnnouncementsPage() {
  const { profile } = useAuth();
  const toast = useToast();

  const canManage = profile?.role === "admin" || profile?.role === "teacher";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<string>(ALL);
  const [adminTab, setAdminTab] = useState<AdminTab>("all");
  const [teacherTab, setTeacherTab] = useState<TeacherTab>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [viewing, setViewing] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);

  async function loadData() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAnnouncementsForRole(profile);
      setAnnouncements(data);
    } catch (err) {
      setError(describeFirebaseError(err, "avisos:listar"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid]);

  function canEdit(announcement: Announcement): boolean {
    if (!profile) return false;
    if (profile.role === "admin") return true;
    return profile.role === "teacher" && announcement.createdBy === profile.uid;
  }

  // -------------------------------------------------------------
  // Escopo por aba (seções 43/44): dentro do que a Rule já libera
  // (`getAnnouncementsForRole`), as abas apenas RECORTAM a mesma
  // lista já carregada — nenhuma consulta adicional ao Firestore.
  // -------------------------------------------------------------
  const scoped = useMemo(() => {
    if (!profile) return [];
    if (profile.role === "admin") {
      switch (adminTab) {
        case "published":
          return announcements.filter((a) => a.published && !isAnnouncementExpired(a));
        case "drafts":
          return announcements.filter((a) => !a.published);
        case "expired":
          return announcements.filter((a) => a.published && isAnnouncementExpired(a));
        default:
          return announcements;
      }
    }
    if (profile.role === "teacher") {
      switch (teacherTab) {
        case "mine":
          return announcements.filter((a) => a.createdBy === profile.uid);
        case "drafts":
          return announcements.filter((a) => a.createdBy === profile.uid && !a.published);
        default:
          return announcements.filter((a) => a.published && !isAnnouncementExpired(a));
      }
    }
    // student: já vem só com publicados/audience corretos da query
    return announcements.filter((a) => !isAnnouncementExpired(a));
  }, [announcements, profile, adminTab, teacherTab]);

  const categoryOptions = Object.keys(ANNOUNCEMENT_CATEGORY_LABELS) as AnnouncementCategory[];
  const priorityOptions = Object.keys(ANNOUNCEMENT_PRIORITY_LABELS) as AnnouncementPriority[];

  const activeFilterCount = [search.trim() !== "", categoryFilter !== ALL, priorityFilter !== ALL].filter(
    Boolean
  ).length;

  function clearFilters() {
    setSearchInput("");
    setCategoryFilter(ALL);
    setPriorityFilter(ALL);
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return scoped.filter((a) => {
      if (term) {
        const haystack = `${a.title} ${a.content}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (categoryFilter !== ALL && a.category !== categoryFilter) return false;
      if (priorityFilter !== ALL && a.priority !== priorityFilter) return false;
      return true;
    });
  }, [scoped, search, categoryFilter, priorityFilter]);

  const sorted = useMemo(() => sortAnnouncements(filtered), [filtered]);

  // Destaque (seção 26): só entre os avisos publicados e ativos, nunca
  // rascunhos/expirados — mesmo em uma aba de gestão do admin, o
  // destaque continua representando "o que está no ar agora".
  const highlighted = useMemo(() => {
    const eligible = sortAnnouncements(
      announcements.filter((a) => a.published && !isAnnouncementExpired(a) && (a.pinned || a.priority !== "normal"))
    );
    return eligible.slice(0, 3);
  }, [announcements]);

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  async function handleSubmit(data: AnnouncementInput, publish: boolean) {
    if (!profile) return;
    if (editing) {
      await updateAnnouncement(editing.id, data, profile.role as "admin" | "teacher");
      if (publish && !editing.published) await publishAnnouncement(editing.id);
      if (!publish && editing.published) await unpublishAnnouncement(editing.id);
      toast.success(publish ? "Aviso atualizado." : "Rascunho salvo.");
    } else {
      await createAnnouncement(
        { uid: profile.uid, name: profile.name, role: profile.role as "admin" | "teacher" },
        data,
        publish
      );
      toast.success(publish ? "Aviso publicado." : "Rascunho salvo.");
    }
    await loadData();
  }

  async function handleDelete() {
    if (!deleting || !profile) return;
    const title = deleting.title;
    await deleteAnnouncement(deleting.id);
    logAuditEvent({
      type: "announcement_deleted",
      actorId: profile.uid,
      actorName: profile.name,
      before: title,
    });
    setDeleting(null);
    await loadData();
    toast.success(`"${title}" foi excluído.`);
  }

  async function handleTogglePublish(announcement: Announcement) {
    if (announcement.published) {
      await unpublishAnnouncement(announcement.id);
      toast.success("Aviso despublicado.");
    } else {
      await publishAnnouncement(announcement.id);
      toast.success("Aviso publicado.");
    }
    await loadData();
  }

  async function handleTogglePin(announcement: Announcement) {
    await toggleAnnouncementPinned(announcement.id, !announcement.pinned);
    toast.success(announcement.pinned ? "Aviso desafixado." : "Aviso fixado.");
    await loadData();
  }

  function actionsFor(announcement: Announcement): AnnouncementCardAction[] | undefined {
    if (!profile || !canEdit(announcement)) return undefined;
    const actions: AnnouncementCardAction[] = [
      {
        label: "Editar",
        onClick: () => {
          setEditing(announcement);
          setShowForm(true);
        },
      },
      {
        label: announcement.published ? "Despublicar" : "Publicar",
        onClick: () => handleTogglePublish(announcement),
      },
    ];
    if (profile.role === "admin") {
      actions.push({
        label: announcement.pinned ? "Desafixar" : "Fixar",
        onClick: () => handleTogglePin(announcement),
      });
    }
    actions.push({
      label: "Excluir",
      destructive: true,
      onClick: () => setDeleting(announcement),
    });
    return actions;
  }

  if (!profile) return null;

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="hidden font-display text-xl font-semibold text-ink900 md:block">Avisos</h2>
          <p className="text-sm text-ink-500">
            Fique por dentro das informações importantes da comunidade acadêmica.
          </p>
        </div>
        {canManage && (
          <Button className="hidden md:inline-flex" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo aviso
          </Button>
        )}
      </div>

      {loading && announcements.length === 0 ? (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        highlighted.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ink-400" aria-hidden="true" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
                Avisos em destaque
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {highlighted.map((a) => (
                <AnnouncementCard key={a.id} announcement={a} onOpen={() => setViewing(a)} />
              ))}
            </div>
          </div>
        )
      )}

      {profile.role === "admin" && (
        <Tabs
          value={adminTab}
          onChange={setAdminTab}
          options={[
            { value: "all", label: "Todos" },
            { value: "published", label: "Publicados" },
            { value: "drafts", label: "Rascunhos" },
            { value: "expired", label: "Expirados" },
          ]}
        />
      )}
      {profile.role === "teacher" && (
        <Tabs
          value={teacherTab}
          onChange={setTeacherTab}
          options={[
            { value: "all", label: "Todos os avisos" },
            { value: "mine", label: "Meus avisos" },
            { value: "drafts", label: "Meus rascunhos" },
          ]}
        />
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Card className="flex flex-1 items-center gap-2 px-3.5 py-2.5">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            className="w-full bg-transparent text-sm text-ink900 outline-none placeholder:text-ink-300"
            placeholder="Buscar por título ou conteúdo..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </Card>

        <div className="hidden flex-wrap items-center gap-3 lg:flex lg:shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Filtrar por categoria"
              hideLabel
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value={ALL}>Categoria</option>
              {categoryOptions.map((value) => (
                <option key={value} value={value}>
                  {ANNOUNCEMENT_CATEGORY_LABELS[value]}
                </option>
              ))}
            </Select>
            <Select
              label="Filtrar por prioridade"
              hideLabel
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value={ALL}>Prioridade</option>
              {priorityOptions.map((value) => (
                <option key={value} value={value}>
                  {ANNOUNCEMENT_PRIORITY_LABELS[value]}
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
            <Select label="Categoria" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value={ALL}>Todas as categorias</option>
              {categoryOptions.map((value) => (
                <option key={value} value={value}>
                  {ANNOUNCEMENT_CATEGORY_LABELS[value]}
                </option>
              ))}
            </Select>
            <Select label="Prioridade" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value={ALL}>Todas as prioridades</option>
              {priorityOptions.map((value) => (
                <option key={value} value={value}>
                  {ANNOUNCEMENT_PRIORITY_LABELS[value]}
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

      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Todos os avisos</h3>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={loadData} />
        </Card>
      ) : sorted.length === 0 ? (
        announcements.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="Nenhum aviso no momento"
            description="Quando houver novas informações importantes, elas aparecerão aqui."
            action={canManage ? { label: "Criar aviso", onClick: openCreate } : undefined}
          />
        ) : (
          <EmptyState
            icon={Search}
            title="Nenhum aviso encontrado"
            description="Não encontramos avisos para os filtros selecionados. Tente ajustá-los ou limpar a busca."
          />
        )
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              onOpen={() => setViewing(a)}
              actions={actionsFor(a)}
            />
          ))}
        </div>
      )}

      {canManage && (
        <MobileFab label="Novo aviso" icon={<Plus className="h-6 w-6" />} onClick={openCreate} />
      )}

      {showForm && (
        <AnnouncementFormModal
          announcement={editing}
          authorRole={profile.role as "admin" | "teacher"}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}

      {viewing && (
        <AnnouncementDetailModal
          announcement={viewing}
          canEdit={canEdit(viewing)}
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
          title="Excluir aviso"
          description={`O aviso "${deleting.title}" será removido permanentemente. Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto border-b border-line pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            value === option.value
              ? "bg-ink-100 text-ink-700"
              : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
