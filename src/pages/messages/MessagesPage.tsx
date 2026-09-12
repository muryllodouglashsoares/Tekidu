import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/layout/EmptyState";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { NewConversationModal, type ContactOption } from "@/components/chat/NewConversationModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useOwnStudent } from "@/hooks/useOwnStudent";
import { subscribeToConversations, getOrCreateConversation } from "@/services/chat/chatService";
import {
  getTeacherContacts,
  getStudentContacts,
  type TeacherContact,
  type StudentContact,
} from "@/services/chat/chatContactsService";
import { describeFirebaseError } from "@/utils/firebaseError";
import { MessageCircle } from "lucide-react";
import type { Conversation } from "@/types/conversation";

const SCHOOL_YEAR = new Date().getFullYear();

/**
 * PARTE 1 do plano de evolução — Mensageria/chat interno.
 *
 * Uma única página cobre as duas rotas ("/mensagens" e
 * "/mensagens/:conversationId" — ver AppRoutes.tsx), mesmo padrão já
 * usado por `StudentProfilePage` para dois grupos de rota diferentes.
 * O parâmetro de rota é o que decide, em MOBILE, se a tela mostra a
 * lista ou a conversa (comportamento "estilo aplicativo de
 * mensagens" pedido no plano); em DESKTOP as duas colunas convivem
 * sempre, e o parâmetro só decide qual item fica destacado/aberto.
 */
