# Paleta de cores do Tekidu — como usar

Este documento resume como o ajuste de paleta pedido em
"Ajuste importante — Paleta de cores e aplicação na plataforma" foi
implementado no código, para servir de referência ao continuar
desenvolvendo novas telas.

## Como funciona

As cores **não** são mais valores fixos espalhados pelo Tailwind. Elas
vêm de variáveis CSS definidas em `src/index.css` (`:root` para Light
Mode, `.dark` para Dark Mode) e são referenciadas em
`tailwind.config.js`. Isso significa que:

- Você continua usando as mesmas classes de sempre: `bg-surface`,
  `text-ink900`, `border-line`, `bg-ink-700`, `text-success`,
  `bg-honors-400/20`, etc.
- Trocar entre Light e Dark Mode é automático em qualquer componente
  novo, sem precisar escrever `dark:` em cada classe.
- Modificadores de opacidade do Tailwind continuam funcionando
  normalmente (`bg-success/10`, `bg-danger/10`, `bg-honors-400/20`...).

## O que cada token significa

| Classe | Papel | Regra do guia de marca |
|---|---|---|
| `bg-paper` | Fundo geral do app | Neutro — base da interface |
| `bg-surface` | Cards, sidebar, header, modais | Neutro — superfícies |
| `border-line` | Bordas e divisores | Neutro — discreto |
| `text-ink900` | Texto principal | Neutro — nunca azul/verde |
| `text-ink-400/500/600` | Textos secundários, labels, ícones | Neutro |
| `bg-ink-700` / `text-ink-700` | Ação principal, item de navegação ativo, links, foco | **Azul — identidade** |
| `bg-ink-800` | Hover do azul | **Azul — identidade** |
| `bg-ink-900` | Active/pressed do azul | **Azul — identidade** |
| `text-success` / `bg-success` | Evolução, progresso, sucesso, indicador positivo | **Verde — evolução** |
| `success-50` … `success-700` | Variações de verde para gráficos e estados | **Verde — evolução** |
| `text-danger` / `bg-danger` | Erro, estado crítico | Vermelho (uso pontual) |
| `honors-*` | Acento de "atenção" (ex.: frequência em alerta) | Coral — usado com contenção |

## Regra de ouro (não é sobre código, é sobre decisão de design)

> **Neutros constroem a interface. Azul constrói a identidade. Verde
> representa a evolução.**

Antes de colorir um novo componente, pergunte:

1. É estrutura, texto ou fundo? → `ink-50…600` / `paper` / `surface` / `line` / `ink900`.
2. É uma ação, algo selecionado/ativo, um link ou o ponto de foco? → `ink-700/800/900` (azul).
3. É progresso, desempenho positivo, conclusão? → `success` (verde).
4. Evite preencher grandes áreas (fundos inteiros de seção, cards
   inteiros) com azul ou verde — eles devem aparecer como pontos de
   atenção, não como cor de fundo dominante.

## Dark Mode

- Ativado por classe (`darkMode: "class"`), controlado por
  `src/contexts/ThemeContext.tsx` (`useTheme()` expõe `theme` e
  `toggleTheme`).
- Preferência salva em `localStorage` (`tekidu-theme`); sem preferência
  salva, respeita `prefers-color-scheme` do sistema.
- Botão de alternância já disponível no cabeçalho do app
  (`AppShell`) e na tela de login (`LoginPage`).
- No Dark Mode o fundo continua grafite/neutro — azul e verde só
  ficam um pouco mais claros para manter contraste, mas não viram cor
  de fundo (ver comentário em `src/index.css`).

## Onde ajustar os valores

Só em um lugar: os blocos `:root` e `.dark` no topo de
`src/index.css`. Qualquer alteração de tom de azul/verde/neutros feita
ali se propaga para toda a plataforma (Landing Page, Login, Dashboard,
Sidebar, Navbar, tabelas, gráficos, cards, formulários, notificações e
componentes) automaticamente.
