// functions/api/send-push.ts
//
// IMPLEMENTAÇÃO — WEB PUSH (ETAPAS 7/8/17/18 do prompt).
//
// MODELO DE SEGURANÇA (por que isto é seguro mesmo podendo ser
// chamado por qualquer cliente autenticado):
//
// Este endpoint NUNCA aceita destinatário, título, corpo ou link
// vindos do cliente — só `notificationIds`. Para cada ID, ele RELÊ o
// documento em `notifications/{id}` (que já existe no Firestore) e
// usa exatamente o que está gravado lá. Um documento só existe ali se
// já passou pela Firestore Rule de CRIAÇÃO de `notifications`
// (`isActiveStaff()`, ou a exceção estreita de autoconfirmação de
// justificativa — ver `firestore.rules`). Ou seja: a autorização de
// "quem pode notificar quem, com qual conteúdo" já foi validada no
// momento em que a notificação foi criada — este endpoint só entrega
// o que já foi aprovado, nunca decide isso sozinho.
//
// Idempotência (ETAPA 17): cada notificação tem um campo `pushSent`.
// Uma vez entregue (ou tentado), o campo é marcado — chamadas
// repetidas para o mesmo ID (reload, corrida entre abas) não reenviam
// nem geram push duplicado.
//
// Token inválido (ETAPA 18): um erro de token não pode nunca impedir
// o envio para os demais — cada token é enviado independentemente
// (`Promise.allSettled`), e tokens que o FCM reporta como
// inválidos/não registrados são marcados `status: "invalid"` (nunca
// deletados fisicamente, para manter rastreabilidade).
//
// CUSTO: zero — roda como Cloudflare Pages Function (plano gratuito),
// chama só APIs do Firestore/FCM dentro da cota gratuita do Firebase
// Spark, autenticada via Service Account (ver `_lib/googleAuth.ts`).

import { getGoogleAccessToken, verifyFirebaseIdToken, type ServiceAccountEnv } from "./_lib/googleAuth";
import { createFirestoreClient } from "./_lib/firestoreRest";

type Env = ServiceAccountEnv;

interface SendPushRequestBody {
  notificationIds?: unknown;
}

const MAX_IDS_PER_REQUEST = 50;
// Uma notificação criada há mais tempo que isso não recebe mais push
// (defesa em profundidade contra reenvio de IDs muito antigos — ver
// nota de segurança em `googleAuth.ts`; o cenário normal é o push ser
// acionado segundos depois da criação, pelo próprio `notificationService`).
const MAX_NOTIFICATION_AGE_MS = 30 * 60 * 1000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isRecentEnough(createdAtIso: unknown): boolean {
  if (typeof createdAtIso !== "string") return false;
  const createdAtMs = Date.parse(createdAtIso);
  if (Number.isNaN(createdAtMs)) return false;
  return Date.now() - createdAtMs <= MAX_NOTIFICATION_AGE_MS;
}

