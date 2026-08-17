import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Power } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TeacherFormModal } from "@/components/teachers/TeacherFormModal";
import { TeacherStatusBadge } from "@/components/teachers/TeacherStatusBadge";
import { createTeacher, getAllTeachers, updateTeacherProfile } from "@/services/users/userService";
import type { UserProfile } from "@/types/user";
import { describeFirebaseError } from "@/utils/firebaseError";

export function TeachersPage() {
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [togglingActive, setTogglingActive] = useState<UserProfile | null>(null);

  async function loadTeachers() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllTeachers();
      setTeachers(data);
    } catch (error) {
      setError(describeFirebaseError(error, "professores:listar"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeachers();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return teachers;
    return teachers.filter(
      (t) => t.name.toLowerCase().includes(term) || t.email.toLowerCase().includes(term)
    );
  }, [teachers, search]);

  async function handleCreate(data: { name: string; email: string; password: string }) {
    await createTeacher(data);
    await loadTeachers();
  }

  async function handleUpdate(data: { name: string; active: boolean }) {
    if (!editing) return;
    await updateTeacherProfile(editing.uid, data);
    await loadTeachers();
  }

  async function handleToggleActive() {
    if (!togglingActive) return;
    await updateTeacherProfile(togglingActive.uid, {
      name: togglingActive.name,
      active: !togglingActive.active,
    });
    setTogglingActive(null);
    await loadTeachers();
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

      <Card className="mb-4 flex items-center gap-2 px-3.5 py-2.5">
        <Search className="h-4 w-4 text-ink-400" />
        <input
          className="w-full bg-transparent text-sm text-ink900 outline-none placeholder:text-ink-300"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner label="Carregando professores..." />
        ) : error ? (
          <div className="p-8 text-center">
            <p className="mb-3 text-sm text-danger">{error}</p>
            <Button variant="secondary" onClick={loadTeachers}>
              Tentar novamente
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500">
            {teachers.length === 0 ? (
              <div className="flex flex-col items-center gap-3">
                <p>Nenhum professor cadastrado ainda.</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(null);
                    setShowForm(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar professor
                </Button>
              </div>
            ) : (
              "Nenhum professor encontrado para essa busca."
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 font-medium">Professor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((teacher) => (
                  <tr key={teacher.uid} className="border-b border-line last:border-0">
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
    </div>
  );
}
