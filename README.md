<div align="center">

# 🎓 Tekidu

### Visualizando a evolução acadêmica.

Plataforma de gestão e acompanhamento acadêmico com experiências dedicadas para **administradores, professores, estudantes e responsáveis**.

<br />

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-11-FFCA28?style=for-the-badge&logo=firebase)
![Tests](https://img.shields.io/badge/Tests-Vitest-6E9F18?style=for-the-badge&logo=vitest)
[![Demo](https://img.shields.io/badge/demo-tekidu.pages.dev-2ea44f?style=for-the-badge&logo=cloudflare)](https://tekidu.pages.dev)

<br />

<a href="#sobre">Sobre</a> • <a href="#principais-funcionalidades">Funcionalidades</a> • <a href="#capturas-de-tela">Capturas de tela</a> • <a href="#diferenciais-técnicos">Diferenciais</a> • <a href="#tecnologias">Tecnologias</a> • <a href="#instalação">Instalação</a> • <a href="https://tekidu.pages.dev">Demo</a>

</div>

---

## Sobre

A **Tekidu** centraliza informações acadêmicas — notas, frequência, boletim, turmas e comunicados — em um único ambiente, no lugar de planilhas e sistemas dispersos.

A plataforma possui quatro experiências distintas, cada uma com permissões e telas próprias:

| Perfil | Foco |
|---|---|
| 👨‍💼 **Administrador** | Gestão de estudantes, professores, turmas, disciplinas e avisos |
| 👨‍🏫 **Professor** | Turmas, avaliações, lançamento de notas e frequência |
| 👨‍🎓 **Estudante** | Boletim, desempenho, frequência, justificativas de falta, mensagens e avisos, com acesso restrito aos próprios dados |
| 👪 **Responsável** | Consulta de boletim e frequência dos estudantes vinculados (somente leitura) |

---

## Principais funcionalidades

- **Autenticação completa** — login, primeiro acesso (com e-mail transacional via EmailJS) e recuperação de senha, tudo via Firebase Authentication.
- **Gestão acadêmica** — estudantes, professores, turmas, disciplinas e avaliações, com CRUDs completos para o perfil admin.
- **Notas e boletim** — lançamento de avaliações, cálculo de médias e boletim consolidado por estudante.
- **Frequência** — registro de sessões, presença/ausência e histórico por período.
- **Justificativas de falta** — o estudante envia a justificativa com documento comprobatório (imagem ou PDF) e admin/professor analisam.
- **Mensagens** — conversas entre professores e estudantes.
- **Exportação** — boletim em PDF e exportações em Excel/PDF de frequência e relatórios.
- **Relatórios e desempenho** — indicadores acadêmicos por estudante e por turma.
- **Avisos, notificações e calendário acadêmico** — comunicação centralizada, com central de notificações dedicada.
- **Command Palette** — navegação rápida por atalhos de teclado.
- **PWA e Web Push** — instalável, com Service Worker; o envio de push depende de variáveis de ambiente na Cloudflare Pages (ver [docs/PUSH_NOTIFICATIONS.md](./docs/PUSH_NOTIFICATIONS.md)).
- **Painel de acessibilidade** — preferências de texto, contraste e movimento (ver [docs/ACCESSIBILITY.md](./docs/ACCESSIBILITY.md)).
- **UX mobile dedicada** — bottom navigation, sheets e FAB próprios para telas pequenas (não apenas CSS responsivo).
- **Dark mode** — tema claro/escuro via tokens de design em CSS variables.

---

## Capturas de tela

<div align="center">

| Landing Page | Login | Dashboard |
|---|---|---|
| ![Landing Page](./docs/screenshots/landing-page.png) | ![Login](./docs/screenshots/login.png) | ![Dashboard](./docs/screenshots/dashboard.png) |

| Boletim | Avisos | Meu Desempenho |
|---|---|---|
| ![Boletim](./docs/screenshots/boletim.png) | ![Avisos](./docs/screenshots/avisos.png) | ![Meu Desempenho](./docs/screenshots/meu-desempenho.png) |

</div>

---

## Diferenciais técnicos

### 🔐 Segurança no banco, não só na interface
As permissões por role (`admin`, `teacher`, `student`, `guardian`) são validadas diretamente em **Firestore Security Rules**, cobrindo quem pode ler/escrever cada coleção, validação de payload e acesso restrito a dados próprios — esconder um botão na UI não é tratado como controle de acesso.

### 🧪 Testes automatizados em duas frentes
As regras de segurança (Firestore Rules) têm suítes próprias com **Vitest + Firebase Emulator + `@firebase/rules-unit-testing`**, validando cenários de acesso permitido/negado. Há também testes de unidade para regras de negócio (cálculo de médias, frequência, justificativas) e para a formatação de exportações, fora do escopo das rules. Não há testes de componentes de interface nem pipeline de CI configurado no repositório.

### ⚡ Code splitting granular
A maioria das páginas é carregada sob demanda com `React.lazy`, agrupadas por `<Suspense>` conforme o perfil do usuário. Login, primeiro acesso, dashboard, meu boletim e configurações fazem parte do carregamento inicial.

### 🧩 Camada de serviços por domínio
A comunicação com o Firestore fica isolada em serviços (`students`, `grades`, `attendance`, `reports`, `audit`, `email`, `chat`, `justifications`, entre outros), mantendo componentes de UI livres de lógica de acesso a dados.

### 📝 Auditoria de ações
Alterações sensíveis (como edição de notas) geram um log de auditoria assíncrono, sem bloquear a ação principal do usuário caso o registro falhe.

---

## Tecnologias

| Frontend | Interface | Backend & Dados | Testes |
|---|---|---|---|
| React 18 | Tailwind CSS | Firebase Authentication | Vitest |
| TypeScript | Framer Motion | Cloud Firestore | Firebase Emulator |
| Vite | Lucide React | Firestore Security Rules | `@firebase/rules-unit-testing` |
| React Router | | Cloudflare Pages Functions (e-mail e push) | |
| | | Firebase Cloud Messaging | |
| | | Workbox / vite-plugin-pwa | |

---

## Arquitetura

```text
UI (pages / components)
        ↓
Services (por domínio)
        ↓
Firebase (Auth + Firestore)
        ↓
Firestore Security Rules
```

E-mail de primeiro acesso e Web Push passam por Cloudflare Pages Functions (`functions/api/`), que guardam as credenciais do EmailJS e do FCM fora do bundle do cliente.

```text
src/
├── components/   # UI reutilizável (inclui variantes mobile)
├── pages/        # Telas por perfil (admin, teacher, student, guardian)
├── services/     # Acesso a dados por domínio
├── contexts/     # Auth, tema, toasts, acessibilidade
├── security/     # Testes das Firestore Rules
└── routes/       # Roteamento com guards por role

functions/api/    # Cloudflare Pages Functions (e-mail de primeiro acesso, push)
docs/             # Documentação complementar e screenshots
```

---

## Instalação

```bash
git clone https://github.com/muryllodouglashsoares/tekidu.git
cd tekidu
npm install
```

Configure o ambiente copiando `.env.example` para `.env.local` e preenchendo as credenciais do seu projeto Firebase:

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

> As funções em `functions/api/` (e-mail de primeiro acesso e push) rodam na Cloudflare Pages e não são executadas por `npm run dev`. O cadastro de professores, estudantes e responsáveis depende do envio desse e-mail; veja [FIREBASE_SETUP.md](./FIREBASE_SETUP.md).

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Ambiente de desenvolvimento |
| `npm run build` | Build de produção (`tsc -b && vite build`) |
| `npm run preview` | Pré-visualização local do build |
| `npm run test` | Testes de unidade |
| `npm run test:rules` | Testes das Firestore Security Rules (via emulador) |
| `npm run lint` | ESLint |

---

## Roadmap

**Concluído**
- [x] Autenticação, primeiro acesso e recuperação de senha
- [x] Portais de admin, professor e estudante
- [x] Notas, frequência, boletim e relatórios
- [x] Avisos, notificações e calendário acadêmico
- [x] Command Palette e UX mobile dedicada
- [x] Firestore Security Rules + testes automatizados
- [x] Code splitting por perfil
- [x] Log de auditoria (básico)
- [x] PWA (instalação e Service Worker)
- [x] Painel de preferências de acessibilidade

**Próximas evoluções**
- [ ] Dashboard de auditoria mais completo
- [ ] Monitoramento de erros em produção
- [ ] CI/CD
- [ ] Testes de componentes de interface
- [ ] Auditoria de acessibilidade (axe/Lighthouse, leitor de tela e `eslint-plugin-jsx-a11y`)

---

## Demonstração

🚀 **[Acesse a demonstração da Tekidu](https://tekidu.pages.dev)**

---

## Desenvolvedor

<div align="center">

**Muryllo Douglas**
Desenvolvedor em formação, estudante de Informática.

[![GitHub](https://img.shields.io/badge/GitHub-Muryllo%20Douglas-181717?style=for-the-badge&logo=github)](https://github.com/muryllodouglashsoares)

<br />

⭐ Se este projeto te ajudou a entender o que eu construo, considere deixar uma estrela.

</div>
