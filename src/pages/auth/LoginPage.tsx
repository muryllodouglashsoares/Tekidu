import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/contexts/AuthContext";
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

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? "/";

  async function handleSubmit(e: FormEvent) {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-2xl font-semibold text-ink-700">Tekidu</span>
          <p className="mt-1 text-sm text-ink-400">Plataforma de gestão escolar</p>
        </div>

        <Card className="p-6">
          <h1 className="mb-6 font-display text-lg font-semibold text-ink900">Entrar</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
