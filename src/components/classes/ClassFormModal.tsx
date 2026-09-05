import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  CLASS_GRADE_OPTIONS,
  CLASS_SHIFT_LABEL,
  CLASS_STATUS_LABEL,
  type ClassInput,
  type SchoolClass,
} from "@/types/schoolClass";

interface ClassFormModalProps {
  /** Quando informado, o formulário edita esta turma; caso contrário, cria uma nova. */
  schoolClass?: SchoolClass | null;
  onClose: () => void;
  onSubmit: (data: ClassInput) => Promise<void>;
}

function defaultForm(): ClassInput {
  return {
    name: "",
    grade: CLASS_GRADE_OPTIONS[0],
    schoolYear: new Date().getFullYear(),
    shift: "manha",
    status: "active",
  };
}

export function ClassFormModal({ schoolClass, onClose, onSubmit }: ClassFormModalProps) {
  const [form, setForm] = useState<ClassInput>(
    schoolClass
      ? {
          name: schoolClass.name,
          grade: schoolClass.grade,
          schoolYear: schoolClass.schoolYear,
          shift: schoolClass.shift,
          status: schoolClass.status,
        }
      : defaultForm()
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof ClassInput>(key: K, value: ClassInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Informe o nome da turma.");
      return;
    }
    if (!form.grade.trim()) {
      setError("Selecione a série.");
      return;
    }
    if (!form.schoolYear || form.schoolYear < 2000 || form.schoolYear > 2100) {
      setError("Informe um ano letivo válido.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } catch {
      setError("Não foi possível salvar a turma. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={schoolClass ? "Editar turma" : "Nova turma"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Nome da turma"
          required
          placeholder="Ex.: 1º Informática A"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Série"
            value={form.grade}
            onChange={(e) => update("grade", e.target.value)}
          >
            {CLASS_GRADE_OPTIONS.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </Select>
          <Input
            label="Ano letivo"
            type="number"
            required
            min={2000}
            max={2100}
            value={form.schoolYear}
            onChange={(e) => update("schoolYear", Number(e.target.value))}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Turno"
            value={form.shift}
            onChange={(e) => update("shift", e.target.value as ClassInput["shift"])}
          >
            {Object.entries(CLASS_SHIFT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => update("status", e.target.value as ClassInput["status"])}
          >
            {Object.entries(CLASS_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {schoolClass ? "Salvar alterações" : "Cadastrar turma"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
