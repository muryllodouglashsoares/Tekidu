import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/contexts/AuthContext";
import { resolveLoginKey } from "@/services/users/userService";
import { Moon, Sun } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/contexts/ThemeContext";

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
  const { theme, toggleTheme } = useTheme();
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

  const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard";

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
    <div className="flex min-h-screen bg-paper font-sans">
      {/* Branding Side (Desktop) */}
      <div className="hidden w-1/2 flex-col justify-between bg-ink-900 p-12 text-surface lg:flex relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-ink-700/20 blur-3xl"></div>
          <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-ink-800/30 blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 w-fit hover:opacity-80 transition-opacity">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-ink-900 shadow-sm">
              <span className="font-bold text-xl">T</span>
            </div>
            <span className="font-display text-2xl font-bold tracking-tight">Tekidu</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight mb-6">
            Gestão escolar inteligente e simplificada.
          </h1>
          <p className="text-lg text-ink-300">
            Acompanhe o desenvolvimento dos estudantes, gerencie turmas e avaliações com uma experiência projetada para toda a comunidade escolar.
          </p>
        </div>

        <div className="relative z-10 text-sm text-ink-400">
          &copy; {new Date().getFullYear()} Tekidu. Todos os direitos reservados.
        </div>
      </div>

      {/* Login Side */}
      <div className="relative flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:px-24">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          className="absolute right-4 top-4 rounded-full border border-line bg-surface p-2.5 text-ink-500 shadow-sm transition-colors hover:bg-ink-100 hover:text-ink-700 sm:right-6 sm:top-6"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          <div className="lg:hidden mb-8 text-center flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-700 text-surface shadow-sm mb-4">
              <span className="font-bold text-2xl">T</span>
            </div>
            <span className="font-display text-2xl font-bold text-ink900">Tekidu</span>
            <p className="mt-2 text-sm text-ink-500">Acesse a plataforma</p>
          </div>

          <div className="mb-8 hidden lg:block">
            <h2 className="text-3xl font-display font-bold text-ink900">Bem-vindo(a)</h2>
            <p className="mt-2 text-base text-ink-500">Insira suas credenciais para acessar sua conta.</p>
          </div>

          <Card className="p-6 sm:p-8 shadow-card border-line border">
            <div className="mb-6 flex gap-1 rounded-full bg-ink-50 p-1 border border-line/50">
              <button
                type="button"
                onClick={() => switchMode("normal")}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                  mode === "normal" ? "bg-surface text-ink900 shadow-sm ring-1 ring-black/5" : "text-ink-500 hover:text-ink-700"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => switchMode("firstAccess")}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                  mode === "firstAccess" ? "bg-surface text-ink900 shadow-sm ring-1 ring-black/5" : "text-ink-500 hover:text-ink-700"
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
                  <p role="alert" className="text-sm text-danger font-medium">
                    {error}
                  </p>
                )}

                <Button type="submit" loading={loading} className="mt-4 w-full py-3">
                  Entrar
                </Button>
              </form>
            ) : (
              <form onSubmit={handleFirstAccessSubmit} className="flex flex-col gap-4" noValidate>
                <p className="text-sm text-ink-500 mb-2">
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
                  <p role="alert" className="text-sm text-danger font-medium">
                    {error}
                  </p>
                )}

                <Button type="submit" loading={loading} className="mt-4 w-full py-3">
                  Continuar
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                to="/esqueci-a-senha"
                className="text-sm font-medium text-ink-600 hover:text-ink-900 transition-colors"
              >
                Esqueci minha senha
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
