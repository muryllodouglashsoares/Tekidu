import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RoleBadge } from "@/components/ui/RoleBadge";

/**
 * Placeholder do dashboard. Nesta etapa, apenas confirmamos que a
 * autenticação, a role e a rota protegida funcionam de ponta a ponta.
 * Os dashboards reais (por role) entram em uma etapa futura.
 */
export function DashboardPage() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="font-display text-lg font-semibold text-ink-700">Tekidu</span>
          <Button variant="secondary" onClick={() => signOut()}>
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <h1 className="font-display text-xl font-semibold text-ink900">
              Olá, {profile?.name ?? "usuário"}
            </h1>
            {profile && <RoleBadge role={profile.role} />}
          </div>
          <p className="text-sm text-ink-500">
            Autenticação, sessão e rotas protegidas funcionando. As próximas
            etapas vão adicionar turmas, disciplinas, notas e frequência.
          </p>
        </Card>
      </main>
    </div>
  );
}
