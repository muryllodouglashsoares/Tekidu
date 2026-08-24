import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { FirstAccessPage } from "@/pages/auth/FirstAccessPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { StudentsPage } from "@/pages/students/StudentsPage";
import { StudentProfilePage } from "@/pages/students/StudentProfilePage";
import { ClassesPage } from "@/pages/classes/ClassesPage";
import { DisciplinesPage } from "@/pages/disciplines/DisciplinesPage";
import { TeachersPage } from "@/pages/teachers/TeachersPage";
import { NotesPage } from "@/pages/notes/NotesPage";
import { AttendancePage } from "@/pages/attendance/AttendancePage";
import { BoletimPage } from "@/pages/boletim/BoletimPage";
import { MyBoletimPage } from "@/pages/boletim/MyBoletimPage";
import { ReportsPage } from "@/pages/reports/ReportsPage";
import { MyClassesPage } from "@/pages/teacherPortal/MyClassesPage";
import { MyStudentsPage } from "@/pages/teacherPortal/MyStudentsPage";
import { PerformancePage } from "@/pages/teacherPortal/PerformancePage";
import { MyDisciplinesPage } from "@/pages/studentPortal/MyDisciplinesPage";
import { MyAttendancePage } from "@/pages/studentPortal/MyAttendancePage";
import { MyPerformancePage } from "@/pages/studentPortal/MyPerformancePage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { StatusPage } from "@/pages/StatusPage";

/**
 * Rota "/dashboard": Dashboard para todas as roles.
 *
 * HISTÓRICO: esta função redirecionava alunos para "/meu-boletim"
 * porque, quando foi escrita, `DashboardPage` ainda buscava
 * `getStudents()`/`getAcademicOverview()` sem nenhum escopo por aluno
 * — consultas que a Security Rule nega por inteiro para a role
 * "student". Isso mudou: `DashboardPage` agora decide qual componente
 * renderizar (`AdminDashboard`/`TeacherDashboard`/`StudentDashboard`)
 * ANTES de qualquer busca, e `StudentDashboard` só usa
 * `getStudentByUid`/`getStudentBoletim` (ambas liberadas ao próprio
 * aluno pela Security Rule — ver `isOwnStudentRecord`). Redirecionar
 * o aluno para longe de "/" deixava o Dashboard próprio dele
 * (seção 7 do plano multi-role — saudação, média, frequência,
 * disciplinas, notificações) inacessível, mesmo já implementado.
 */
function HomeRoute() {
  return <DashboardPage />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
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
        {/* Etapa 9 — ciclo de vida de conta estilo SUAP: "/primeiro-acesso"
            fica FORA do AppShell de propósito (sem sidebar/topo) — é um
            passo bloqueante antes de "entrar" no sistema, não mais uma
            tela do dashboard. `ProtectedRoute` (acima) já garante que
            nenhuma outra rota é alcançável enquanto
            `profile.mustSetPassword === true`. */}
        <Route path="/primeiro-acesso" element={<FirstAccessPage />} />

        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<HomeRoute />} />

          {/* Alunos/Turmas/Disciplinas: visão de STAFF com edição —
              restrita a admin (decisão tomada após a Etapa 4: agora que
              o Portal do Professor está validado, o professor usa
              EXCLUSIVAMENTE suas rotas escopadas "/minhas-turmas",
              "/meus-alunos" e "/desempenho-turmas" — nunca mais a visão
              de escola inteira, que permitia editar qualquer turma/aluno
              fora de suas disciplinas. Só o admin continua com acesso
              irrestrito ao sistema.
              NOTA DE SEGURANÇA (a aprofundar na Etapa 7): esta restrição
              é só de ROTA/UX (ver ProtectedRoute) — as Firestore Rules
              (firestore.rules) hoje ainda liberam leitura/escrita destas
              coleções para qualquer `isActiveStaff()`, incluindo
              "teacher". Enquanto essa regra não for revista, um professor
              tecnicamente ainda poderia editar `classes`/`disciplines`
              chamando o Firestore diretamente, fora desta UI — a
              consolidação da regra (torná-la `isAdmin()`-only) é o
              próximo passo pendente da Etapa 7. */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/alunos" element={<StudentsPage />} />
            {/* Perfil 360° (Fase 8): central acadêmica de UM aluno —
                identificação, resumo, notas por disciplina, desenvolvimento
                e frequência. Mesma restrição de acesso de "/alunos" (é
                alcançado a partir de lá). O professor tem o EQUIVALENTE
                escopado em "/meus-alunos/:studentId", abaixo. */}
            <Route path="/alunos/:studentId" element={<StudentProfilePage />} />
            <Route path="/turmas" element={<ClassesPage />} />
            <Route path="/disciplinas" element={<DisciplinesPage />} />
          </Route>

          {/* Professores: cadastro de contas de login (Firebase Authentication),
              restrito a admin — mesma sensibilidade de "quem pode criar acessos"
              já documentada em firestore.rules para a coleção "users". */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/professores" element={<TeachersPage />} />
          </Route>

          {/* Portal do Professor — "Minhas Turmas"/"Meus Alunos" (Etapa 4
              do plano multi-role): restritas à role "teacher", somente
              leitura, sempre escopadas ao próprio `profile.uid` dentro
              de `teacherOverviewService` (nunca à escola inteira). Desde
              a restrição de "/alunos" a admin, estas rotas passaram a
              ser o ÚNICO caminho do professor até dados de aluno/turma —
              "/meus-alunos/:studentId" é o equivalente escopado do
              Perfil 360° de staff (StudentProfilePage), com verificação
              de que o aluno pertence a uma disciplina do professor
              logado antes de renderizar (ver StudentProfilePage).
              "/desempenho-turmas" (Etapa 4b) completa o Portal do
              Professor: compara as turmas do professor entre si e
              mostra a evolução por bimestre de cada uma. */}
          <Route element={<ProtectedRoute allowedRoles={["teacher"]} />}>
            <Route path="/minhas-turmas" element={<MyClassesPage />} />
            <Route path="/meus-alunos" element={<MyStudentsPage />} />
            <Route path="/meus-alunos/:studentId" element={<StudentProfilePage />} />
            <Route path="/desempenho-turmas" element={<PerformancePage />} />
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

          {/* Portal do Aluno (Etapa 3 do plano multi-role): "Meu
              Boletim" (Tarefa 3, Fase 1 pós-auditoria V8) + "Minhas
              Disciplinas"/"Minha Frequência"/"Meu Desempenho" — todas
              restritas à role "student", somente leitura do PRÓPRIO
              aluno (resolvido pelo `uid` logado via `useOwnStudent`,
              nunca escolhido manualmente). Não reaproveitam
              "/boletim"/"/notas"/"/frequencia" porque aquelas telas
              exigem escolher turma→aluno manualmente (uso de staff). */}
          <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
            <Route path="/meu-boletim" element={<MyBoletimPage />} />
            <Route path="/minhas-disciplinas" element={<MyDisciplinesPage />} />
            <Route path="/minha-frequencia" element={<MyAttendancePage />} />
            <Route path="/meu-desempenho" element={<MyPerformancePage />} />
          </Route>

          <Route path="/configuracoes" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
