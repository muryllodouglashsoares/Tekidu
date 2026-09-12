import { MessageCircle, Plus } from "lucide-react";
import { MobileCardListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/layout/EmptyState";
import { ErrorState } from "@/components/layout/ErrorState";
import { formatRelativeTime } from "@/utils/formatRelativeTime";
import type { Conversation } from "@/types/conversation";

interface ConversationListProps {
  conversations: Conversation[] | null;
  error: string | null;
  currentUid: string;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  onNewConversation: () => void;
  onRetry: () => void;
}

/** Nome do OUTRO participante (nunca o próprio nome), e um subtítulo contextual. */
function contactInfo(conversation: Conversation, currentUid: string) {
  const isTeacher = currentUid === conversation.teacherUid;
  return {
    name: isTeacher ? conversation.studentName : conversation.teacherName,
    subtitle: isTeacher
      ? conversation.disciplineName ?? "Aluno"
      : conversation.disciplineName ?? "Professor",
  };
}

export function ConversationList({
  conversations,
  error,
  currentUid,
  selectedId,
  onSelect,
  onNewConversation,
  onRetry,
}: ConversationListProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-3.5 sm:px-5">
        <h2 className="font-display text-lg font-bold text-ink900">Mensagens</h2>
        <button
          type="button"
          onClick={onNewConversation}
          aria-label="Iniciar nova conversa"
          title="Nova conversa"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 text-white shadow-sm transition-colors hover:bg-ink-800"
        >
          <Plus className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : conversations === null ? (
          <MobileCardListSkeleton rows={5} />
        ) : conversations.length === 0 ? (
          <EmptyState
            bare
            icon={MessageCircle}
            title="Nenhuma conversa ainda"
            description="Inicie uma conversa com um professor ou aluno disponível."
            action={{ label: "Nova conversa", onClick: onNewConversation }}
          />
        ) : (
          <ul role="list" className="flex flex-col divide-y divide-line">
            {conversations.map((conversation) => {
              const { name, subtitle } = contactInfo(conversation, currentUid);
              const unread = conversation.unreadCount?.[currentUid] ?? 0;
              const isSelected = conversation.id === selectedId;
              const isOwnLastMessage = conversation.lastMessageSenderUid === currentUid;

              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conversation)}
                    aria-current={isSelected ? "true" : undefined}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors sm:px-5 ${
                      isSelected ? "bg-ink-100" : "hover:bg-ink-50"
                    }`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-700 text-sm font-bold text-white">
                      {name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase())
                        .join("") || "?"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-sm ${
                            unread > 0 ? "font-bold text-ink900" : "font-semibold text-ink900"
                          }`}
                        >
                          {name}
                        </p>
                        {Boolean(conversation.lastMessageAt) && (
                          <span className="shrink-0 text-[11px] text-ink-400">
                            {formatRelativeTime(conversation.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-xs ${
                            unread > 0 ? "font-semibold text-ink-700" : "text-ink-500"
                          }`}
                        >
                          {conversation.lastMessage
                            ? `${isOwnLastMessage ? "Você: " : ""}${conversation.lastMessage}`
                            : subtitle}
                        </p>
                        {unread > 0 && (
                          <span
                            aria-label={`${unread} mensagens não lidas`}
                            className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-ink-700 px-1.5 text-[11px] font-bold text-white"
                          >
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
