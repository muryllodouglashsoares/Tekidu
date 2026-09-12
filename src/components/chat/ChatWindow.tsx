import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageSquareOff } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { ErrorState } from "@/components/layout/ErrorState";
import {
  markConversationRead,
  markMessagesAsRead,
  sendMessage,
  subscribeToMessages,
} from "@/services/chat/chatService";
import { describeFirebaseError } from "@/utils/firebaseError";
import type { Conversation } from "@/types/conversation";
import type { Message } from "@/types/message";

interface ChatWindowProps {
  conversation: Conversation;
  currentUid: string;
  contactName: string;
  contactSubtitle: string;
  /** Presente apenas em mobile (a lista de conversas some da tela ao abrir uma conversa). */
  onBack?: () => void;
}

function dayKey(value: unknown): string {
  if (!(value instanceof Timestamp)) return "pending";
  return value.toDate().toDateString();
}

function formatDayLabel(value: unknown): string {
  if (!(value instanceof Timestamp)) return "";
  const date = value.toDate();
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Hoje";
  if (isYesterday) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Janela de UMA conversa: cabeçalho com o contato, histórico agrupado
 * por dia (item "UX" do plano — "mensagens agrupadas") e o composer.
 *
 * TEMPO REAL: assina `subscribeToMessages` (onSnapshot) ao montar,
 * cancela no cleanup — nunca polling (item explícito do plano).
 *
 * LEITURA: ao abrir a conversa, zera o contador de não lidas
 * (`markConversationRead`) e marca as mensagens carregadas destinadas
 * a mim como lidas (`markMessagesAsRead`) — mas apenas quando a
 * mensagem chega enquanto a conversa já está aberta ou no carregamento
 * inicial, nunca reprocessando o lote inteiro a cada re-render (ver
 * `useEffect` com dependência em `messages`, guardado por uma
 * checagem de "já processado").
 */
export function ChatWindow({ conversation, currentUid, contactName, contactSubtitle, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousLastIdRef = useRef<string | null>(null);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    setMessages(null);
    setError(null);
    isFirstLoadRef.current = true;
    previousLastIdRef.current = null;

    const unsubscribe = subscribeToMessages(
      conversation.id,
      (list) => setMessages(list),
      () => setError(describeFirebaseError(new Error("permission-denied"), "mensagens:listener"))
    );
    return unsubscribe;
  }, [conversation.id]);

  // Autoscroll para a mensagem mais recente — sempre que a lista muda
  // (nova mensagem própria ou recebida), nunca preso no meio do
  // histórico. `behavior: "auto"` no primeiro carregamento (evita uma
  // animação longa ao abrir uma conversa com histórico), "smooth" nas
  // atualizações seguintes.
  useEffect(() => {
    if (!messages || !scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: isFirstLoadRef.current ? "auto" : "smooth",
    });
    isFirstLoadRef.current = false;
  }, [messages]);

  // Marca como lidas + anuncia a última mensagem recebida (item de
  // acessibilidade do plano — "sem causar spam para leitor de tela":
  // só a ÚLTIMA mensagem nova é anunciada, nunca o histórico inteiro).
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.id === previousLastIdRef.current) return;
    previousLastIdRef.current = last.id;

    if (last.recipientUid === currentUid) {
      setAnnouncement(`${contactName} enviou: ${last.content.slice(0, 140)}`);
    }

    markConversationRead(conversation.id, currentUid).catch(() => {
      /* falha silenciosa: o badge fica "atrasado" até a próxima abertura, sem quebrar a leitura da conversa */
    });
    markMessagesAsRead(conversation.id, messages, currentUid).catch(() => {
      /* idem — não bloqueia a experiência de leitura por uma falha de escrita secundária */
    });
  }, [messages, conversation.id, currentUid, contactName]);

  async function handleSend(content: string) {
    const recipientUid =
      currentUid === conversation.teacherUid ? conversation.studentUid : conversation.teacherUid;
    await sendMessage(conversation.id, { senderUid: currentUid, recipientUid, content });
  }

  const groups = useMemo(() => {
    if (!messages) return [];
    const map = new Map<string, Message[]>();
    for (const message of messages) {
      const key = dayKey(message.createdAt);
      const list = map.get(key) ?? [];
      list.push(message);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [messages]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-3.5 sm:px-5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar para a lista de conversas"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-600 hover:bg-ink-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-700 text-sm font-bold text-white">
          {contactName
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase())
            .join("")}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold text-ink900">{contactName}</p>
          <p className="truncate text-xs text-ink-500">{contactSubtitle}</p>
        </div>
      </div>

      {/* Região viva para leitores de tela: só o texto da última
          mensagem RECEBIDA é anunciado (ver useEffect acima) — a
          lista de mensagens abaixo não é aria-live, para não reler o
          histórico inteiro a cada atualização. */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 sm:px-5">
        {error ? (
          <ErrorState message={error} />
        ) : messages === null ? (
          <div role="status" aria-label="Carregando mensagens" className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-10 max-w-[65%] animate-pulse rounded-card bg-ink-100 ${i % 2 === 0 ? "ml-auto" : ""}`}
                style={{ width: `${45 + (i % 3) * 15}%` }}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-card bg-ink-50 text-ink-400">
              <MessageSquareOff className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-base font-semibold text-ink900">Nenhuma mensagem ainda</p>
              <p className="mt-1 max-w-xs text-sm text-ink-500">
                Envie a primeira mensagem para {contactName}.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map(([key, group]) => (
              <div key={key} className="flex flex-col gap-2">
                <div className="sticky top-0 z-10 flex justify-center">
                  <span className="rounded-full bg-ink-50 px-3 py-1 text-[11px] font-medium text-ink-500">
                    {formatDayLabel(group[0].createdAt)}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {group.map((message) => (
                    <MessageBubble key={message.id} message={message} isOwn={message.senderUid === currentUid} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MessageComposer onSend={handleSend} disabled={!!error} />
    </div>
  );
}
