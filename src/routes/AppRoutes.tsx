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
import { TeachersPage } from "@/pages/teachers/TeachersPage";
import { NotesPage } from "@/pages/notes/NotesPage";
import { AttendancePage } from "@/pages/attendance/AttendancePage";
import { BoletimPage } from "@/pages/boletim/BoletimPage";
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

          {/* Professores: cadastro de contas de login (Firebase Authentication),
              restrito a admin — mesma sensibilidade de "quem pode criar acessos"
              já documentada em firestore.rules para a coleção "users". */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/professores" element={<TeachersPage />} />
          </Route>

          {/* Notas: restrita a admin/teacher (alunos não devem ter acesso
              ao lançamento de notas — ver ProtectedRoute). As demais
              seções abaixo ainda não implementadas nesta fase seguem o
              mesmo texto "em desenvolvimento" do protótipo do Figma. */}
          {/* Frequência: mesma restrição de acesso de Notas (admin/teacher) —
              alunos ainda não têm uma visão própria da frequência nesta
              fase (ver firestore.rules). */}
          <Route element={<ProtectedRoute allowedRoles={["admin", "teacher"]} />}>
            <Route path="/notas" element={<NotesPage />} />
            <Route path="/frequencia" element={<AttendancePage />} />
            {/* Boletim: consolida Notas + Frequência, então segue a mesma
                restrição de acesso das duas (ver firestore.rules — a role
                "student" ainda não tem leitura de students/grades/
                attendanceRecords nesta fase; visão própria do aluno é
                trabalho futuro). */}
            <Route path="/boletim" element={<BoletimPage />} />
          </Route>
          <Route path="/relatorios" element={<PlaceholderPage title="Relatórios" />} />
          <Route path="/configuracoes" element={<PlaceholderPage title="Configurações" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
