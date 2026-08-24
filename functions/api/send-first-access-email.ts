
// functions/api/send-first-access-email.ts

interface Env {
  EMAILJS_SERVICE_ID: string;
  EMAILJS_TEMPLATE_ID: string;
  EMAILJS_PUBLIC_KEY: string;
  EMAILJS_PRIVATE_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let body: { template_params?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  if (!body.template_params) {
    return new Response(JSON.stringify({ error: "template_params ausente" }), { status: 400 });
  }

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: env.EMAILJS_SERVICE_ID,
      template_id: env.EMAILJS_TEMPLATE_ID,
      user_id: env.EMAILJS_PUBLIC_KEY,
      accessToken: env.EMAILJS_PRIVATE_KEY, // nunca sai daqui
      template_params: body.template_params,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `EmailJS recusou o envio (HTTP ${response.status}): ${errorText}` }),
      { status: 502 }
    );
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
