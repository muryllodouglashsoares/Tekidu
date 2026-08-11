import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StudentFormModal } from "@/components/students/StudentFormModal";
import { StudentStatusBadge } from "@/components/students/StudentStatusBadge";
import {
  createStudent,
  deleteStudent,
  getStudents,
  updateStudent,
} from "@/services/students/studentService";
import type { Student, StudentInput } from "@/types/student";

export function StudentsPage() {
  const { profile } = useAuth();
  const canManage = profile?.role === "admin" || profile?.role === "teacher";

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<Student | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<Student | null>(null);

  async function loadStudents() {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudents();
      setStudents(data);
    } catch {
      setError("Não foi possível carregar os alunos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.registrationNumber.toLowerCase().includes(term) ||
        s.turma.toLowerCase().includes(term)
    );
  }, [students, search]);

  async function handleCreateOrUpdate(data: StudentInput) {
    if (editing) {
      await updateStudent(editing.id, data);
    } else {
      await createStudent(data);
    }
    await loadStudents();
  }

  async function handleDelete() {
    if (!deleting) return;
    await deleteStudent(deleting.id);
    setDeleting(null);
    await loadStudents();
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

      <Card className="mb-4 flex items-center gap-2 px-3.5 py-2.5">
        <Search className="h-4 w-4 text-ink-400" />
        <input
          className="w-full bg-transparent text-sm text-ink900 outline-none placeholder:text-ink-300"
          placeholder="Buscar por nome, e-mail, matrícula ou turma..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner label="Carregando alunos..." />
        ) : error ? (
          <div className="p-8 text-center">
            <p className="mb-3 text-sm text-danger">{error}</p>
            <Button variant="secondary" onClick={loadStudents}>
              Tentar novamente
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500">
            {students.length === 0
              ? "Nenhum aluno cadastrado ainda."
              : "Nenhum aluno encontrado para essa busca."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 font-medium">Aluno</th>
                  <th className="px-4 py-3 font-medium">Matrícula</th>
                  <th className="px-4 py-3 font-medium">Turma</th>
                  <th className="px-4 py-3 font-medium">Média</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                  {canManage && <th className="px-4 py-3 font-medium" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
                  <tr key={student.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                          {initials(student.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink900">{student.name}</p>
                          <p className="truncate text-xs text-ink-400">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular text-ink-600">
                      {student.registrationNumber}
                    </td>
                    <td className="px-4 py-3 text-ink-600">{student.turma || "—"}</td>
                    <td className="px-4 py-3 tabular text-ink-600">
                      {student.average !== null ? student.average.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StudentStatusBadge status={student.status} />
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
        )}
      </Card>

      {showForm && (
        <StudentFormModal
          student={editing}
          onClose={() => setShowForm(false)}
          onSubmit={handleCreateOrUpdate}
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
    </div>
  );
}
