import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";

interface StatusPageProps {
  title: string;
  description: string;
  showSignOut?: boolean;
}

export function StatusPage({ title, description, showSignOut }: StatusPageProps) {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <Card className="max-w-sm p-6 text-center">
        <h1 className="mb-2 font-display text-lg font-semibold text-ink900">{title}</h1>
        <p className="mb-6 text-sm text-ink-500">{description}</p>
        {showSignOut ? (
          <Button variant="secondary" onClick={() => signOut()} className="w-full">
            Sair
          </Button>
        ) : (
          <Link to="/login" className="text-sm text-ink-600 hover:underline">
            Voltar para o login
          </Link>
        )}
      </Card>
    </div>
  );
}
