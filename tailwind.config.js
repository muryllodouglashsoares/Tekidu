/** @type {import('tailwindcss').Config} */

// Todas as cores abaixo são lidas de variáveis CSS (ver src/index.css),
// no formato "R G B" (canais separados por espaço). Isso permite:
//  1) Trocar Light/Dark Mode só mudando as variáveis, sem tocar em
//     nenhuma classe Tailwind usada nas páginas/componentes.
//  2) Continuar usando modificadores de opacidade do Tailwind, como
//     `bg-success/10` ou `bg-honors-400/20`, normalmente.
function cssVar(name) {
  return `rgb(var(${name}) / <alpha-value>)`;
}

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── NEUTROS ────────────────────────────────────────────────
        // Base da interface (o "neutros dominam" do guia de marca).
        // ink-50..600: textos secundários, bordas, fundos sutis.
        // ink-700..900: identidade AZUL (ações, navegação ativa, foco) —
        // ver seção "FUNÇÃO DO AZUL" do guia de marca.
        ink: {
          50: cssVar("--tk-ink-50"),
          100: cssVar("--tk-ink-100"),
          200: cssVar("--tk-ink-200"),
          300: cssVar("--tk-ink-300"),
          400: cssVar("--tk-ink-400"),
          500: cssVar("--tk-ink-500"),
          600: cssVar("--tk-ink-600"),
          700: cssVar("--tk-ink-700"), // azul — ação principal / identidade
          800: cssVar("--tk-ink-800"), // azul — hover
          900: cssVar("--tk-ink-900"), // azul — active/pressed
        },
        // Acento coral/vermelho — usado com contenção para estados de
        // "atenção" e selos, nunca como cor dominante.
        honors: {
          50: cssVar("--tk-honors-50"),
          100: cssVar("--tk-honors-100"),
          200: cssVar("--tk-honors-200"),
          300: cssVar("--tk-honors-300"),
          400: cssVar("--tk-honors-400"),
          500: cssVar("--tk-honors-500"),
          600: cssVar("--tk-honors-600"),
        },
        paper: cssVar("--tk-paper"), // fundo geral do app
        surface: cssVar("--tk-surface"), // cards, sidebar, header
        line: cssVar("--tk-line"), // bordas/divisores discretos
        ink900: cssVar("--tk-ink900"), // texto principal (neutro, não azul)

        // ── VERDE — EVOLUÇÃO ───────────────────────────────────────
        // "success" é a cor de evolução/progresso/sucesso do Tekidu
        // (ver seção "FUNÇÃO DO VERDE"). Mantido como DEFAULT para não
        // quebrar `bg-success`/`text-success` já usados no app, com
        // uma escala completa para gráficos, barras de progresso e
        // variações de estado.
        success: {
          DEFAULT: cssVar("--tk-success-500"),
          50: cssVar("--tk-success-50"),
          100: cssVar("--tk-success-100"),
          200: cssVar("--tk-success-200"),
          300: cssVar("--tk-success-300"),
          400: cssVar("--tk-success-400"),
          500: cssVar("--tk-success-500"),
          600: cssVar("--tk-success-600"),
          700: cssVar("--tk-success-700"),
        },
        danger: {
          DEFAULT: cssVar("--tk-danger-500"),
          50: cssVar("--tk-danger-50"),
          100: cssVar("--tk-danger-100"),
          500: cssVar("--tk-danger-500"),
          600: cssVar("--tk-danger-600"),
        },
        // Roxo — usado SOMENTE na Landing Page, para diferenciar o
        // perfil "Professor" dos outros dois perfis (Administrador =
        // azul, Aluno = verde). Não faz parte da identidade principal
        // do Tekidu nem deve ser usado na aplicação interna.
        violet: {
          DEFAULT: cssVar("--tk-violet-500"),
          400: cssVar("--tk-violet-400"),
          500: cssVar("--tk-violet-500"),
          600: cssVar("--tk-violet-600"),
        },
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
        // Display forte — usado só na Landing Page (headlines). Uma
        // grotesk bem encorpada, sem serifa e sem itálico: o oposto do
        // efeito "elegante/editorial" de escritório de advocacia.
        // O resto da plataforma continua 100% Inter.
        heading: ["'Space Grotesk'", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px", // Softer, rounder cards
      },
      boxShadow: {
        card: "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -1px rgb(0 0 0 / 0.03)",
      },
    },
  },
  plugins: [],
};
