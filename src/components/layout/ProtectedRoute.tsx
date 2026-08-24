import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/Spinner";
import type { UserRole } from "@/types/user";

interface ProtectedRouteProps {
  /**
   * Se informado, restringe a rota às roles listadas.
   * Se omitido, qualquer usuário autenticado com perfil válido acessa.
   */
  allowedRoles?: UserRole[];
}

/**
 * IMPORTANTE — leia a seção "A segurança NÃO deve depender apenas do
 * frontend" na explicação que acompanha este código.
 *
 * Este componente evita que a INTERFACE seja renderizada para quem não
 * deveria vê-la. Ele NÃO é, por si só, uma barreira de segurança: um
 * usuário mal-intencionado pode ler dados diretamente via requisições
 * ao Firestore, contornando completamente o React. A barreira real
 * está nas Firestore Security Rules (firestore.rules), que são
 * aplicadas pelo servidor do Firebase e não podem ser burladas pelo
 * cliente. Trate este componente como UX, não como segurança.
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { firebaseUser, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spinner label="Verificando sessão..." />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!profile) {
    // Autenticado, mas sem documento users/{uid} — não sabemos a role,
    // então não é seguro liberar nenhuma área protegida.
    return <Navigate to="/sem-perfil" replace />;
  }

  if (!profile.active) {
    return <Navigate to="/conta-desativada" replace />;
  }

  // Etapa 9 — ciclo de vida de conta estilo SUAP: enquanto a conta
  // ainda estiver com a senha temporária (`mustSetPassword: true`),
  // NENHUMA outra tela pode ser liberada, mesmo que o usuário tente
  // navegar direto para a URL de outra página — a única exceção é a
  // própria "/primeiro-acesso". O caminho inverso (usuário já concluiu
  // o primeiro acesso mas tenta voltar manualmente para
  // "/primeiro-acesso") é tratado dentro de `FirstAccessPage`, não
  // aqui, para não duplicar a lista de rotas permitidas.
  if (profile.mustSetPassword && location.pathname !== "/primeiro-acesso") {
    return <Navigate to="/primeiro-acesso" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/nao-autorizado" replace />;
  }

  return <Outlet />;
}
