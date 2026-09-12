import { Check, CheckCheck } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import type { Message } from "@/types/message";

function formatMessageTime(value: unknown): string {
  if (!(value instanceof Timestamp)) return "";
  return value.toDate().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Uma mensagem individual, alinhada à direita (própria) ou à esquerda
 * (do outro participante) — diferenciação visual pedida no plano
 * ("UX": "diferenciação visual entre remetente e destinatário").
 * Usa exclusivamente os tokens de cor já existentes (`bg-ink-700` para
 * a própria mensagem, `bg-ink-50`/`border-line` para a do outro
 * participante), nunca uma cor arbitrária nova.
 */
export function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const time = formatMessageTime(message.createdAt);

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[80%] flex-col gap-1 rounded-card px-4 py-2.5 text-sm shadow-sm sm:max-w-[65%] ${
          isOwn ? "bg-ink-700 text-white" : "border border-line bg-surface text-ink900"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <div
          className={`flex items-center justify-end gap-1 text-[11px] ${
            isOwn ? "text-white/70" : "text-ink-400"
          }`}
        >
          {/* Timestamp vazio (serverTimestamp ainda não resolvido) não
              quebra o layout — só o horário fica ausente por um
              instante, mesmo comportamento de `formatRelativeTime`. */}
          <span>{time}</span>
          {isOwn &&
            (message.readAt ? (
              <CheckCheck className="h-3.5 w-3.5" aria-label="Lida" />
            ) : (
              <Check className="h-3.5 w-3.5" aria-label="Enviada" />
            ))}
        </div>
      </div>
    </div>
  );
}
