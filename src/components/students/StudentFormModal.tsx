import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { STUDENT_STATUS_LABEL, type Student, type StudentInput } from "@/types/student";

interface StudentFormModalProps {
  /** Quando informado, o formulário edita este aluno; caso contrário, cria um novo. */
  student?: Student | null;
  onClose: () => void;
  onSubmit: (data: StudentInput) => Promise<void>;
}

const emptyForm: StudentInput = {
  name: "",
  email: "",
  registrationNumber: "",
  turma: "",
  status: "active",
  average: null,
};

export function StudentFormModal({ student, onClose, onSubmit }: StudentFormModalProps) {
  const [form, setForm] = useState<StudentInput>(
    student
      ? {
          name: student.name,
          email: student.email,
          registrationNumber: student.registrationNumber,
          turma: student.turma,
          status: student.status,
          average: student.average,
        }
      : emptyForm
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof StudentInput>(key: K, value: StudentInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.email.trim() || !form.registrationNumber.trim()) {
      setError("Preencha nome, e-mail e matrícula.");
      return;
    }
    if (form.average !== null && (form.average < 0 || form.average > 10)) {
      setError("A média deve estar entre 0 e 10.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } catch {
      setError("Não foi possível salvar o aluno. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={student ? "Editar aluno" : "Novo aluno"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Nome completo"
          required
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />
        <Input
          label="E-mail"
          type="email"
          required
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Matrícula"
            required
            value={form.registrationNumber}
            onChange={(e) => update("registrationNumber", e.target.value)}
          />
          <Input
            label="Turma"
            placeholder="Ex.: 9º Ano B"
            value={form.turma}
            onChange={(e) => update("turma", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Situação"
            value={form.status}
            onChange={(e) => update("status", e.target.value as StudentInput["status"])}
          >
            {Object.entries(STUDENT_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input
            label="Média (0–10)"
            type="number"
            min={0}
            max={10}
            step={0.1}
            value={form.average ?? ""}
            onChange={(e) =>
              update("average", e.target.value === "" ? null : Number(e.target.value))
            }
          />
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
            {student ? "Salvar alterações" : "Cadastrar aluno"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