export function MessagesPage() {
  const { profile, firebaseUser } = useAuth();
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const isMobile = useIsMobile();

  const isTeacher = profile?.role === "teacher";
  const { student, loading: loadingStudent } = useOwnStudent("mensagens:aluno");

  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [pendingConversation, setPendingConversation] = useState<Conversation | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactOption[] | null>(null);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [teacherContacts, setTeacherContacts] = useState<TeacherContact[] | null>(null);
  const [studentContacts, setStudentContacts] = useState<StudentContact[] | null>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const currentUid = firebaseUser?.uid ?? "";

  function loadConversations() {
    if (!currentUid) return;
    setConversations(null);
    setListError(null);
  }

  useEffect(() => {
    if (!currentUid) return undefined;
    setConversations(null);
    setListError(null);
    const unsubscribe = subscribeToConversations(
      currentUid,
      (list) => setConversations(list),
      () => setListError(describeFirebaseError(new Error("permission-denied"), "mensagens:conversas"))
    );
    return unsubscribe;
  }, [currentUid]);

  async function openNewConversationModal() {
    setModalOpen(true);
    if (contacts !== null) return; // já carregado nesta sessão da página
    setContactsError(null);
    try {
      if (isTeacher && profile) {
        const list = await getTeacherContacts(profile.uid, SCHOOL_YEAR);
        setTeacherContacts(list);
        setContacts(
          list.map((c) => ({
            id: c.student.id,
            name: c.student.name,
            subtitle: `${c.schoolClass.name} • ${c.discipline.name}`,
          }))
        );
      } else if (student?.classId) {
        const list = await getStudentContacts(student.classId);
        setStudentContacts(list);
        setContacts(
          list.map((c) => ({
            id: c.discipline.id,
            name: c.discipline.teacherName,
            subtitle: c.discipline.name,
          }))
        );
      } else {
        setContacts([]);
      }
    } catch (err) {
      setContactsError(describeFirebaseError(err, "mensagens:contatos"));
    }
  }

  async function handleSelectContact(id: string) {
    if (!profile || !firebaseUser) return;
    setCreatingId(id);
    try {
      let conversation: Conversation;

      if (isTeacher) {
        const contact = teacherContacts?.find((c) => c.student.id === id);
        if (!contact || !contact.student.uid) return;
        conversation = await getOrCreateConversation({
          teacherUid: profile.uid,
          teacherName: profile.name,
          studentId: contact.student.id,
          studentUid: contact.student.uid,
          studentName: contact.student.name,
          classId: contact.schoolClass.id,
          disciplineId: contact.discipline.id,
          disciplineName: contact.discipline.name,
        });
      } else {
        const contact = studentContacts?.find((c) => c.discipline.id === id);
        if (!contact || !student || !contact.discipline.teacherId) return;
        conversation = await getOrCreateConversation({
          teacherUid: contact.discipline.teacherId,
          teacherName: contact.discipline.teacherName,
          studentId: student.id,
          studentUid: firebaseUser.uid,
          studentName: student.name,
          classId: student.classId ?? "",
          disciplineId: contact.discipline.id,
          disciplineName: contact.discipline.name,
        });
      }

      setPendingConversation(conversation);
      setModalOpen(false);
      navigate(`/mensagens/${conversation.id}`);
    } catch (err) {
      toast.error(describeFirebaseError(err, "mensagens:iniciar-conversa"));
    } finally {
      setCreatingId(null);
    }
  }

  const selected =
    conversations?.find((c) => c.id === conversationId) ??
    (pendingConversation?.id === conversationId ? pendingConversation : null);

  function contactName(conversation: Conversation): string {
    return currentUid === conversation.teacherUid ? conversation.studentName : conversation.teacherName;
  }
  function contactSubtitle(conversation: Conversation): string {
    return conversation.disciplineName ?? (currentUid === conversation.teacherUid ? "Aluno" : "Professor");
  }

  const emptyContactsDescription = isTeacher
    ? "Você ainda não leciona nenhuma disciplina vinculada a uma turma com alunos."
    : student?.classId
      ? "Nenhum professor disponível para contato na sua turma."
      : "Você ainda não está matriculado em nenhuma turma neste ano letivo.";

  const listPanel = (
    <ConversationList
      conversations={conversations}
      error={listError}
      currentUid={currentUid}
      selectedId={conversationId ?? null}
      onSelect={(c) => navigate(`/mensagens/${c.id}`)}
      onNewConversation={openNewConversationModal}
      onRetry={loadConversations}
    />
  );

  const detailPanel = selected ? (
    <ChatWindow
      key={selected.id}
      conversation={selected}
      currentUid={currentUid}
      contactName={contactName(selected)}
      contactSubtitle={contactSubtitle(selected)}
      onBack={isMobile ? () => navigate("/mensagens") : undefined}
    />
  ) : (
    <EmptyState
      bare
      icon={MessageCircle}
      title="Selecione uma conversa"
      description="Escolha uma conversa na lista ou inicie uma nova."
    />
  );

  // Enquanto o Portal do Aluno ainda não resolveu `useOwnStudent`, o
  // "Nova conversa" ficaria com contatos vazios por engano — evita
  // abrir o modal precocemente mostrando um estado de carregamento
  // simples no lugar da página inteira (mesmo racional de
  // `MyDisciplinesPage`, que também espera `useOwnStudent` antes de
  // decidir o que renderizar).
  if (!isTeacher && loadingStudent) {
    return (
      <Card className="flex h-[calc(100dvh-11rem)] items-center justify-center md:h-[calc(100dvh-8rem)]">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink-200 border-t-ink-600" aria-hidden="true" />
      </Card>
    );
  }

  return (
    <>
      <Card className="h-[calc(100dvh-11rem)] overflow-hidden p-0 md:h-[calc(100dvh-8rem)]">
        {isMobile ? (
          conversationId ? detailPanel : listPanel
        ) : (
          <div className="grid h-full grid-cols-[320px_1fr]">
            <div className="min-h-0 border-r border-line">{listPanel}</div>
            <div className="min-h-0">{detailPanel}</div>
          </div>
        )}
      </Card>

      {modalOpen && (
        <NewConversationModal
          onClose={() => setModalOpen(false)}
          contacts={contacts}
          error={contactsError}
          onSelect={handleSelectContact}
          creatingId={creatingId}
          emptyDescription={emptyContactsDescription}
        />
      )}
    </>
  );
}
