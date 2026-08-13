import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { UserProfile } from "@/types/user";

interface TeacherFormModalProps {
  /** Quando informado, o formulário edita este professor; caso contrário, cria um novo. */
  teacher?: UserProfile | null;
  onClose: () => void;
  onSubmitCreate: (data: { name: string; email: string; password: string }) => Promise<void>;
  onSubmitUpdate: (data: { name: string; active: boolean }) => Promise<void>;
}

export function TeacherFormModal({
  teacher,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}: TeacherFormModalProps) {
  const [name, setName] = useState(teacher?.name ?? "");
  const [email, setEmail] = useState(teacher?.email ?? "");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(teacher?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Informe o nome do professor.");
      return;
    }

    setSaving(true);
    try {
      if (teacher) {
        await onSubmitUpdate({ name: name.trim(), active });
      } else {
        if (!email.trim()) {
          setError("Informe o e-mail do professor.");
          setSaving(false);
          return;
        }
        if (password.length < 6) {
          setError("A senha provisória deve ter pelo menos 6 caracteres.");
          setSaving(false);
          return;
        }
        await onSubmitCreate({ name: name.trim(), email: email.trim(), password });
      }
      onClose();
    } catch {
      setError(
        teacher
          ? "Não foi possível salvar as alterações. Tente novamente."
          : "Não foi possível cadastrar o professor. Verifique o e-mail e tente novamente."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={teacher ? "Editar professor" : "Novo professor"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Nome completo"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Input
          label="E-mail"
          type="email"
          required
          disabled={!!teacher}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {teacher && (
          <p className="-mt-2.5 text-xs text-ink-400">
            O e-mail de acesso não pode ser alterado por aqui.
          </p>
        )}

        {!teacher && (
          <>
            <Input
              label="Senha provisória"
              type="text"
              required
              minLength={6}
              placeholder="Mínimo de 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="-mt-2.5 text-xs text-ink-400">
              Compartilhe essa senha com o professor. Ele poderá trocá-la depois pela
              opção "Esqueci minha senha" na tela de login.
            </p>
          </>
        )}

        {teacher && (
          <Select
            label="Status"
            value={active ? "active" : "inactive"}
            onChange={(e) => setActive(e.target.value === "active")}
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </Select>
        )}

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
            {teacher ? "Salvar alterações" : "Cadastrar professor"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
