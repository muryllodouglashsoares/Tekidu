import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { StudentsPage } from "@/pages/students/StudentsPage";
import { ClassesPage } from "@/pages/classes/ClassesPage";
import { DisciplinesPage } from "@/pages/disciplines/DisciplinesPage";
import { StatusPage } from "@/pages/StatusPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/esqueci-a-senha" element={<ForgotPasswordPage />} />

      <Route
        path="/sem-perfil"
        element={
          <StatusPage
            title="Perfil não encontrado"
            description="Sua conta foi autenticada, mas ainda não possui um perfil configurado. Fale com um administrador."
            showSignOut
          />
        }
      />
      <Route
        path="/conta-desativada"
        element={
          <StatusPage
            title="Conta desativada"
            description="Sua conta foi desativada. Entre em contato com a administração da escola."
            showSignOut
          />
        }
      />
      <Route
        path="/nao-autorizado"
        element={
          <StatusPage
            title="Acesso não autorizado"
            description="Você não tem permissão para acessar esta página."
            showSignOut
          />
        }
      />

      {/* Rotas protegidas: exigem sessão ativa + perfil válido.
          Todas compartilham o AppShell (sidebar + topo), preservando a
          navegação do protótipo do Figma. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/alunos" element={<StudentsPage />} />
          <Route path="/turmas" element={<ClassesPage />} />

          <Route path="/disciplinas" element={<DisciplinesPage />} />

          {/* Seções ainda não implementadas nesta fase — mesmo texto
              "em desenvolvimento" do protótipo do Figma. */}
          <Route path="/notas" element={<PlaceholderPage title="Notas" />} />
          <Route path="/frequencia" element={<PlaceholderPage title="Frequência" />} />
          <Route path="/boletim" element={<PlaceholderPage title="Boletim" />} />
          <Route path="/relatorios" element={<PlaceholderPage title="Relatórios" />} />
          <Route path="/configuracoes" element={<PlaceholderPage title="Configurações" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
