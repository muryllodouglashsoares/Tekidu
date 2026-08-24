/**
 * Envio de e-mail transacional — Decisão 2 revisada: a chamada à
 * EmailJS deixou de ser feita direto do navegador e passou a ser
 * intermediada por uma Cloudflare Pages Function
 * (`functions/api/send-first-access-email.ts`).
 *
 * MOTIVO DA MUDANÇA: no modelo 100% client-side original, a chave
 * privada da EmailJS (`VITE_EMAILJS_PRIVATE_KEY`) era embutida em
 * texto puro no bundle JS servido ao navegador — qualquer pessoa podia
 * extraí-la inspecionando os arquivos estáticos do site, tornando o
 * modo "Strict" da EmailJS pouco eficaz na prática. Agora a chave
 * privada (e as demais credenciais da EmailJS) vivem só do lado do
 * servidor, como variáveis de ambiente da Pages Function — nunca são
 * lidas pelo frontend nem aparecem em nenhum bundle.
 *
 * Este serviço agora só sabe chamar `/api/send-first-access-email`
 * (rota própria do site, resolvida pela Cloudflare) e repassar o erro
 * que a function devolver. Toda a lógica de credenciais/EmailJS foi
 * movida para dentro da function — ver aquele arquivo para detalhes
 * de configuração (variáveis de ambiente no painel da Cloudflare:
 * EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY,
 * EMAILJS_PRIVATE_KEY — sem prefixo VITE_, propositalmente, pois não
 * devem ir para o bundle do cliente).
 *
 * O cadastro do professor/aluno em `userService`/`studentService` só
 * cria a conta DEPOIS que este envio já teve sucesso (ver comentário
 * em `createTeacher`/`createStudent`), então uma falha aqui não deixa
 * nenhum rastro pendente no Firebase — mesmo comportamento de antes,
 * só mudou o caminho de rede até a EmailJS.
 */

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

/**
 * Parâmetros enviados ao template do EmailJS (repassados como estão
 * pela function, que só troca as credenciais). O NOME de cada chave
 * aqui precisa bater exatamente com as variáveis `{{...}}` usadas no
 * corpo/assunto do template criado no painel EmailJS. Em especial,
 * `to_email` precisa ser o nome configurado no campo "To Email" das
 * configurações do template (Settings da própria mensagem no editor),
 * senão a EmailJS não sabe para quem entregar o e-mail.
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
 * temporária) via `/api/send-first-access-email`. Lança um erro
 * (nunca simula sucesso) se:
 * - a chamada de rede à function falhar;
 * - a function responder com status de erro (configuração ausente no
 *   servidor, EmailJS recusou o envio, limite mensal de 200
 *   requisições excedido, etc. — ver corpo do erro devolvido).
 */
export async function sendFirstAccessEmail(params: FirstAccessEmailParams): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/send-first-access-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_params: buildTemplateParams(params) }),
    });
  } catch (networkError) {
    console.error("[emailService] Falha de rede ao chamar a function de envio", networkError);
    throw new Error(
      "Falha de rede ao enviar o e-mail de primeiro acesso. O professor/aluno NÃO " +
        "foi cadastrado — o envio acontece antes da criação da conta, então nada " +
        "fica pendente no Firebase; verifique sua conexão e tente cadastrar novamente."
    );
  }

  if (!response.ok) {
    // A function devolve `{ error: string }` em caso de falha — ver
    // `functions/api/send-first-access-email.ts`. Erros comuns aqui:
    // variáveis de ambiente da EmailJS não configuradas no painel da
    // Cloudflare, service_id/template_id errados, ou limite mensal de
    // 200 requisições excedido (HTTP 429 repassado pela EmailJS).
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.error ?? `Falha ao enviar e-mail de primeiro acesso (HTTP ${response.status}).`
    );
  }
}