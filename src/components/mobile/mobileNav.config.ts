import {
  LayoutDashboard,
  Users,
  School,
  BookOpen,
  GraduationCap,
  ClipboardList,
  CalendarCheck,
  FileText,
  BarChart3,
  LineChart,
  Megaphone,
  CalendarDays,
  MessageCircle,
  Settings,
  Moon,
  LogOut,
} from "lucide-react";
import type { UserRole } from "@/types/user";

export interface MobileNavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Rotas-filha que também devem manter este item ativo (ex.: "/alunos/:id"). */
  matchPrefix?: string;
}

export interface MobileMoreSection {
  title: string;
  items: MobileNavItem[];
}

/**
 * Bottom Navigation: NÃO é a Sidebar inteira dentro de um componente
 * fixo — é uma seleção deliberada dos destinos mais usados por cada
 * role (ver regra "A Bottom Navigation NÃO deve conter todos os itens
 * da Sidebar" do briefing mobile). O quinto slot é sempre "Mais"
 * (adicionado pelo componente, não listado aqui), que abre o restante
 * organizado por categoria — ver `MOBILE_MORE_SECTIONS`.
 */
export const MOBILE_BOTTOM_NAV: Record<UserRole, MobileNavItem[]> = {
  admin: [
    { to: "/dashboard", label: "Início", icon: LayoutDashboard },
    { to: "/alunos", label: "Alunos", icon: Users },
    { to: "/turmas", label: "Turmas", icon: School },
    { to: "/boletim", label: "Acadêmico", icon: FileText },
  ],
  teacher: [
    { to: "/dashboard", label: "Início", icon: LayoutDashboard },
    { to: "/minhas-turmas", label: "Turmas", icon: School },
    { to: "/notas", label: "Notas", icon: ClipboardList },
    { to: "/frequencia", label: "Frequência", icon: CalendarCheck },
  ],
  student: [
    { to: "/dashboard", label: "Início", icon: LayoutDashboard },
    { to: "/meu-boletim", label: "Boletim", icon: FileText },
    { to: "/meu-desempenho", label: "Desempenho", icon: LineChart },
    { to: "/calendario", label: "Calendário", icon: CalendarDays },
  ],
  // Portal do Responsável (Fase 2/3 do plano de evolução): só 3
  // destinos reais existem (Início/Boletim/Frequência) — diferente
  // dos outros grupos, não há um quarto item natural para preencher o
  // slot (Mensagens não se aplica a esta role, ver Sidebar.tsx).
  guardian: [
    { to: "/portal-responsavel", label: "Início", icon: LayoutDashboard },
    { to: "/portal-responsavel/boletim", label: "Boletim", icon: FileText },
    { to: "/portal-responsavel/frequencia", label: "Frequência", icon: CalendarCheck },
  ],
};

/**
 * Conteúdo do item "Mais": tudo o que não coube na Bottom Navigation,
 * organizado por categoria (Acadêmico/Organização/Conta), igual à
 * estrutura sugerida no briefing. "Conta" é fixo e resolvido pelo
 * componente (não listado aqui) porque inclui ações (tema, sair) e
 * não apenas navegação.
 */
export const MOBILE_MORE_SECTIONS: Record<UserRole, MobileMoreSection[]> = {
  admin: [
    {
      title: "Acadêmico",
      items: [
        { to: "/disciplinas", label: "Disciplinas", icon: BookOpen },
        { to: "/professores", label: "Professores", icon: GraduationCap },
        { to: "/notas", label: "Notas", icon: ClipboardList },
        { to: "/frequencia", label: "Frequência", icon: CalendarCheck },
        { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
      ],
    },
    {
      title: "Organização",
      items: [
        { to: "/calendario", label: "Calendário", icon: CalendarDays },
        { to: "/avisos", label: "Avisos", icon: Megaphone },
      ],
    },
  ],
  teacher: [
    {
      title: "Acadêmico",
      items: [
        { to: "/meus-alunos", label: "Meus Alunos", icon: Users },
        { to: "/boletim", label: "Boletim", icon: FileText },
        { to: "/desempenho-turmas", label: "Desempenho das Turmas", icon: LineChart },
        { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
      ],
    },
    {
      title: "Comunicação",
      items: [
        { to: "/mensagens", label: "Mensagens", icon: MessageCircle },
      ],
    },
    {
      title: "Organização",
      items: [
        { to: "/calendario", label: "Calendário", icon: CalendarDays },
        { to: "/avisos", label: "Avisos", icon: Megaphone },
      ],
    },
  ],
  student: [
    {
      title: "Acadêmico",
      items: [
        { to: "/minhas-disciplinas", label: "Minhas Disciplinas", icon: BookOpen },
        { to: "/minha-frequencia", label: "Minha Frequência", icon: CalendarCheck },
      ],
    },
    {
      title: "Comunicação",
      items: [
        { to: "/mensagens", label: "Mensagens", icon: MessageCircle },
      ],
    },
    {
      title: "Organização",
      items: [{ to: "/avisos", label: "Avisos", icon: Megaphone }],
    },
  ],
  // Portal do Responsável: os 3 destinos reais já estão na Bottom
  // Navigation (ver acima) — "Mais" mostra só a seção fixa "Conta"
  // (Configurações/Tema/Sair, adicionada pelo componente).
  guardian: [],
};

// Reaproveitados pelo componente para montar a seção fixa "Conta".
export const MOBILE_ACCOUNT_NAV_ITEM: MobileNavItem = {
  to: "/configuracoes",
  label: "Configurações",
  icon: Settings,
};

export const MOBILE_THEME_ICON = Moon;
export const MOBILE_SIGN_OUT_ICON = LogOut;