/** Envia uma mensagem FCM HTTP v1 para um único token. Retorna se o token deve ser marcado inválido. */
async function sendToToken(
  projectId: string,
  accessToken: string,
  token: string,
  payload: { title: string; body: string; url: string; notificationId: string; type: string }
): Promise<{ ok: boolean; invalidToken: boolean }> {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: payload.title, body: payload.body },
          data: {
            notificationId: payload.notificationId,
            type: payload.type,
            url: payload.url,
          },
          webpush: {
            fcm_options: { link: payload.url },
            notification: { icon: "/icons/icon-192.png" },
          },
        },
      }),
    }
  );

  if (response.ok) return { ok: true, invalidToken: false };

  const errorBody = await response.json().catch(() => null);
  const errorStatus =
    (errorBody as { error?: { status?: string } } | null)?.error?.status ?? "";
  // ETAPA 18: códigos que indicam que o token não serve mais.
  const invalidToken =
    response.status === 404 ||
    errorStatus === "NOT_FOUND" ||
    errorStatus === "UNREGISTERED" ||
    errorStatus === "INVALID_ARGUMENT";

  // eslint-disable-next-line no-console
  console.error("[send-push] Falha ao enviar para token", response.status, errorStatus);
  return { ok: false, invalidToken };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.FCM_PROJECT_ID || !env.FCM_SERVICE_ACCOUNT_EMAIL || !env.FCM_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return json({ error: "Push não configurado no servidor (variáveis de ambiente ausentes)." }, 500);
  }

  const authHeader = request.headers.get("Authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!idToken) {
    return json({ error: "Requisição não autenticada." }, 401);
  }
  const callerUid = await verifyFirebaseIdToken(idToken, env.FCM_PROJECT_ID);
  if (!callerUid) {
    return json({ error: "Token de autenticação inválido ou expirado." }, 401);
  }

  let body: SendPushRequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  const notificationIds = Array.isArray(body.notificationIds)
    ? body.notificationIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  if (notificationIds.length === 0) {
    return json({ error: "notificationIds ausente ou vazio." }, 400);
  }
  const dedupedIds = Array.from(new Set(notificationIds)).slice(0, MAX_IDS_PER_REQUEST);

  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken(env, [
      "https://www.googleapis.com/auth/datastore",
      "https://www.googleapis.com/auth/firebase.messaging",
    ]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[send-push] Falha ao autenticar a Service Account", error);
    return json({ error: "Falha ao autenticar o backend de envio." }, 500);
  }

  const firestore = createFirestoreClient(env.FCM_PROJECT_ID, accessToken);

  let delivered = 0;
  let skipped = 0;
  const results: { notificationId: string; status: string }[] = [];

  for (const notificationId of dedupedIds) {
    try {
      const notificationDoc = await firestore.getDocument(`notifications/${notificationId}`);
      if (!notificationDoc) {
        results.push({ notificationId, status: "not_found" });
        skipped++;
        continue;
      }
      const data = notificationDoc.data;
      if (data.pushSent === true) {
        results.push({ notificationId, status: "already_sent" });
        skipped++;
        continue;
      }
      if (!isRecentEnough(data.createdAt)) {
        results.push({ notificationId, status: "too_old" });
        skipped++;
        continue;
      }
      const recipientUid = typeof data.recipientUid === "string" ? data.recipientUid : null;
      if (!recipientUid) {
        results.push({ notificationId, status: "no_recipient" });
        skipped++;
        continue;
      }

      const tokens = await firestore.queryCollection(
        `users/${recipientUid}`,
        "pushTokens",
        { field: "status", value: "active" }
      );

      if (tokens.length === 0) {
        // Usuário não tem Push ativo em nenhum dispositivo — não é
        // erro, a notificação INTERNA já cobre este caso (ETAPA 11).
        await firestore.patchDocument(`notifications/${notificationId}`, {
          pushSent: true,
        });
        results.push({ notificationId, status: "no_active_tokens" });
        continue;
      }

      const title = typeof data.title === "string" ? data.title : "Tekidu";
      const message = typeof data.message === "string" ? data.message : "";
      const link = typeof data.link === "string" && data.link ? data.link : "/";
      const type = typeof data.type === "string" ? data.type : "unknown";

      const outcomes = await Promise.allSettled(
        tokens.map((tokenDoc) =>
          sendToToken(env.FCM_PROJECT_ID, accessToken, tokenDoc.id, {
            title,
            body: message,
            url: link,
            notificationId,
            type,
          }).then((result) => ({ tokenDoc, result }))
        )
      );

      let anySent = false;
      for (const outcome of outcomes) {
        if (outcome.status !== "fulfilled") continue;
        const { tokenDoc, result } = outcome.value;
        if (result.ok) anySent = true;
        if (result.invalidToken) {
          // ETAPA 18: marca o token inválido, nunca interrompe os
          // demais envios por causa disso.
          await firestore
            .patchDocument(`users/${recipientUid}/pushTokens/${tokenDoc.id}`, {
              status: "invalid",
            })
            .catch(() => {
              // Falha ao marcar o token não deve derrubar a resposta —
              // na pior hipótese, o token inválido só é tentado de
              // novo na próxima notificação.
            });
        }
      }

      await firestore.patchDocument(`notifications/${notificationId}`, { pushSent: true });
      if (anySent) delivered++;
      results.push({ notificationId, status: anySent ? "delivered" : "all_tokens_failed" });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[send-push] Falha ao processar notificação", notificationId, error);
      results.push({ notificationId, status: "error" });
      skipped++;
    }
  }

  return json({ delivered, skipped, results });
};
