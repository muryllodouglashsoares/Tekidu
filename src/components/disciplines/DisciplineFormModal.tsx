import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ClassMultiSelect } from "@/components/disciplines/ClassMultiSelect";
import { DISCIPLINE_STATUS_LABEL, type Discipline, type DisciplineInput } from "@/types/discipline";
import type { SchoolClass } from "@/types/schoolClass";
import type { UserProfile } from "@/types/user";

interface DisciplineFormModalProps {
  /** Quando informado, o formulário edita esta disciplina; caso contrário, cria uma nova. */
  discipline?: Discipline | null;
  classes: SchoolClass[];
  studentCounts: Record<string, number>;
  teachers: UserProfile[];
  onClose: () => void;
  onSubmit: (data: DisciplineInput) => Promise<void>;
}

function defaultForm(): DisciplineInput {
  return {
    name: "",
    code: "",
    workload: 0,
    schoolYear: new Date().getFullYear(),
    status: "active",
    teacherId: null,
    teacherName: "",
    classIds: [],
  };
}

export function DisciplineFormModal({
  discipline,
  classes,
  studentCounts,
  teachers,
  onClose,
  onSubmit,
}: DisciplineFormModalProps) {
  const [form, setForm] = useState<DisciplineInput>(
    discipline
      ? {
          name: discipline.name,
          code: discipline.code,
          workload: discipline.workload,
          schoolYear: discipline.schoolYear,
          status: discipline.status,
          teacherId: discipline.teacherId,
          teacherName: discipline.teacherName,
          classIds: discipline.classIds,
        }
      : defaultForm()
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof DisciplineInput>(key: K, value: DisciplineInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleTeacherChange(uid: string) {
    if (!uid) {
      update("teacherId", null);
      update("teacherName", "");
      return;
    }
    const teacher = teachers.find((t) => t.uid === uid);
    update("teacherId", uid);
    update("teacherName", teacher?.name ?? "");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Informe o nome da disciplina.");
      return;
    }
    if (!form.code.trim()) {
      setError("Informe o código da disciplina.");
      return;
    }
    if (!form.workload || form.workload <= 0) {
      setError("Informe uma carga horária maior que zero.");
      return;
    }
    if (!form.schoolYear || form.schoolYear < 2000 || form.schoolYear > 2100) {
      setError("Informe um ano letivo válido.");
      return;
    }
    if (!form.teacherId) {
      setError("Selecione o professor responsável.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } catch {
      setError("Não foi possível salvar a disciplina. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={discipline ? "Editar disciplina" : "Nova disciplina"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Informações básicas
          </p>

          <Input
            label="Nome da disciplina"
            required
            placeholder="Ex.: Programação"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Código"
              required
              placeholder="Ex.: TEC-PROG-01"
              value={form.code}
              onChange={(e) => update("code", e.target.value)}
            />
            <Input
              label="Carga horária (h)"
              type="number"
              required
              min={1}
              placeholder="Ex.: 120"
              value={form.workload || ""}
              onChange={(e) => update("workload", Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Ano letivo"
              type="number"
              required
              min={2000}
              max={2100}
              value={form.schoolYear}
              onChange={(e) => update("schoolYear", Number(e.target.value))}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => update("status", e.target.value as DisciplineInput["status"])}
            >
              {Object.entries(DISCIPLINE_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-line pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Responsável
          </p>
          <Select
            label="Professor responsável"
            required
            value={form.teacherId ?? ""}
            onChange={(e) => handleTeacherChange(e.target.value)}
          >
            <option value="">Selecionar professor</option>
            {teachers.map((teacher) => (
              <option key={teacher.uid} value={teacher.uid}>
                {teacher.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Turmas</p>
          <ClassMultiSelect
            classes={classes}
            studentCounts={studentCounts}
            selectedIds={form.classIds}
            onChange={(ids) => update("classIds", ids)}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-1 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {discipline ? "Salvar alterações" : "Cadastrar disciplina"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
