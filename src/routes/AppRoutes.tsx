import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
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
import { MyBoletimPage } from "@/pages/boletim/MyBoletimPage";
import { ReportsPage } from "@/pages/reports/ReportsPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { StatusPage } from "@/pages/StatusPage";

/**
 * Rota "/": Dashboard para admin/teacher (comportamento 100%
 * preservado), mas redireciona para "/meu-boletim" quando a role é
 * "student" (Tarefa 3, Fase 1 pós-auditoria V8).
 *
 * POR QUÊ: `DashboardPage` consulta `getStudents()`/`getAcademicOverview`
 * sem nenhum escopo por aluno — consultas que a Security Rule nega
 * por inteiro para a role "student" (uma query `list` sem filtro por
 * `uid`/`studentId` não é "provável" de estar restrita ao próprio
 * aluno, então o Firestore recusa a operação toda). Reescrever o
 * Dashboard para ter uma variante por aluno está fora do escopo desta
 * tarefa (ver "O que não fazer"); redirecionar para a tela que já é o
 * equivalente funcional para o aluno (visão do próprio desempenho) é
 * a correção mínima que evita esse erro sem tocar em `DashboardPage.tsx`.
 */
function HomeRoute() {
  const { profile } = useAuth();
  if (profile?.role === "student") {
    return <Navigate to="/meu-boletim" replace />;
  }
  return <DashboardPage />;
}

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
          <Route path="/" element={<HomeRoute />} />

          {/* Alunos/Turmas/Disciplinas: restritas a admin/teacher desde a
              Tarefa 3 (Fase 1 pós-auditoria V8). Antes, estas rotas não
              tinham `allowedRoles` — inofensivo enquanto a role "student"
              não tinha contas reais (Tarefa 2), mas passaria a quebrar
              (erro de permissão do Firestore) assim que um aluno logasse,
              já que `getStudents()`/`getClasses()`/`getDisciplines()`
              aqui são consultas SEM escopo por aluno. O aluno tem sua
              própria visão em "/meu-boletim", abaixo. */}
          <Route element={<ProtectedRoute allowedRoles={["admin", "teacher"]} />}>
            <Route path="/alunos" element={<StudentsPage />} />
            <Route path="/turmas" element={<ClassesPage />} />
            <Route path="/disciplinas" element={<DisciplinesPage />} />
          </Route>

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
              alunos não lançam a própria frequência (ver firestore.rules:
              a role "student" só tem LEITURA escopada ao próprio registro
              em attendanceRecords, nunca escrita). */}
          <Route element={<ProtectedRoute allowedRoles={["admin", "teacher"]} />}>
            <Route path="/notas" element={<NotesPage />} />
            <Route path="/frequencia" element={<AttendancePage />} />
            {/* Boletim (visão de staff: Turma → Aluno, escolhe qualquer
                aluno): consolida Notas + Frequência, então segue a mesma
                restrição de acesso das duas. A visão do PRÓPRIO aluno é
                "/meu-boletim" (Tarefa 3), abaixo — somente leitura, sem
                escolher "qual aluno". */}
            <Route path="/boletim" element={<BoletimPage />} />
            {/* Relatórios: consolida Notas + Frequência em visão analítica
                (gráficos/indicadores), então segue a mesma restrição de
                acesso do Boletim — ver firestore.rules. */}
            <Route path="/relatorios" element={<ReportsPage />} />
          </Route>

          {/* Meu Boletim (Tarefa 3, Fase 1 pós-auditoria V8): Portal do
              Aluno, restrito à role "student" — somente leitura do
              PRÓPRIO boletim/frequência, sem formulário de edição (ver
              MyBoletimPage). Não reaproveita "/boletim" porque aquela
              tela exige escolher turma→aluno manualmente (uso de staff);
              aqui o aluno é resolvido automaticamente pelo `uid` logado. */}
          <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
            <Route path="/meu-boletim" element={<MyBoletimPage />} />
          </Route>

          <Route path="/configuracoes" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
