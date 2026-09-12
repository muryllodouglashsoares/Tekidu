import { useState, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { MESSAGE_MAX_LENGTH } from "@/types/message";

interface MessageComposerProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}

/**
 * Campo de digitação do chat (item "UX" do plano):
 * - Enter envia; Shift+Enter quebra linha.
 * - Prevenção de envio de mensagem vazia (`trim()` antes de checar).
 * - Limite de caracteres visível, com contador que só aparece perto
 *   do limite (evita ruído visual em mensagens curtas).
 * - Estado "enviando" (`sending`): desabilita o campo e o botão
 *   enquanto a escrita no Firestore está em andamento, evitando
 *   duplo-envio por duplo-clique/duplo-Enter.
 */
export function MessageComposer({ onSend, disabled }: MessageComposerProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedLength = value.trim().length;
  const isEmpty = trimmedLength === 0;
  const isOverLimit = value.length > MESSAGE_MAX_LENGTH;
  const canSend = !isEmpty && !isOverLimit && !sending && !disabled;

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await onSend(value.trim());
      setValue("");
    } catch {
      setError("Não foi possível enviar a mensagem. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col gap-1.5 border-t border-line bg-surface p-3 sm:p-4">
      <div className="flex items-end gap-2">
        <label htmlFor="chat-message-input" className="sr-only">
          Digite uma mensagem
        </label>
        <textarea
          id="chat-message-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          rows={1}
          placeholder="Digite uma mensagem..."
          aria-describedby={error ? "chat-message-error" : undefined}
          aria-invalid={!!error}
          className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-card border border-line bg-paper px-3.5 py-2.5 text-sm text-ink900 outline-none transition-colors placeholder:text-ink-300 focus:border-ink-400 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Enviar mensagem"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-700 text-white shadow-sm transition-colors hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden="true"
            />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      <div className="flex items-center justify-between px-1 text-[11px]">
        <span id="chat-message-error" role="alert" className="text-danger">
          {error ?? (isOverLimit ? `Limite de ${MESSAGE_MAX_LENGTH} caracteres excedido.` : "")}
        </span>
        {value.length > MESSAGE_MAX_LENGTH * 0.8 && (
          <span className={isOverLimit ? "text-danger" : "text-ink-400"}>
            {value.length}/{MESSAGE_MAX_LENGTH}
          </span>
        )}
      </div>
    </div>
  );
}
