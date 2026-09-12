import { useState } from "react";
import { Link2, Loader2, Trash2, UserPlus, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/layout/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  createGuardian,
  getGuardianByEmail,
  linkGuardianToStudent,
  unlinkGuardianFromStudent,
} from "@/services/guardians/guardianService";
import { describeFirebaseError } from "@/utils/firebaseError";
import type { UserProfile } from "@/types/user";
import type { Student } from "@/types/student";

/**
 * Aba "Responsáveis" da ficha do aluno (Fase 3 do plano de evolução —
 * Portal do Responsável). Só renderizada para admin (ver
 * `StudentProfilePage`, mesmo guard já usado pela aba "Histórico") —
 * a Security Rule (`isValidGuardianUidsChange` em `firestore.rules`)
 * é a garantia real de que só admin consegue alterar o vínculo, mas
 * nem mostrar a UI para quem não pode usá-la evita um clique que
 * resultaria só em erro de permissão.
 */
export function GuardiansTab({
  student,
  guardians,
  onChange,
}: {
  student: Student;
  guardians: UserProfile[];
  onChange: () => void;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState<"link" | "create" | null>(null);
  const [removingUid, setRemovingUid] = useState<string | null>(null);

  async function handleUnlink(guardian: UserProfile) {
    if (!profile) return;
    if (!window.confirm(`Remover o vínculo de ${guardian.name} com ${student.name}?`)) return;
    setRemovingUid(guardian.uid);
    try {
      await unlinkGuardianFromStudent(student.id, guardian.uid, {
        actor: { id: profile.uid, name: profile.name },
        studentName: student.name,
        guardianName: guardian.name,
      });
      toast.success("Vínculo removido.");
      onChange();
    } catch (error) {
      toast.error(describeFirebaseError(error, "responsaveis:desvincular"));
    } finally {
      setRemovingUid(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink900">Responsáveis</h2>
          <p className="text-sm text-ink-500">Quem pode acompanhar o boletim e a frequência deste aluno.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setModalOpen("link")}>
            <Link2 className="h-3.5 w-3.5" />
            Vincular existente
          </Button>
          <Button size="sm" onClick={() => setModalOpen("create")}>
            <UserPlus className="h-3.5 w-3.5" />
            Cadastrar responsável
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {guardians.length === 0 ? (
          <EmptyState
            bare
            icon={Users}
            title="Nenhum responsável vinculado"
            description="Vincule um responsável existente ou cadastre um novo para liberar o Portal do Responsável."
          />
        ) : (
          <ul role="list" className="flex flex-col divide-y divide-line">
            {guardians.map((guardian) => (
              <li key={guardian.uid} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink900">{guardian.name}</p>
                  <p className="truncate text-xs text-ink-500">{guardian.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnlink(guardian)}
                  disabled={removingUid === guardian.uid}
                  aria-label={`Remover vínculo de ${guardian.name}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                >
                  {removingUid === guardian.uid ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {modalOpen === "link" && (
        <LinkGuardianModal
          student={student}
          onClose={() => setModalOpen(null)}
          onLinked={() => {
            setModalOpen(null);
            onChange();
          }}
        />
      )}
      {modalOpen === "create" && (
        <CreateGuardianModal
          student={student}
          onClose={() => setModalOpen(null)}
          onCreated={() => {
            setModalOpen(null);
            onChange();
          }}
        />
      )}
    </div>
  );
}

function LinkGuardianModal({
  student,
  onClose,
  onLinked,
}: {
  student: Student;
  onClose: () => void;
  onLinked: () => void;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!profile || !email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const guardian = await getGuardianByEmail(email.trim());
      if (!guardian) {
        setError(`Nenhum responsável cadastrado com o e-mail ${email.trim()}. Use "Cadastrar responsável".`);
        return;
      }
      if (student.guardianUids.includes(guardian.uid)) {
        setError(`${guardian.name} já está vinculado a ${student.name}.`);
        return;
      }
      await linkGuardianToStudent(student.id, guardian.uid, {
        actor: { id: profile.uid, name: profile.name },
        studentName: student.name,
        guardianName: guardian.name,
      });
      toast.success(`${guardian.name} vinculado(a) a ${student.name}.`);
      onLinked();
    } catch (err) {
      setError(describeFirebaseError(err, "responsaveis:vincular"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Vincular responsável existente" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-500">
          Informe o e-mail de um responsável que já tem conta no Tekidu (por exemplo, por já ser responsável de
          outro aluno).
        </p>
        <Input
          label="E-mail do responsável"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error ?? undefined}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !email.trim()}>
            {submitting ? "Vinculando..." : "Vincular"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CreateGuardianModal({
  student,
  onClose,
  onCreated,
}: {
  student: Student;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!profile || !name.trim() || !email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createGuardian({ name: name.trim(), email: email.trim() }, student.id, {
        id: profile.uid,
        name: profile.name,
      });
      toast.success(`${name.trim()} cadastrado(a) como responsável e vinculado(a) a ${student.name}.`);
      onCreated();
    } catch (err) {
      setError(describeFirebaseError(err, "responsaveis:cadastrar"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Cadastrar novo responsável" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-500">
          Um e-mail com a chave de acesso e senha temporária será enviado para o responsável — mesmo fluxo de
          primeiro acesso usado para professores.
        </p>
        <Input label="Nome completo" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error ?? undefined}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim() || !email.trim()}>
            {submitting ? "Cadastrando..." : "Cadastrar e vincular"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
