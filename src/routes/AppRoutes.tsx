import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { FirstAccessPage } from "@/pages/auth/FirstAccessPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { MyBoletimPage } from "@/pages/boletim/MyBoletimPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { StatusPage } from "@/pages/StatusPage";

// A Landing Page é a única tela que usa framer-motion (camada de
// animação). Carregá-la sob demanda mantém a dependência fora do
// bundle principal do app — quem nunca visita "/" (ex.: acesso direto
// a "/login") não paga esse peso extra no download inicial.
const LandingPage = lazy(() =>
  import("@/pages/LandingPage").then((m) => ({ default: m.LandingPage }))
);

// ---------------------------------------------------------------------
// Code-splitting por role (Parte 2 do prompt de fechamento de gap +
// performance). Antes, só a Landing Page era lazy() — as ~30 páginas
// de dashboard (admin, Portal do Professor, Portal do Aluno) estavam
// todas no mesmo chunk principal: um aluno que só acessa
// "/meu-boletim" baixava também o código de TeachersPage, ClassesPage,
// ReportsPage etc., que ele nunca vai usar.
//
// Cada página abaixo agora é um chunk próprio, agrupado por quem
// efetivamente a acessa (o agrupamento aqui é só documentação — quem
// decide o chunk de fato é o `import()` de cada `lazy()`; páginas de
// grupos diferentes nunca compartilham chunk mesmo se importadas na
// mesma <Suspense>).
// ---------------------------------------------------------------------

// Grupo admin-only: única role com acesso à visão de escola inteira
// (ver NOTA DE SEGURANÇA mais abaixo — Etapa 7 fechou a Rule
// correspondente, então isto agora é reforçado nos dois níveis:
// rota E Firestore Rules).
const StudentsPage = lazy(() =>
  import("@/pages/students/StudentsPage").then((m) => ({ default: m.StudentsPage }))
);
// StudentProfilePage é compartilhada por DOIS grupos (admin em
// "/alunos/:studentId" e teacher em "/meus-alunos/:studentId") — o
// `lazy()` é declarado uma única vez aqui porque é o MÓDULO (e,
// portanto, o chunk) que deve ser único; usá-lo nas duas rotas não
// duplica o download, o navegador só busca o chunk uma vez.
const StudentProfilePage = lazy(() =>
  import("@/pages/students/StudentProfilePage").then((m) => ({
    default: m.StudentProfilePage,
  }))
);
const ClassesPage = lazy(() =>
  import("@/pages/classes/ClassesPage").then((m) => ({ default: m.ClassesPage }))
);
const DisciplinesPage = lazy(() =>
  import("@/pages/disciplines/DisciplinesPage").then((m) => ({
    default: m.DisciplinesPage,
  }))
);
const TeachersPage = lazy(() =>
  import("@/pages/teachers/TeachersPage").then((m) => ({ default: m.TeachersPage }))
);

// Grupo teacher-only: Portal do Professor (Etapa 4).
const MyClassesPage = lazy(() =>
  import("@/pages/teacherPortal/MyClassesPage").then((m) => ({
    default: m.MyClassesPage,
  }))
);
const MyStudentsPage = lazy(() =>
  import("@/pages/teacherPortal/MyStudentsPage").then((m) => ({
    default: m.MyStudentsPage,
  }))
);
const PerformancePage = lazy(() =>
  import("@/pages/teacherPortal/PerformancePage").then((m) => ({
    default: m.PerformancePage,
  }))
);

// Grupo student-only: Portal do Aluno (Etapa 3), exceto MyBoletimPage
// (ver justificativa na constante `dashboardFallback`/rota "/configuracoes"
// mais abaixo — mantida no bundle principal por decisão explícita).
const MyDisciplinesPage = lazy(() =>
  import("@/pages/studentPortal/MyDisciplinesPage").then((m) => ({
    default: m.MyDisciplinesPage,
  }))
);
const MyAttendancePage = lazy(() =>
  import("@/pages/studentPortal/MyAttendancePage").then((m) => ({
    default: m.MyAttendancePage,
  }))
);
const MyPerformancePage = lazy(() =>
  import("@/pages/studentPortal/MyPerformancePage").then((m) => ({
    default: m.MyPerformancePage,
  }))
);

// Grupo admin+teacher: Notas/Frequência/Boletim/Relatórios — nenhuma
// dessas telas é acessível a "student" (ver ProtectedRoute abaixo).
const NotesPage = lazy(() =>
  import("@/pages/notes/NotesPage").then((m) => ({ default: m.NotesPage }))
);
const AttendancePage = lazy(() =>
  import("@/pages/attendance/AttendancePage").then((m) => ({
    default: m.AttendancePage,
  }))
);
const BoletimPage = lazy(() =>
  import("@/pages/boletim/BoletimPage").then((m) => ({ default: m.BoletimPage }))
);
const ReportsPage = lazy(() =>
  import("@/pages/reports/ReportsPage").then((m) => ({ default: m.ReportsPage }))
);

