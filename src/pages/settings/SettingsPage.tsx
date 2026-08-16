import { useState } from "react";
import { User, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { useAuth } from "@/contexts/AuthContext";
import { updateOwnName } from "@/services/users/userService";

/**
 * Configurações do usuário (itens 21–26 do briefing). Segue o mesmo
 * padrão visual das demais telas (Card/Input/Button, mesmos
 * espaçamentos e estados de feedback), organizada por seções.
 *
 * Só implementa o que o backend atual realmente suporta (item 24):
 * - Perfil (nome): editável — grava em users/{uid}.name, permitido
 *   pela extensão de firestore.rules feita para esta funcionalidade
 *   (ver comentário em firestore.rules).
 * - Segurança (senha): reaproveita o fluxo de redefinição por e-mail
 *   já existente (`resetPassword`, usado em "Esqueci minha senha"),
 *   em vez de inventar um endpoint de troca de senha que o projeto
 *   não tem.
 * - Preferências (tema/notificações): NÃO há suporte no backend para
 *   persistir isso, então a seção só informa que ainda não está
 *   disponível — sem fingir salvar algo que se perde ao recarregar.
 */
export function SettingsPage() {
  const { profile, firebaseUser, resetPassword, refreshProfile } = useAuth();

  const [name, setName] = useState(profile?.name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [sendingReset, setSendingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const nameChanged = name.trim() !== "" && name.trim() !== profile?.name;

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser || !nameChanged) return;
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      await updateOwnName(firebaseUser.uid, name.trim());
      await refreshProfile();
      setProfileSuccess(true);
    } catch {
      setProfileError("Não foi possível salvar as alterações.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSendReset() {
    if (!profile?.email) return;
    setSendingReset(true);
    setResetError(null);
    setResetSuccess(false);
    try {
      await resetPassword(profile.email);
      setResetSuccess(true);
    } catch {
      setResetError("Não foi possível enviar o e-mail de redefinição de senha.");
    } finally {
      setSendingReset(false);
    }
  }

  if (!profile) return null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-semibold text-ink900">Configurações</h2>
        <p className="text-sm text-ink-500">Gerencie suas informações e preferências de conta</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Perfil */}
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-ink900">
            <User className="h-4 w-4 text-ink-500" aria-hidden="true" />
            Perfil
          </h3>
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nome"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setProfileSuccess(false);
                }}
                maxLength={120}
                required
              />
              <Input label="E-mail" value={profile.email} disabled readOnly />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-ink-700">Perfil de acesso</p>
              <RoleBadge role={profile.role} />
            </div>

            {profileError && <p className="text-sm text-danger">{profileError}</p>}
            {profileSuccess && (
              <p className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Configurações atualizadas com sucesso.
              </p>
            )}

            <div>
              <Button type="submit" disabled={!nameChanged} loading={savingProfile}>
                Salvar alterações
              </Button>
            </div>
          </form>
        </Card>

        {/* Segurança */}
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-ink900">
            <ShieldCheck className="h-4 w-4 text-ink-500" aria-hidden="true" />
            Segurança
          </h3>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ink-700">Senha</p>
              <p className="text-sm text-ink-500">
                Enviaremos um link de redefinição de senha para {profile.email}.
              </p>
            </div>
            <Button variant="secondary" onClick={handleSendReset} loading={sendingReset}>
              Enviar link de redefinição
            </Button>
          </div>
          {resetError && <p className="mt-3 text-sm text-danger">{resetError}</p>}
          {resetSuccess && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              E-mail de redefinição enviado. Confira sua caixa de entrada.
            </p>
          )}
        </Card>

        {/* Preferências */}
        <Card className="p-5">
          <h3 className="mb-2 flex items-center gap-2 font-display text-base font-semibold text-ink900">
            <Sparkles className="h-4 w-4 text-ink-500" aria-hidden="true" />
            Preferências
          </h3>
          <p className="text-sm text-ink-500">
            Preferências de tema e notificações ainda não são suportadas nesta versão do Tekidu — em vez de
            simular uma configuração que não seria salva de verdade, esta seção ficará disponível assim que
            houver suporte no backend.
          </p>
        </Card>
      </div>
    </div>
  );
}
