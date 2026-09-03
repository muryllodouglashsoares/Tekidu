import { ArrowLeft, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useAuth } from "@/contexts/AuthContext";

interface RouteMeta {
  title: string;
  /** Linha contextual abaixo do título — estática ou calculada a partir do primeiro nome do usuário. */
  subtitle?: string | ((firstName: string) => string);
  /** Rota "pai" para o botão de voltar quando esta entrada é uma página de detalhe (ex.: "/alunos/:id"). */
  backTo?: string;
  backLabel?: string;
}

// Mesmas rotas da Sidebar/AppRoutes — ver "HEADER INTELIGENTE" no
// briefing: cada tela tem um título+contexto próprio, não um cabeçalho
// genérico repetido. Ordenado por especificidade (rotas mais longas
// primeiro) para o `find` de prefixo abaixo resolver corretamente.
const ROUTE_META: [string, RouteMeta][] = [
  ["/alunos/", { title: "Detalhes do Aluno", backTo: "/alunos", backLabel: "Alunos" }],
  ["/meus-alunos/", { title: "Detalhes do Aluno", backTo: "/meus-alunos", backLabel: "Meus Alunos" }],
  ["/dashboard", { title: "Início", subtitle: (name) => `Olá, ${name}` }],
  ["/alunos", { title: "Alunos", subtitle: "Gestão de alunos da escola" }],
  ["/turmas", { title: "Turmas", subtitle: "Gestão de turmas" }],
  ["/disciplinas", { title: "Disciplinas", subtitle: "Gestão de disciplinas" }],
  ["/professores", { title: "Professores", subtitle: "Contas de acesso de professores" }],
  ["/minhas-turmas", { title: "Minhas Turmas" }],
  ["/meus-alunos", { title: "Meus Alunos" }],
  ["/desempenho-turmas", { title: "Desempenho", subtitle: "Evolução das suas turmas" }],
  ["/notas", { title: "Notas", subtitle: "Lançamento de notas" }],
  ["/frequencia", { title: "Frequência", subtitle: "Registro de frequência" }],
  ["/boletim", { title: "Boletim" }],
  ["/relatorios", { title: "Relatórios", subtitle: "Indicadores acadêmicos" }],
  ["/meu-boletim", { title: "Meu Boletim" }],
  ["/minhas-disciplinas", { title: "Minhas Disciplinas" }],
  ["/minha-frequencia", { title: "Minha Frequência" }],
  ["/meu-desempenho", { title: "Meu Desempenho" }],
  ["/calendario", { title: "Calendário", subtitle: "Calendário acadêmico" }],
  ["/avisos", { title: "Avisos" }],
  ["/configuracoes", { title: "Configurações" }],
];

function resolveMeta(pathname: string): RouteMeta {
  const match = ROUTE_META.find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : { title: "Tekidu" };
}

interface MobileHeaderProps {
  onOpenSearch: () => void;
}

/**
 * Header compacto e contextual para smartphones (ver "HEADER MOBILE"
 * no briefing) — troca o par "botão de menu + título fixo" do topo
 * antigo por: botão de voltar quando a rota é uma página de detalhe,
 * ou título + subtítulo contextual quando é uma página de primeiro
 * nível (a navegação principal já é a Bottom Navigation, então este
 * cabeçalho nunca mais precisa abrir uma sidebar).
 */
export function MobileHeader({ onOpenSearch }: MobileHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const meta = resolveMeta(location.pathname);
  const firstName = profile?.name?.split(" ")[0] ?? "";
  const subtitle = typeof meta.subtitle === "function" ? meta.subtitle(firstName) : meta.subtitle;

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 pb-3 backdrop-blur md:hidden"
      style={{ paddingTop: "calc(var(--tk-safe-top) + 0.75rem)" }}
    >

      <div className="flex min-w-0 items-center gap-3">
        {meta.backTo && (
          <button
            type="button"
            aria-label={meta.backLabel ? `Voltar para ${meta.backLabel}` : "Voltar"}
            onClick={() => navigate(meta.backTo!)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-600 hover:bg-ink-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-bold text-ink900">{meta.title}</h1>
          {subtitle && <p className="truncate text-xs text-ink-500">{subtitle}</p>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Buscar"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink-500 shadow-sm hover:text-ink-700"
        >
          <Search className="h-4 w-4" />
        </button>
        <NotificationCenter />
      </div>
    </header>
  );
}
