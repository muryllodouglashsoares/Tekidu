// functions/api/_lib/googleAuth.ts
//
// IMPLEMENTAÇÃO — WEB PUSH (ETAPA 8 do prompt: "camada server-side
// para envio das notificações", sem custo externo).
//
// Por que isto existe em vez de usar o Firebase Admin SDK: o Admin
// SDK (`firebase-admin`) depende de APIs Node que não existem no
// runtime de Cloudflare Workers/Pages Functions (que é baseado em
// V8 isolates, não Node.js) — e mesmo se existisse um build
// compatível, Cloud Functions (onde o Admin SDK normalmente roda)
// exige o plano Blaze do Firebase, que é pago (mesmo dentro da cota
// gratuita, o plano em si exige cartão cadastrado). Como o projeto
// roda no plano Spark (gratuito, sem possibilidade de cobrança — ver
// `lib/firebase.ts`), a alternativa sem custo é: autenticar como a
// Service Account DIRETAMENTE via OAuth2 (fluxo "JWT Bearer", RFC
// 7523), usando só `fetch` + Web Crypto (SubtleCrypto) — ambos
// nativos do runtime do Cloudflare Workers, sem nenhuma dependência
// externa. Isso dá acesso tanto à API REST do Firestore quanto à API
// do FCM (HTTP v1), com o mesmo access token.
//
// CUSTO: zero. Service Accounts e papéis de IAM não são cobrados; as
// APIs de Firestore/FCM usadas aqui permanecem nas mesmas cotas
// gratuitas do plano Spark. O único "servidor" é a própria Cloudflare
// Pages Function, que roda no plano gratuito da Cloudflare.

export interface ServiceAccountEnv {
  FCM_PROJECT_ID: string;
  FCM_SERVICE_ACCOUNT_EMAIL: string;
  FCM_SERVICE_ACCOUNT_PRIVATE_KEY: string;
}

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecodeToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlDecodeToString(value: string): string {
  return new TextDecoder().decode(base64UrlDecodeToBytes(value));
}

/** Converte a chave privada PEM (formato exportado pelo Console do Google Cloud, com `\n` literais quando colada como variável de ambiente) para uma `CryptoKey` importável. */
async function importServiceAccountPrivateKey(pem: string): Promise<CryptoKey> {
  const normalized = pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem;
  const pkcs8 = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binaryDer = base64UrlDecodeToBytes(pkcs8.replace(/-/g, "+").replace(/_/g, "/"));
  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/**
 * Troca as credenciais da Service Account por um access token OAuth2
 * (fluxo JWT Bearer — RFC 7523), com o(s) escopo(s) pedido(s).
 *
 * Sem cache entre invocações (cada requisição busca um token novo) —
 * simplicidade em vez de otimização prematura; o endpoint de token do
 * Google não tem custo e a cota é generosa para o volume de uma
 * plataforma acadêmica. Se o volume crescer muito, considerar cache
 * via Cloudflare KV (também gratuito na cota padrão).
 */
export async function getGoogleAccessToken(
  env: ServiceAccountEnv,
  scopes: string[]
): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const nowSec = Math.floor(Date.now() / 1000);
  const claims = {
    iss: env.FCM_SERVICE_ACCOUNT_EMAIL,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: nowSec,
    exp: nowSec + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const claimsB64 = base64UrlEncode(encoder.encode(JSON.stringify(claims)));
  const signingInput = `${headerB64}.${claimsB64}`;

  const key = await importServiceAccountPrivateKey(env.FCM_SERVICE_ACCOUNT_PRIVATE_KEY);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(signingInput)
  );
  const jwt = `${signingInput}.${base64UrlEncode(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Falha ao obter access token do Google (HTTP ${response.status}): ${text}`);
  }
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

interface FirebaseIdTokenPayload {
  sub: string;
  aud: string;
  iss: string;
  exp: number;
  [key: string]: unknown;
}

let cachedJwks: { keys: JsonWebKey[]; fetchedAt: number } | null = null;
const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

async function getFirebaseJwks(): Promise<JsonWebKey[]> {
  // Cache em memória do isolate (válido por invocações consecutivas no
  // mesmo worker "quente"); revalida a cada 10 minutos. Não é
  // persistente entre isolates novos — apenas uma otimização, nunca
  // uma dependência: se o cache estiver vazio/expirado, busca de novo.
  const TEN_MIN_MS = 10 * 60 * 1000;
  if (cachedJwks && Date.now() - cachedJwks.fetchedAt < TEN_MIN_MS) {
    return cachedJwks.keys;
  }
  const response = await fetch(JWKS_URL);
  if (!response.ok) throw new Error("Falha ao buscar chaves públicas do Firebase Auth.");
  const data = (await response.json()) as { keys: JsonWebKey[] };
  cachedJwks = { keys: data.keys, fetchedAt: Date.now() };
  return data.keys;
}

/**
 * Verifica um ID token do Firebase Authentication (assinatura RS256 +
 * claims padrão) SEM depender do Admin SDK — usa as chaves públicas
 * (JWKS) do próprio Google.
 *
 * Retorna o `uid` do usuário se o token for válido, ou `null` caso
 * contrário (nunca lança para erro de token — quem chama decide
 * responder 401).
 *
 * NOTA DE SEGURANÇA (ETAPA 23 do prompt): esta verificação é uma
 * camada de defesa em profundidade — a autorização REAL de "quem pode
 * ser notificado" já foi decidida no momento em que a notificação foi
 * GRAVADA em Firestore (pela Rule de `notifications`, ver
 * `notificationService.ts`). Mesmo sem este check, um chamador não
 * autenticado não conseguiria fazer nada além de re-pedir o reenvio
 * de um push para um `notificationId` que ele já teria que adivinhar
 * (IDs do Firestore são aleatórios de 20 caracteres) — mas verificar o
 * token ainda assim reduz a superfície de abuso do endpoint.
 */
export async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string
): Promise<string | null> {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { kid?: string; alg?: string };
  let payload: FirebaseIdTokenPayload;
  try {
    header = JSON.parse(base64UrlDecodeToString(headerB64));
    payload = JSON.parse(base64UrlDecodeToString(payloadB64));
  } catch {
    return null;
  }
  if (header.alg !== "RS256" || !header.kid) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) return null;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (typeof payload.exp !== "number" || payload.exp <= nowSec) return null;
  if (!payload.sub) return null;

  let jwks: JsonWebKey[];
  try {
    jwks = await getFirebaseJwks();
  } catch {
    return null;
  }
  const jwk = jwks.find((k) => k.kid === header.kid);
  if (!jwk) return null;

  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signature = base64UrlDecodeToBytes(signatureB64);
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      signature,
      new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    );
    return valid ? payload.sub : null;
  } catch {
    return null;
  }
}
