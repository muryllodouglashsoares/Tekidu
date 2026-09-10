# Acessibilidade na Tekidu

Este documento descreve a camada de acessibilidade implementada na Tekidu,
com o objetivo de manter conformidade com as boas práticas da **WCAG 2.2
nível AA**, e serve como guia para quem for construir novas telas.

## Visão geral

A acessibilidade foi implementada em duas frentes:

1. **Correções na origem** — componentes compartilhados (`Button`, `Input`,
   `Select`, `Textarea`, `Modal`, `MobileSheet`, `SortableTh`, tabelas,
   `DevelopmentLineChart`) foram corrigidos diretamente, o que já beneficia
   toda tela que os utiliza.
2. **Preferências do usuário** — um painel central (`AccessibilityPanel`)
   permite ajustar tamanho do texto, contraste, movimento e leitura,
   persistidas entre sessões.

## AccessibilityContext

`src/contexts/AccessibilityContext.tsx` segue o mesmo padrão do
`ThemeContext` já existente no projeto:

- Estado: `fontScale`, `highContrast`, `reducedMotion`, `readingMode`,
  `highlightLinks`, `increasedSpacing`.
- Persistência: `localStorage`, chave `tekidu-accessibility-settings`.
- Aplicação: os valores viram atributos `data-*` no elemento `<html>`
  (`data-font-scale`, `data-high-contrast` etc.), lidos por regras CSS em
  `src/index.css`. Um script inline em `index.html` aplica o valor salvo
  **antes** do React montar, evitando flash de conteúdo com as
  configurações padrão (mesma técnica já usada para o tema).
- Consumo: `useAccessibility()` dá acesso ao estado e aos `toggle*`;
  `usePrefersReducedMotion()` combina a escolha manual do usuário com
  `prefers-reduced-motion` do sistema operacional.

O painel (`src/components/accessibility/AccessibilityPanel.tsx`) é
construído sobre o `Modal` compartilhado — não é um componente de diálogo
próprio — e por isso herda automaticamente foco preso, fechamento com
`Esc` e restauração de foco. É aberto pelo botão "Abrir configurações de
acessibilidade" no cabeçalho (desktop e mobile).

## Gerenciamento de foco em diálogos

`src/hooks/useFocusTrap.ts` é o hook usado por `Modal` e `MobileSheet`
(e, por herança, pelo `AccessibilityPanel` e `ConfirmDialog`). Ele:

1. Move o foco para dentro do diálogo ao abrir (primeiro elemento com
   `data-autofocus`, senão o primeiro elemento focável).
2. Prende `Tab`/`Shift+Tab` dentro do diálogo enquanto aberto.
3. Restaura o foco para quem abriu o diálogo ao fechar.

Qualquer novo componente de diálogo/sheet deve reutilizar este hook em vez
de reimplementar o comportamento.

## Boas práticas para novas telas

### Botão
```tsx
<Button onClick={handleDelete}>Excluir aluno</Button>

// Ícone-apenas: sempre com aria-label e o ícone marcado aria-hidden
<button type="button" aria-label="Excluir aluno" onClick={handleDelete}>
  <Trash className="h-4 w-4" aria-hidden="true" />
</button>
```

### Campo de formulário
Use sempre `Input`/`Select`/`Textarea` (`src/components/ui/`) em vez de
elementos nativos soltos — eles já cuidam de `<label>`, `aria-invalid`,
`aria-describedby` e `role="alert"` no erro.

```tsx
<Input
  label="Nome completo"
  required
  error={errors.name}
  value={form.name}
  onChange={(e) => update("name", e.target.value)}
/>
```

### Modal
```tsx
<Modal title="Nova turma" onClose={onClose}>
  {/* primeiro campo pode receber data-autofocus para foco inicial específico */}
</Modal>
```
Não é necessário adicionar `role`, `aria-modal` ou gerenciamento de foco —
o `Modal` já cuida disso.

### Tabela
```tsx
<table className="w-full text-left text-sm">
  <caption className="sr-only">Alunos matriculados na turma</caption>
  <thead>
    <tr>
      <th scope="col">Aluno</th>
      <th scope="col">Situação</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Maria Silva</th>
      <td>Aprovado</td>
    </tr>
  </tbody>
</table>
```
Para colunas ordenáveis, use `SortableTh` (já cuida de `aria-sort`).

### Feedback (toast)
`useToast()` (`src/contexts/ToastContext.tsx`) já anuncia mensagens com
`role="status"`/`aria-live="polite"` (sucesso/info) ou `role="alert"`
(erro) — basta chamar `toast.success(...)` / `toast.error(...)`.

### Imagem / ícone
```tsx
// Informativa
<img src={photoUrl} alt="Foto do aluno" />

// Decorativa (a maioria dos ícones lucide-react ao lado de texto visível)
<Icon className="h-4 w-4" aria-hidden="true" />
```

### Link
Links de navegação usam `<a>`/`NavLink`; ações usam `<button>`. Nunca
`<div onClick>` para algo clicável.

## Preferências de acessibilidade e CSS

As regras vivem em `src/index.css`, na seção "PAINEL DE ACESSIBILIDADE".
Elas sobrescrevem os tokens de cor (`--tk-ink-*`, `--tk-line` etc.) já
usados pelo `tailwind.config.js`, em vez de duplicar regras por
componente — qualquer componente que já usa esses tokens se adapta
automaticamente ao alto contraste.

Se um novo componente introduzir uma cor fixa (fora dos tokens), ele não
vai reagir ao alto contraste — prefira sempre os tokens existentes.

## O que foi implementado (resumo)

- Contexto global de acessibilidade + painel (tamanho do texto 100–150%,
  alto contraste, destaque de links, reduzir animações, modo de leitura,
  espaçamento aumentado), persistido em `localStorage`.
- Skip link ("Pular para o conteúdo principal") + `<main id="main-content">`.
- Foco preso e restaurado em `Modal` e `MobileSheet`.
- `Input`/`Select`/`Textarea`: indicador de obrigatório, `aria-required`,
  erros com `role="alert"` e `aria-describedby`.
- Todas as tabelas do app: `<caption>` e `scope="col"/"row"`.
- `SortableTh`: `aria-sort` no `<th>`.
- `DevelopmentLineChart`: resumo textual + tabela de dados alternativa
  (`<details>`), além do `aria-label` do gráfico.
- Menu de ações do `AnnouncementCard`: `aria-haspopup`, `aria-expanded`,
  `role="menu"`/`"menuitem"`, fecha com `Esc` e devolve o foco.
- Abas do perfil do aluno: `role="tablist"`/`"tab"`/`aria-selected`.
- `Sidebar`: `<nav aria-label="Navegação principal">`.
- `EmptyState`: ícone decorativo com `aria-hidden`.

## Limitações conhecidas / próximos passos

- A auditoria cobriu os componentes compartilhados e as telas de maior
  uso; formulários de negócio mais específicos (ex.: filtros avançados de
  relatórios) ainda usam validação genérica por `role="alert"` no rodapé
  do formulário, sem marcar individualmente cada campo inválido.
- Recomenda-se rodar `axe DevTools` ou Lighthouse periodicamente e, se o
  projeto adotar `eslint-plugin-jsx-a11y`, integrá-lo ao `npm run lint`
  para pegar regressões automaticamente.
- Teste manual com leitor de tela (NVDA/VoiceOver) e os 4 níveis de
  tamanho de texto em conjunto com o alto contraste é recomendado antes
  de cada release maior.
