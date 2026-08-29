import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import {
  ACADEMIC_EVENT_CATEGORY_META,
  ACADEMIC_EVENT_CATEGORY_OPTIONS,
  validateAcademicEventInput,
  type AcademicEvent,
  type AcademicEventInput,
} from "@/types/academicEvent";

interface EventDialogProps {
  /** Data pré-selecionada para um evento novo (yyyy-mm-dd). */
  defaultDate: string;
  /** Quando informado, o formulário edita este evento; caso contrário, cria um novo. */
  event?: AcademicEvent | null;
  onClose: () => void;
  onSubmit: (data: AcademicEventInput, editingId?: string | null) => Promise<void>;
}

function buildDefaultForm(defaultDate: string, event?: AcademicEvent | null): AcademicEventInput {
  if (event) {
    return {
      title: event.title,
      description: event.description,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      category: event.category,
    };
  }
  return {
    title: "",
    description: "",
    date: defaultDate,
    startTime: null,
    endTime: null,
    category: "atividade",
  };
}

/**
 * Fluxo simples pedido no briefing: escolher data → preencher dados →
 * salvar → aparece imediatamente (via listener em tempo real do
 * hook) → permanece salvo (Firestore). Segue o mesmo padrão de
 * formulário sem biblioteca de `ClassFormModal`/`StudentFormModal`
 * (o projeto não usa React Hook Form/Zod).
 */
export function EventDialog({ defaultDate, event, onClose, onSubmit }: EventDialogProps) {
  const [form, setForm] = useState<AcademicEventInput>(() => buildDefaultForm(defaultDate, event));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof AcademicEventInput>(key: K, value: AcademicEventInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validateAcademicEventInput(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit(form, event?.id ?? null);
      onClose();
    } catch {
      setError("Não foi possível salvar o evento. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={event ? "Editar evento" : "Novo evento"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Título"
          required
          maxLength={120}
          placeholder="Ex.: Prova de Matemática"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Data"
            type="date"
            required
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
          />
          <Select
            label="Categoria"
            value={form.category}
            onChange={(e) => update("category", e.target.value as AcademicEventInput["category"])}
          >
            {ACADEMIC_EVENT_CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {ACADEMIC_EVENT_CATEGORY_META[category].label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Início (opcional)"
            type="time"
            value={form.startTime ?? ""}
            onChange={(e) => update("startTime", e.target.value || null)}
          />
          <Input
            label="Término (opcional)"
            type="time"
            value={form.endTime ?? ""}
            onChange={(e) => update("endTime", e.target.value || null)}
          />
        </div>

        <Textarea
          label="Descrição (opcional)"
          rows={3}
          maxLength={500}
          placeholder="Detalhes adicionais sobre o evento"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />

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
            {event ? "Salvar alterações" : "Criar evento"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
