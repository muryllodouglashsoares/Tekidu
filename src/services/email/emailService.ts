/**
 * Envio de e-mail transacional — Decisão 2, Opção B(i) (100% client-side,
 * sem Cloud Functions), agora usando **EmailJS** em vez da Resend
 * (trocado depois que ficou claro que o projeto não tem domínio
 * próprio para verificar na Resend — sem domínio verificado, a Resend
 * só envia para o e-mail da própria conta, o que inviabiliza o uso
 * real com professores/alunos).
 *
 * EmailJS foi desenhado, desde o início, para ser chamado DIRETO do
 * navegador (é literalmente a proposta de venda deles — "sem
 * servidor") e não exige verificação de domínio: você conecta sua
 * própria conta de e-mail pessoal (Gmail, Outlook, etc.) pelo painel
 * deles, e é essa conta que aparece como remetente. Isso resolve, ao
 * mesmo tempo, os dois problemas que a Resend tinha aqui:
 * - não precisa de domínio próprio;
 * - a chamada via `fetch` não deve esbarrar em CORS, porque a API da
 *   EmailJS é feita para receber chamadas de navegador (ao contrário
 *   da Resend, cuja API é pensada para uso em servidor).
 *
 * LIMITE DO PLANO GRATUITO (confirmado em 2026): 200 requisições de
 * e-mail por mês, 2 templates. Cada professor/aluno cadastrado consome
 * 1 dessas 200. Se o limite mensal for excedido, a API da EmailJS
 * recusa a chamada e `sendFirstAccessEmail` propaga o erro — igual ao
 * padrão já seguido com a Resend, nunca fingimos sucesso.
 *
 * CONFIGURAÇÃO NECESSÁRIA (.env.local — ver `.env.example` e o passo a
 * passo no final da resposta que acompanha esta mudança):
 *   VITE_EMAILJS_SERVICE_ID  — ID do "Email Service" (a conta de
 *                              e-mail conectada) no painel EmailJS.
 *   VITE_EMAILJS_TEMPLATE_ID — ID do template de e-mail criado no
 *                              painel EmailJS (ver variáveis exigidas
 *                              logo abaixo, em `buildTemplateParams`).
 *   VITE_EMAILJS_PUBLIC_KEY  — chave pública da conta EmailJS
 *                              (Account → General).
 *   VITE_EMAILJS_PRIVATE_KEY — chave privada (Account → Security →
 *                              "API Keys"), OPCIONAL mas recomendada:
 *                              sem ela, qualquer pessoa que descobrir a
 *                              chave pública (que fica visível no
 *                              bundle do navegador — isso é esperado e
 *                              normal no modelo da EmailJS, diferente
 *                              da API key da Resend) consegue disparar
 *                              e-mails pelo seu template. Com a chave
 *                              privada configurada E o modo "Strict"
 *                              habilitado em Account → Security, a
 *                              EmailJS exige as duas para aceitar a
 *                              requisição.
 *
 * Sem `VITE_EMAILJS_SERVICE_ID`/`VITE_EMAILJS_TEMPLATE_ID`/
 * `VITE_EMAILJS_PUBLIC_KEY`, `sendFirstAccessEmail` lança um erro
 * explícito — NUNCA finge sucesso. O cadastro do professor/aluno em
 * `userService`/`studentService` só cria a conta DEPOIS que este envio
 * já teve sucesso (ver comentário em `createTeacher`/`createStudent`),
 * então uma falha aqui não deixa nenhum rastro no Firebase.
 */

const EMAILJS_SEND_URL = "https://api.emailjs.com/api/v1.0/email/send";

interface FirstAccessEmailParams {
  to: string;
  name: string;
  role: "teacher" | "student";
  /** Rótulo do identificador de primeiro acesso ("Matrícula" ou "Chave de acesso"). */
  loginIdentifierLabel: string;
  loginIdentifierValue: string;
  tempPassword: string;
  /** Prazo de validade da credencial (Decisão 3), já formatado para exibição. */
  expiresAtLabel: string;
  appName?: string;
}

function isEmailConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_EMAILJS_SERVICE_ID &&
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID &&
      import.meta.env.VITE_EMAILJS_PUBLIC_KEY
  );
}

/**
 * Parâmetros enviados ao template do EmailJS. O NOME de cada chave
 * aqui precisa bater exatamente com as variáveis `{{...}}` usadas no
 * corpo/assunto do template criado no painel EmailJS — ver passo a
 * passo de configuração. Em especial, `to_email` precisa ser o nome
 * configurado no campo "To Email" das configurações do template
 * (Settings da própria mensagem no editor), senão a EmailJS não sabe
 * para quem entregar o e-mail.
 */
function buildTemplateParams(params: FirstAccessEmailParams) {
  return {
    to_email: params.to,
    to_name: params.name,
    role_label: params.role === "teacher" ? "professor(a)" : "aluno(a)",
    app_name: params.appName ?? "Tekidu",
    login_label: params.loginIdentifierLabel,
    login_value: params.loginIdentifierValue,
    temp_password: params.tempPassword,
    expires_at: params.expiresAtLabel,
  };
}

/**
 * Envia o e-mail de primeiro acesso (matrícula/chave + senha
 * temporária) via EmailJS. Lança um erro (nunca simula sucesso) se:
 * - as variáveis de ambiente da EmailJS não estiverem configuradas;
 * - a chamada à API da EmailJS falhar (rede, template/serviço
 *   inválido, limite mensal de 200 requisições excedido, etc.).
 */
export async function sendFirstAccessEmail(params: FirstAccessEmailParams): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error(
      "Envio de e-mail não configurado: defina VITE_EMAILJS_SERVICE_ID, " +
        "VITE_EMAILJS_TEMPLATE_ID e VITE_EMAILJS_PUBLIC_KEY em .env.local " +
        "(ver .env.example). O professor/aluno NÃO foi cadastrado — o " +
        "envio do e-mail acontece antes da criação da conta, então nada " +
        "fica pendente no Firebase; corrija a configuração e cadastre " +
        "novamente."
    );
  }

  let response: Response;
  try {
    response = await fetch(EMAILJS_SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: import.meta.env.VITE_EMAILJS_SERVICE_ID,
        template_id: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        user_id: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
        // Chave privada opcional (modo "Strict" da EmailJS) — ver
        // comentário no topo do arquivo. `undefined` é omitido pelo
        // `JSON.stringify`, então não preencher a variável não quebra
        // a chamada, só deixa de usar o modo mais seguro.
        accessToken: import.meta.env.VITE_EMAILJS_PRIVATE_KEY,
        template_params: buildTemplateParams(params),
      }),
    });
  } catch (networkError) {
    console.error("[emailService] Falha de rede ao chamar a EmailJS", networkError);
    throw new Error(
      "Falha de rede ao chamar a API da EmailJS. O professor/aluno NÃO " +
        "foi cadastrado (o envio acontece antes da criação da conta) — " +
        "verifique sua conexão e tente cadastrar novamente."
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    // Erros comuns aqui: service_id/template_id errados, limite mensal
    // de 200 requisições excedido (HTTP 429), ou modo "Strict"
    // habilitado no painel sem VITE_EMAILJS_PRIVATE_KEY configurada
    // (HTTP 403) — a mensagem crua da EmailJS (`body`) costuma
    // explicar qual desses é o caso.
    throw new Error(
      `A EmailJS recusou o envio do e-mail (HTTP ${response.status}). ${body}`.trim()
    );
  }
}