// Fallback usado dentro do AppShell (sidebar/topo já montados pelo
// pai — ver `AppShell.tsx`, que renderiza <Outlet /> dentro de
// <main>). Diferente do fallback da Landing Page
// (<div className="min-h-screen bg-paper" />, que cobre a tela
// inteira porque a Landing ainda não tem AppShell nenhum), este
// cobre só a ÁREA DE CONTEÚDO: a sidebar e o header continuam
// renderizados normalmente por trás, então trocar de rota dentro do
// dashboard (ex.: "/dashboard" → "/alunos") nunca "pisca" a
// sidebar/topo — só o conteúdo principal mostra o fallback pelo
// instante em que o chunk da página está sendo baixado.
const dashboardPageFallback = <div className="min-h-[60vh] bg-paper" />;

/**
 * Estabelece UM boundary de Suspense para o grupo de rotas-filhas
 * aninhadas por baixo dela (via <Outlet />) — é isto que permite
 * "cada <Suspense> envolver o grupo de rotas correspondente, não a
 * AppRoutes inteira": cada grupo (admin/teacher/student/admin+teacher)
 * usa a sua própria instância desta rota-layout, então o loading de
 * uma página de um grupo nunca aparece por causa de uma navegação em
 * outro grupo.
 */
function SuspenseOutlet({ fallback }: { fallback: ReactNode }) {
  return (
    <Suspense fallback={fallback}>
      <Outlet />
    </Suspense>
  );
}

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

// DashboardPage/SettingsPage/MyBoletimPage NÃO viraram lazy() — decisão
// deliberada, não esquecimento:
// - DashboardPage ("/dashboard"): é a rota que TODA role acessa
//   IMEDIATAMENTE após o login/redirecionamento (`HomeRoute` acima) —
//   tornar essa a lazy() significaria trocar "app carrega, aparece o
//   dashboard" por "app carrega, aparece um fallback vazio, DEPOIS o
//   dashboard" para 100% dos usuários, na navegação mais comum do
//   sistema. O ganho de code-splitting só compensa para páginas que
//   uma fração dos usuários nunca visita — não é o caso desta.
// - SettingsPage ("/configuracoes"): acessível pela sidebar por
//   qualquer role (não é role-specific como os grupos acima), então
//   não participa de nenhum agrupamento "só uma role baixa este
//   código" — o code-splitting por role não se aplica a ela.
// - MyBoletimPage ("/meu-boletim"): pequena (bem menor que as demais
//   páginas do Portal do Aluno) e é, na prática, a segunda tela mais
//   visitada por um aluno logo após o Dashboard — o custo de mantê-la
//   no chunk principal é baixo e evita mais um Suspense fallback no
//   fluxo mais comum do Portal do Aluno.

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={<div className="min-h-screen bg-paper" />}>
            <LandingPage />
          </Suspense>
        }
      />
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
              NOTA DE SEGURANÇA (RESOLVIDA na Etapa 7): esta restrição
              era, até então, só de ROTA/UX (ver ProtectedRoute) — as
              Firestore Rules (firestore.rules) liberavam escrita de
              `classes`/`disciplines` para qualquer `isActiveStaff()`,
              incluindo "teacher", então um professor tecnicamente ainda
              podia editar essas coleções chamando o Firestore
              diretamente, fora desta UI. As Rules de `classes`/
              `disciplines` agora exigem `isActiveAdmin()` para
              create/update (mesmo padrão de menor privilégio já usado
              em assessments/grades/attendanceSessions/attendanceRecords
              via `canWriteAcademicRecord`/`isOwnDiscipline`) — a Rule
              deixou de depender só da UI para essa garantia. */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route element={<SuspenseOutlet fallback={dashboardPageFallback} />}>
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
          </Route>

          {/* Professores: cadastro de contas de login (Firebase Authentication),
              restrito a admin — mesma sensibilidade de "quem pode criar acessos"
              já documentada em firestore.rules para a coleção "users". */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route element={<SuspenseOutlet fallback={dashboardPageFallback} />}>
              <Route path="/professores" element={<TeachersPage />} />
            </Route>
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
            <Route element={<SuspenseOutlet fallback={dashboardPageFallback} />}>
              <Route path="/minhas-turmas" element={<MyClassesPage />} />
              <Route path="/meus-alunos" element={<MyStudentsPage />} />
              <Route path="/meus-alunos/:studentId" element={<StudentProfilePage />} />
              <Route path="/desempenho-turmas" element={<PerformancePage />} />
            </Route>
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
            <Route element={<SuspenseOutlet fallback={dashboardPageFallback} />}>
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
            {/* "/meu-boletim" fica FORA do SuspenseOutlet de propósito:
                MyBoletimPage não é lazy() (ver justificativa acima, junto
                de DashboardPage/SettingsPage) — não há nada aqui para o
                Suspense esperar. */}
            <Route path="/meu-boletim" element={<MyBoletimPage />} />
            <Route element={<SuspenseOutlet fallback={dashboardPageFallback} />}>
              <Route path="/minhas-disciplinas" element={<MyDisciplinesPage />} />
              <Route path="/minha-frequencia" element={<MyAttendancePage />} />
              <Route path="/meu-desempenho" element={<MyPerformancePage />} />
            </Route>
          </Route>

          <Route path="/configuracoes" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
