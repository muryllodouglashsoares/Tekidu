import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FirebaseError } from "firebase/app";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { completeFirstAccess } from "@/services/users/userService";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function mapUpdatePasswordError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/weak-password":
        return "Escolha uma senha mais forte (mínimo de 8 caracteres).";
      case "auth/requires-recent-login":
        // Não deve acontecer em condições normais (o usuário acabou de
        // logar com a credencial temporária), mas o Firebase pode
        // exigir isso se a sessão demorar demais entre o login e este
        // passo — a única saída sem Admin SDK é pedir para logar de
        // novo.
        return "Sua sessão expirou. Saia e faça login novamente com a credencial temporária recebida por e-mail, depois tente de novo.";
      default:
        return "Não foi possível definir a nova senha. Tente novamente.";
    }
  }
  return "Não foi possível definir a nova senha. Tente novamente.";
}

/**
 * Fase 2 do ciclo de vida de conta estilo SUAP (Etapa 9): tela
 * obrigatória — via `ProtectedRoute`, que redireciona para cá sempre
 * que `profile.mustSetPassword === true`, independente da URL que o
 * usuário tentar acessar — onde professor/aluno troca a senha
 * temporária pela definitiva no primeiro acesso.
 *
 * NÃO usa `AppShell` (sem sidebar/topo): propositalmente parecido com
 * `LoginPage`, para deixar claro que é um passo obrigatório antes de
 * "entrar" no sistema de verdade, não mais uma tela do dashboard.
 */
export function FirstAccessPage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Se o usuário já concluiu o primeiro acesso (mustSetPassword ===
  // false) e tenta voltar manualmente para esta URL, mandamos de volta
  // para o Dashboard em vez de deixá-lo repetir o passo — ver nota em
  // `ProtectedRoute` sobre por que este caso é tratado aqui, não lá.
  useEffect(() => {
    if (profile && !profile.mustSetPassword) {
      navigate("/", { replace: true });
    }
  }, [profile, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!emailConfirmed) {
      setError("Confirme que o e-mail abaixo está correto para continuar.");
      return;
    }
    if (newPassword.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!auth.currentUser || !profile) {
      setError("Sessão inválida. Faça login novamente.");
      return;
    }

    setSaving(true);
    try {
      // 1) Firebase Authentication: só depois que a senha definitiva
      //    está de fato ativa na conta é que liberamos o resto do
      //    fluxo — se isto falhar, `users/{uid}` continua com
      //    `mustSetPassword: true` e a credencial temporária continua
      //    valendo, então nada fica inconsistente.
      await updatePassword(auth.currentUser, newPassword);
      // 2) Firestore: apaga a chave de uso único e marca o primeiro
      //    acesso como concluído.
      await completeFirstAccess(profile.uid, profile.loginKey ?? null);
      // 3) Reflete a mudança no AuthContext para que `ProtectedRoute`
      //    pare de redirecionar para cá no próximo render.
      await refreshProfile();
      navigate("/", { replace: true });
    } catch (err) {
      setError(mapUpdatePasswordError(err));
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-2xl font-semibold text-ink-700">Tekidu</span>
          <p className="mt-1 text-sm text-ink-400">Primeiro acesso</p>
        </div>

        <Card className="p-6">
          <h1 className="mb-2 font-display text-lg font-semibold text-ink900">
            Defina sua senha
          </h1>
          <p className="mb-6 text-sm text-ink-500">
            Esta é a primeira vez que você entra no sistema. Antes de
            continuar, defina uma senha definitiva — a credencial
            temporária recebida por e-mail não poderá mais ser usada
            depois disso.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="rounded-card bg-ink-50 px-3 py-2.5">
              <p className="text-xs text-ink-400">Seu e-mail de acesso</p>
              <p className="text-sm font-medium text-ink900">{profile.email}</p>
              <label className="mt-2 flex items-center gap-2 text-xs text-ink-500">
                <input
                  type="checkbox"
                  checked={emailConfirmed}
                  onChange={(e) => setEmailConfirmed(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-line"
                />
                Confirmo que este e-mail está correto
              </label>
            </div>

            <Input
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Mínimo de 8 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}

            <Button type="submit" loading={saving} className="mt-2 w-full">
              Confirmar e entrar
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => signOut().then(() => navigate("/login", { replace: true }))}
              className="text-sm text-ink-500 hover:text-ink-700 hover:underline"
            >
              Sair
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
