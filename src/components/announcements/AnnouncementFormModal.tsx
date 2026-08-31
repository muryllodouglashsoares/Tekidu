import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_CATEGORY_LABELS,
  ANNOUNCEMENT_PRIORITY_LABELS,
  TEACHER_ALLOWED_CATEGORIES,
  type Announcement,
  type AnnouncementAudience,
  type AnnouncementCategory,
  type AnnouncementInput,
  type AnnouncementPriority,
} from "@/types/announcement";

const TITLE_MIN = 4;
const TITLE_MAX = 120;

// Público disponível por role (seção 19 do briefing): admin define
// livremente; professor, por enquanto, só publica para alunos ou
// todos — nunca "somente professores", que fica reservado ao admin
// para comunicação institucional entre staff.
const AUDIENCE_OPTIONS_BY_ROLE: Record<"admin" | "teacher", AnnouncementAudience[]> = {
  admin: ["all", "students", "teachers"],
  teacher: ["students", "all"],
};

// Prioridade "urgente" fica reservada ao admin (seção 15/37): é o selo
// de maior destaque visual do Portal e deve permanecer um sinal
// institucional confiável, não algo que qualquer aviso acadêmico
// individual dispare.
const PRIORITY_OPTIONS_BY_ROLE: Record<"admin" | "teacher", AnnouncementPriority[]> = {
  admin: ["normal", "important", "urgent"],
  teacher: ["normal", "important"],
};

interface AnnouncementFormModalProps {
  announcement?: Announcement | null;
  authorRole: "admin" | "teacher";
  onClose: () => void;
  /** `publish` = false salva como rascunho; `true` publica imediatamente. */
  onSubmit: (data: AnnouncementInput, publish: boolean) => Promise<void>;
}

function defaultForm(authorRole: "admin" | "teacher"): AnnouncementInput {
  return {
    title: "",
    content: "",
    category: authorRole === "admin" ? "administrative" : "academic",
    priority: "normal",
    audience: authorRole === "admin" ? "all" : "students",
    pinned: false,
    expiresAt: null,
  };
}

export function AnnouncementFormModal({
  announcement,
  authorRole,
  onClose,
  onSubmit,
}: AnnouncementFormModalProps) {
  const categoryOptions =
    authorRole === "admin"
      ? (Object.keys(ANNOUNCEMENT_CATEGORY_LABELS) as AnnouncementCategory[])
      : TEACHER_ALLOWED_CATEGORIES;
  const audienceOptions = AUDIENCE_OPTIONS_BY_ROLE[authorRole];
  const priorityOptions = PRIORITY_OPTIONS_BY_ROLE[authorRole];

  const [form, setForm] = useState<AnnouncementInput>(
    announcement
      ? {
          title: announcement.title,
          content: announcement.content,
          category: announcement.category,
          priority: announcement.priority,
          audience: announcement.audience,
          pinned: announcement.pinned,
          expiresAt: toDateInputValue(announcement.expiresAt),
        }
      : defaultForm(authorRole)
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);

  function update<K extends keyof AnnouncementInput>(key: K, value: AnnouncementInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    const title = form.title.trim();
    if (!title) return "Informe o título do aviso.";
    if (title.length < TITLE_MIN) return `O título deve ter pelo menos ${TITLE_MIN} caracteres.`;
    if (title.length > TITLE_MAX) return `O título deve ter no máximo ${TITLE_MAX} caracteres.`;
    if (!form.content.trim()) return "Informe o conteúdo do aviso.";
    if (!announcement && form.expiresAt) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expires = new Date(`${form.expiresAt}T00:00:00`);
      if (expires < today) return "A data de expiração não pode estar no passado.";
    }
    return null;
  }

  async function handleSubmit(e: { preventDefault: () => void }, publish: boolean) {
    e.preventDefault();
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(publish ? "publish" : "draft");
    try {
      await onSubmit(form, publish);
      onClose();
    } catch {
      setError("Não foi possível salvar o aviso. Tente novamente.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Modal title={announcement ? "Editar aviso" : "Novo aviso"} onClose={onClose} size="lg">
      <form onSubmit={(e) => handleSubmit(e, announcement?.published ?? false)} className="flex flex-col gap-5" noValidate>
        <Input
          label="Título"
          required
          maxLength={TITLE_MAX}
          placeholder="Ex.: Reunião de pais e mestres"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
        />

        <Textarea
          label="Conteúdo"
          required
          rows={6}
          placeholder="Descreva o aviso com todas as informações relevantes..."
          value={form.content}
          onChange={(e) => update("content", e.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Categoria"
            required
            value={form.category}
            onChange={(e) => update("category", e.target.value as AnnouncementCategory)}
          >
            {categoryOptions.map((value) => (
              <option key={value} value={value}>
                {ANNOUNCEMENT_CATEGORY_LABELS[value]}
              </option>
            ))}
          </Select>

          <Select
            label="Prioridade"
            required
            value={form.priority}
            onChange={(e) => update("priority", e.target.value as AnnouncementPriority)}
          >
            {priorityOptions.map((value) => (
              <option key={value} value={value}>
                {ANNOUNCEMENT_PRIORITY_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Público-alvo"
            required
            value={form.audience}
            onChange={(e) => update("audience", e.target.value as AnnouncementAudience)}
          >
            {audienceOptions.map((value) => (
              <option key={value} value={value}>
                {ANNOUNCEMENT_AUDIENCE_LABELS[value]}
              </option>
            ))}
          </Select>

          <Input
            label="Expira em (opcional)"
            type="date"
            value={form.expiresAt ?? ""}
            onChange={(e) => update("expiresAt", e.target.value || null)}
          />
        </div>

        {authorRole === "admin" && (
          <label className="flex items-center gap-2.5 text-sm font-medium text-ink-700">
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(e) => update("pinned", e.target.checked)}
              className="h-4 w-4 rounded border-line text-ink-700 focus:ring-ink-400"
            />
            Fixar este aviso em destaque
          </label>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-1 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            loading={saving === "draft"}
            disabled={saving !== null}
            onClick={(e) => handleSubmit(e, false)}
          >
            Salvar rascunho
          </Button>
          <Button
            type="button"
            loading={saving === "publish"}
            disabled={saving !== null}
            onClick={(e) => handleSubmit(e, true)}
          >
            Publicar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function toDateInputValue(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
}
