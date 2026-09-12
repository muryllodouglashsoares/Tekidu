import { useMemo, useState } from "react";
import { Search, UserX } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/layout/EmptyState";
import { ErrorState } from "@/components/layout/ErrorState";
import { MobileCardListSkeleton } from "@/components/ui/Skeleton";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export interface ContactOption {
  id: string;
  name: string;
  subtitle: string;
}

interface NewConversationModalProps {
  onClose: () => void;
  /** `null` enquanto a lista de contatos elegíveis ainda está carregando. */
  contacts: ContactOption[] | null;
  error: string | null;
  onSelect: (id: string) => void;
  /** `true` enquanto `getOrCreateConversation` está em andamento para o contato escolhido. */
  creatingId: string | null;
  emptyDescription: string;
}

/**
 * Modal de "iniciar nova conversa" — reaproveita o `Modal` compartilhado
 * do app (fullscreen em mobile, cartão centralizado em desktop, foco
 * preso, Escape fecha), nunca um diálogo próprio.
 *
 * A lista de contatos já chega PRONTA e filtrada por elegibilidade
 * (ver `chatContactsService` — professor só vê alunos de suas
 * disciplinas; aluno só vê professores da própria turma). Este
 * componente é só apresentação + busca por nome, nunca decide quem é
 * elegível.
 */
export function NewConversationModal({
  onClose,
  contacts,
  error,
  onSelect,
  creatingId,
  emptyDescription,
}: NewConversationModalProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);

  const filtered = useMemo(() => {
    if (!contacts) return null;
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(term) || c.subtitle.toLowerCase().includes(term)
    );
  }, [contacts, debouncedSearch]);

  return (
    <Modal title="Nova conversa" onClose={onClose} mobileBehavior="fullscreen">
      <div className="flex flex-col gap-4">
        <label htmlFor="chat-contact-search" className="sr-only">
          Buscar contato
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            id="chat-contact-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full rounded-card border border-line bg-paper py-2.5 pl-10 pr-3.5 text-sm text-ink900 outline-none transition-colors placeholder:text-ink-300 focus:border-ink-400"
          />
        </div>

        {error ? (
          <ErrorState message={error} />
        ) : filtered === null ? (
          <MobileCardListSkeleton rows={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            bare
            icon={UserX}
            title={contacts && contacts.length > 0 ? "Nenhum resultado" : "Nenhum contato disponível"}
            description={contacts && contacts.length > 0 ? "Tente buscar por outro nome." : emptyDescription}
          />
        ) : (
          <ul role="list" className="flex flex-col divide-y divide-line">
            {filtered.map((contact) => (
              <li key={contact.id}>
                <button
                  type="button"
                  onClick={() => onSelect(contact.id)}
                  disabled={creatingId !== null}
                  className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-ink-50 disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-700 text-sm font-bold text-white">
                    {contact.name
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join("") || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink900">{contact.name}</p>
                    <p className="truncate text-xs text-ink-500">{contact.subtitle}</p>
                  </div>
                  {creatingId === contact.id && (
                    <span
                      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-ink-300 border-t-ink-700"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
