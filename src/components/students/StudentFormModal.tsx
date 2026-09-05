import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { STUDENT_STATUS_LABEL, type Student, type StudentInput } from "@/types/student";
import type { StudentCreateInput } from "@/services/students/studentService";
import { CLASS_SHIFT_LABEL, type SchoolClass } from "@/types/schoolClass";

interface StudentFormModalProps {
  /** Quando informado, o formulário edita este aluno; caso contrário, cria um novo. */
  student?: Student | null;
  /** Turmas cadastradas, para o seletor de turma (substitui o texto livre). */
  classes: SchoolClass[];
  onClose: () => void;
  onSubmitCreate: (data: StudentCreateInput) => Promise<void>;
  onSubmitUpdate: (data: StudentInput) => Promise<void>;
}

const emptyForm: StudentInput = {
  name: "",
  email: "",
  registrationNumber: "",
  classId: null,
  status: "active",
  average: null,
};

export function StudentFormModal({
  student,
  classes,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}: StudentFormModalProps) {
  const [form, setForm] = useState<StudentInput>(
    student
      ? {
          name: student.name,
          email: student.email,
          registrationNumber: student.registrationNumber,
          classId: student.classId,
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
      if (student) {
        await onSubmitUpdate(form);
      } else {
        await onSubmitCreate(form);
      }
      onClose();
    } catch (err) {
      setError(
        student
          ? "Não foi possível salvar as alterações. Tente novamente."
          : err instanceof Error
            ? err.message
            : "Não foi possível cadastrar o aluno. Verifique o e-mail e tente novamente."
      );
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
          disabled={!!student}
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
        {student && (
          <p className="-mt-2.5 text-xs text-ink-400">
            O e-mail de acesso não pode ser alterado por aqui.
          </p>
        )}

        {!student && (
          <p className="-mt-2.5 rounded-card bg-ink-50 px-3 py-2.5 text-xs text-ink-500">
            Uma senha temporária será gerada automaticamente e enviada
            para este e-mail. No primeiro acesso, o aluno usará a
            matrícula abaixo + essa senha, e será solicitado a definir
            sua própria senha.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Matrícula"
            required
            value={form.registrationNumber}
            onChange={(e) => update("registrationNumber", e.target.value)}
          />
          <Select
            label="Turma"
            value={form.classId ?? ""}
            onChange={(e) => update("classId", e.target.value === "" ? null : e.target.value)}
            disabled={classes.length === 0}
          >
            <option value="">
              {classes.length === 0 ? "Nenhuma turma cadastrada" : "Sem turma"}
            </option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name} · {CLASS_SHIFT_LABEL[schoolClass.shift]}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
