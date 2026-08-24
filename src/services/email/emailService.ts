// src/services/email/emailService.ts (trecho a alterar)

export async function sendFirstAccessEmail(params: FirstAccessEmailParams): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/send-first-access-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_params: buildTemplateParams(params) }),
    });
  } catch (networkError) {
    console.error("[emailService] Falha de rede ao chamar a function", networkError);
    throw new Error(
      "Falha de rede ao enviar o e-mail de primeiro acesso. O professor/aluno NÃO " +
        "foi cadastrado — verifique sua conexão e tente novamente."
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Falha ao enviar e-mail (HTTP ${response.status}).`);
  }
}
