import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/contexts/AuthContext";
import { resolveLoginKey } from "@/services/users/userService";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// Mapeia códigos de erro do Firebase Auth para mensagens em português,
// sem revelar se o problema foi o e-mail ou a senha (boa prática de
// segurança: não confirmar se um e-mail existe na base).
function mapAuthError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "E-mail ou senha incorretos.";
      case "auth/too-many-requests":
        return "Muitas tentativas. Aguarde um momento e tente novamente.";
      case "auth/invalid-email":
        return "Informe um e-mail válido.";
      default:
        return "Não foi possível entrar. Tente novamente.";
    }
  }
  return "Não foi possível entrar. Tente novamente.";
}

type LoginMode = "normal" | "firstAccess";

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<LoginMode>("normal");

  // Modo normal (Fase 3 — uso já estabelecido: e-mail + senha definitiva).
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Modo primeiro acesso (Fase 2 — Etapa 9): matrícula (aluno) ou chave
  // de 8 caracteres (professor) + a senha temporária recebida por
  // e-mail. O Firebase Authentication só autentica por e-mail, então
  // primeiro resolvemos "identificador → e-mail" via `resolveLoginKey`
  // (leitura anônima e estreita de `loginKeys/{loginKey}` — ver
  // `firestore.rules`) e só então chamamos `signIn`.
  const [loginKeyInput, setLoginKeyInput] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? "/";

  function switchMode(next: LoginMode) {
    setMode(next);
    setError(null);
  }

  async function handleNormalSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleFirstAccessSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const key = loginKeyInput.trim();
    if (!key || !tempPassword) {
      setError("Informe a matrícula (ou chave) e a senha temporária.");
      return;
    }

    setLoading(true);
    try {
      const resolved = await resolveLoginKey(key);
      if (!resolved) {
        setError("Matrícula/chave inválida. Verifique o e-mail recebido ou fale com um administrador.");
        return;
      }
      if (resolved.expired) {
        // Aviso de UX (Decisão 3) — ver limitação documentada em
        // `resolveLoginKey`/`FIREBASE_SETUP.md`: sem Cloud Functions,
        // isto não invalida a senha de fato no Firebase Authentication.
        setError(
          "Esta credencial temporária expirou. Fale com um administrador para receber uma nova."
        );
        return;
      }
      // A partir daqui é um login normal (e-mail resolvido + senha
      // temporária) — `ProtectedRoute` cuida de redirecionar para
      // "/primeiro-acesso" automaticamente após o login bem-sucedido,
      // porque `mustSetPassword` ainda é `true` nesta conta.
      await signIn(resolved.email, tempPassword);
      navigate("/primeiro-acesso", { replace: true });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-2xl font-semibold text-ink-700">Tekidu</span>
          <p className="mt-1 text-sm text-ink-400">Plataforma de gestão escolar</p>
        </div>

        <Card className="p-6">
          <div className="mb-6 flex gap-1 rounded-full bg-ink-50 p-1">
            <button
              type="button"
              onClick={() => switchMode("normal")}
              className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
                mode === "normal" ? "bg-surface text-ink900 shadow-sm" : "text-ink-500"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => switchMode("firstAccess")}
              className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
                mode === "firstAccess" ? "bg-surface text-ink900 shadow-sm" : "text-ink-500"
              }`}
            >
              Primeiro acesso
            </button>
          </div>

          {mode === "normal" ? (
            <form onSubmit={handleNormalSubmit} className="flex flex-col gap-4" noValidate>
              <Input
                label="E-mail"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Senha"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}

              <Button type="submit" loading={loading} className="mt-2 w-full">
                Entrar
              </Button>
            </form>
          ) : (
            <form onSubmit={handleFirstAccessSubmit} className="flex flex-col gap-4" noValidate>
              <p className="text-xs text-ink-500">
                Use a matrícula (aluno) ou a chave de acesso (professor) e a
                senha temporária que você recebeu por e-mail.
              </p>
              <Input
                label="Matrícula ou chave de acesso"
                type="text"
                required
                value={loginKeyInput}
                onChange={(e) => setLoginKeyInput(e.target.value)}
              />
              <Input
                label="Senha temporária"
                type="password"
                required
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
              />

              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}

              <Button type="submit" loading={loading} className="mt-2 w-full">
                Continuar
              </Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <Link
              to="/esqueci-a-senha"
              className="text-sm text-ink-500 hover:text-ink-700 hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
