import { useEffect, useState } from "react";
import { User, ShieldCheck, Sparkles, CheckCircle2, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { useAuth } from "@/contexts/AuthContext";
import { updateOwnName } from "@/services/users/userService";
import { getAcademicSettings, saveAcademicSettings } from "@/services/academicSettings/academicSettingsService";
import { validateAcademicSettingsInput, type AcademicSettingsInput } from "@/types/academicSettings";
import { describeFirebaseError } from "@/utils/firebaseError";

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

  // Regras acadêmicas configuráveis por ano letivo (item 6/7 do plano
  // V8) — só admins veem/editam esta seção (mesma política das
  // firestore.rules: escrita em `academicSettings` é restrita a
  // admin).
  const schoolYear = new Date().getFullYear();
  const [academicForm, setAcademicForm] = useState<AcademicSettingsInput | null>(null);
  const [academicLoading, setAcademicLoading] = useState(false);
  const [savingAcademic, setSavingAcademic] = useState(false);
  const [academicError, setAcademicError] = useState<string | null>(null);
  const [academicSuccess, setAcademicSuccess] = useState(false);

  useEffect(() => {
    if (profile?.role !== "admin") return;
    let cancelled = false;
    setAcademicLoading(true);
    getAcademicSettings(schoolYear)
      .then((settings) => {
        if (!cancelled) {
          setAcademicForm({
            passingAverage: settings.passingAverage,
            recoveryThreshold: settings.recoveryThreshold,
            minAttendanceRate: settings.minAttendanceRate,
            termsCount: settings.termsCount,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setAcademicError(describeFirebaseError(err, "configuracoes:regras-academicas"));
      })
      .finally(() => {
        if (!cancelled) setAcademicLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role, schoolYear]);

  async function handleSaveAcademicSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!academicForm) return;
    setAcademicError(null);
    setAcademicSuccess(false);

    const validationError = validateAcademicSettingsInput(academicForm);
    if (validationError) {
      setAcademicError(validationError);
      return;
    }

    setSavingAcademic(true);
    try {
      await saveAcademicSettings(schoolYear, academicForm);
      setAcademicSuccess(true);
    } catch (err) {
      setAcademicError(describeFirebaseError(err, "configuracoes:salvar-regras-academicas"));
    } finally {
      setSavingAcademic(false);
    }
  }

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

        {/* Regras acadêmicas (item 6/7 do plano V8) — só admins */}
        {profile.role === "admin" && (
          <Card className="p-5">
            <h3 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-ink900">
              <GraduationCap className="h-4 w-4 text-ink-500" aria-hidden="true" />
              Regras acadêmicas — {schoolYear}
            </h3>
            <p className="mb-4 text-sm text-ink-500">
              Estes valores controlam a situação calculada em Notas, Boletim, Dashboard e Relatórios
              para o ano letivo {schoolYear}. Alterar aqui não recalcula notas já lançadas — apenas
              muda como elas são interpretadas.
            </p>

            {academicLoading || !academicForm ? (
              <p className="text-sm text-ink-500">Carregando…</p>
            ) : (
              <form onSubmit={handleSaveAcademicSettings} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    label="Média mínima p/ aprovação"
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={academicForm.passingAverage}
                    onChange={(e) => {
                      setAcademicForm((f) => (f ? { ...f, passingAverage: Number(e.target.value) } : f));
                      setAcademicSuccess(false);
                    }}
                  />
                  <Input
                    label="Média mínima p/ recuperação"
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={academicForm.recoveryThreshold}
                    onChange={(e) => {
                      setAcademicForm((f) => (f ? { ...f, recoveryThreshold: Number(e.target.value) } : f));
                      setAcademicSuccess(false);
                    }}
                  />
                  <Input
                    label="Frequência mínima (%)"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={academicForm.minAttendanceRate}
                    onChange={(e) => {
                      setAcademicForm((f) => (f ? { ...f, minAttendanceRate: Number(e.target.value) } : f));
                      setAcademicSuccess(false);
                    }}
                  />
                  <Input
                    label="Quantidade de bimestres"
                    type="number"
                    min={1}
                    max={12}
                    step={1}
                    value={academicForm.termsCount}
                    onChange={(e) => {
                      setAcademicForm((f) => (f ? { ...f, termsCount: Number(e.target.value) } : f));
                      setAcademicSuccess(false);
                    }}
                  />
                </div>

                {academicError && <p className="text-sm text-danger">{academicError}</p>}
                {academicSuccess && (
                  <p className="flex items-center gap-1.5 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Regras acadêmicas atualizadas com sucesso.
                  </p>
                )}

                <div>
                  <Button type="submit" loading={savingAcademic}>
                    Salvar regras acadêmicas
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}

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
