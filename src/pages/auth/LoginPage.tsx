import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/contexts/AuthContext";
import { resolveLoginKey } from "@/services/users/userService";
import { AlertCircle, Moon, ShieldCheck, Sun } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/ui/BrandMark";
import { TrajectoryPreview } from "@/components/ui/TrajectoryPreview";
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
      {/* Painel de marca (desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-900 p-12 text-surface lg:flex">
        {/* Fundo — glow sutil, mantido do design anterior */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-[10%] -top-[20%] h-[70%] w-[70%] rounded-full bg-ink-700/20 blur-3xl" />
          <div className="absolute -bottom-[20%] -left-[10%] h-[60%] w-[60%] rounded-full bg-ink-800/30 blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex w-fit items-center gap-3 transition-opacity hover:opacity-80">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-ink-900 shadow-sm">
              <BrandMark className="h-5 w-5" />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight">Tekidu</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-ink-300">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Dados protegidos · LGPD
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="mb-6 font-display text-4xl font-bold leading-tight">
            Gestão escolar inteligente e simplificada.
          </h1>
          <p className="text-lg text-ink-300">
            Acompanhe o desenvolvimento dos estudantes, gerencie turmas e avaliações com uma experiência
            projetada para toda a comunidade escolar.
          </p>

          {/* Elemento gráfico de marca: a mesma linha de evolução da
              Landing Page, com um card de contexto ancorado nela. */}
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">
                Evolução do aluno · exemplo
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-semibold text-success">
                +23% no semestre
              </span>
            </div>
            <TrajectoryPreview className="h-24 w-full text-white" />
          </div>

          <div className="mt-8 flex items-start gap-3 border-l-2 border-success/50 pl-4">
            <p className="text-sm italic text-ink-300">
              &ldquo;Passamos a enxergar a trajetória de cada turma em minutos, não em planilhas soltas.&rdquo;
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-sm text-ink-400">
          <span>&copy; {new Date().getFullYear()} Tekidu. Todos os direitos reservados.</span>
          <span className="flex items-center gap-4">
            <a href="mailto:suporte@tekidu.com.br" className="hover:text-ink-200 transition-colors">
              Suporte
            </a>
            <a href="#" className="hover:text-ink-200 transition-colors">
              Privacidade
            </a>
          </span>
        </div>
      </div>

      {/* Painel de login */}
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
          {/* Cabeçalho compacto (mobile): mesmo motivo de marca da versão
              desktop, só que resumido em uma tira horizontal — em vez de
              simplesmente sumir em telas pequenas. */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-ink-700 text-surface shadow-sm">
              <BrandMark className="h-6 w-6" />
            </div>
            <span className="font-display text-2xl font-bold text-ink900">Tekidu</span>
            <p className="mt-2 text-sm text-ink-500">Acesse a plataforma</p>
            <TrajectoryPreview className="mt-5 h-14 w-full max-w-[220px] text-ink-700" />
          </div>

          <div className="mb-8 hidden lg:block">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-success">
              <BrandMark className="h-4 w-4" />
            </div>
            <h2 className="font-display text-3xl font-bold text-ink900">Bem-vindo(a)</h2>
            <p className="mt-2 text-base text-ink-500">Insira suas credenciais para acessar sua conta.</p>
          </div>

          <Card className="border border-line p-6 shadow-card sm:p-8">
            <div className="mb-6 flex gap-1 rounded-full border border-line/50 bg-ink-50 p-1">
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
                <p className="-mt-1 mb-1 text-sm text-ink-500">
                  Use o e-mail e a senha já cadastrados para acessar sua conta.
                </p>
                <Input
                  label="E-mail"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-2 focus:ring-ink-700/20"
                />
                <Input
                  label="Senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-2 focus:ring-ink-700/20"
                />

                <ErrorBanner message={error} />

                <Button type="submit" loading={loading} className="mt-4 w-full py-3">
                  {loading ? "Entrando…" : "Entrar"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleFirstAccessSubmit} className="flex flex-col gap-4" noValidate>
                <p className="-mt-1 mb-1 text-sm text-ink-500">
                  Use a matrícula (aluno) ou a chave de acesso (professor) e a senha temporária que você
                  recebeu por e-mail.
                </p>
                <Input
                  label="Matrícula ou chave de acesso"
                  type="text"
                  required
                  value={loginKeyInput}
                  onChange={(e) => setLoginKeyInput(e.target.value)}
                  className="focus:ring-2 focus:ring-ink-700/20"
                />
                <Input
                  label="Senha temporária"
                  type="password"
                  required
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="focus:ring-2 focus:ring-ink-700/20"
                />

                <ErrorBanner message={error} />

                <Button type="submit" loading={loading} className="mt-4 w-full py-3">
                  {loading ? "Verificando…" : "Continuar"}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                to="/esqueci-a-senha"
                className="text-sm font-medium text-ink-600 transition-colors hover:text-ink-900"
              >
                Esqueci minha senha
              </Link>
            </div>
          </Card>

          {/* Rodapé mobile — os mesmos links do painel de marca (que some
              em telas pequenas), sem competir com o CTA principal acima. */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-ink-400 lg:hidden">
            <a href="mailto:suporte@tekidu.com.br" className="hover:text-ink-600 transition-colors">
              Suporte
            </a>
            <span aria-hidden="true">·</span>
            <a href="#" className="hover:text-ink-600 transition-colors">
              Privacidade
            </a>
            <span aria-hidden="true">·</span>
            <span>&copy; {new Date().getFullYear()} Tekidu</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Estado de erro do formulário — tratamento visual explícito (ícone +
    fundo + borda), não só texto vermelho. */
function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger/5 px-3.5 py-3">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
      <p className="text-sm font-medium text-danger">{message}</p>
    </div>
  );
}
