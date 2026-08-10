import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email);
      // Sempre mostramos sucesso, mesmo que o e-mail não exista na base
      // — isso evita que a tela seja usada para "descobrir" e-mails
      // cadastrados (enumeração de usuários).
      setSent(true);
    } catch {
      setError("Não foi possível enviar o e-mail. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-2xl font-semibold text-ink-700">Tekidu</span>
        </div>

        <Card className="p-6">
          <h1 className="mb-2 font-display text-lg font-semibold text-ink900">
            Recuperar senha
          </h1>

          {sent ? (
            <p className="text-sm text-ink-600">
              Se este e-mail estiver cadastrado, você receberá um link para
              redefinir sua senha em instantes. Verifique também a caixa de
              spam.
            </p>
          ) : (
            <>
              <p className="mb-6 text-sm text-ink-500">
                Informe seu e-mail para receber um link de redefinição.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <Input
                  label="E-mail"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {error && (
                  <p role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                )}
                <Button type="submit" loading={loading} className="w-full">
                  Enviar link
                </Button>
              </form>
            </>
          )}

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-ink-500 hover:text-ink-700 hover:underline">
              Voltar para o login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
