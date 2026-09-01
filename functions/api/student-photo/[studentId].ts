// functions/api/student-photo/[studentId].ts
//
// Substitui o Firebase Storage para a foto de perfil OFICIAL do
// aluno. Armazenamento é o Cloudinary (plano Free, sem cartão — ver
// CLOUDINARY_SETUP.md), no `public_id` canônico
// `tekidu/student-photos/{studentId}`.
//
// PADRÃO "SIGNED UPLOAD": esta function NUNCA recebe os bytes da
// imagem (evita gastar CPU/tempo de execução do Worker com upload
// pesado). Em vez disso, ela só ASSINA a requisição — usando a
// `CLOUDINARY_API_SECRET`, que nunca sai daqui — e devolve essa
// assinatura pro navegador, que sobe a imagem DIRETO para o Cloudinary.
// Isso só é seguro porque a assinatura só é gerada DEPOIS de validar
// que quem pediu é um admin ativo (mesma checagem que existia em
// `storage.rules`), então ninguém consegue subir uma foto sem passar
// por essa validação — a assinatura em si já embute o `public_id`
// fixo do aluno, então nem adianta capturar uma assinatura e tentar
// reusar para outro caminho.
//
// REMOÇÃO (DELETE): ao contrário do upload, aqui a function chama o
// Cloudinary diretamente (payload pequeno — só o `public_id` — então
// não há ganho em delegar pro cliente), sempre depois da mesma
// checagem de admin.

import { createRemoteJWKSet, jwtVerify } from "jose";

interface Env {
  FIREBASE_PROJECT_ID: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  /** NUNCA exposto ao cliente — só usada aqui, no servidor, para assinar. */
  CLOUDINARY_API_SECRET: string;
}

const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

function publicIdFor(studentId: string): string {
  return `tekidu/student-photos/${studentId}`;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sha1Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Extrai e valida o Firebase ID Token do header Authorization. Lança se inválido/ausente. */
async function requireIdToken(request: Request, projectId: string): Promise<{ idToken: string; uid: string }> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw json({ error: "Não autenticado." }, 401);
  }
  const idToken = header.slice("Bearer ".length);

  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    const uid = payload.sub;
    if (!uid) throw new Error("Token sem uid");
    return { idToken, uid };
  } catch {
    throw json({ error: "Token inválido ou expirado." }, 401);
  }
}

/** Confere, via Firestore REST (aplicando firestore.rules de verdade), se o uid é admin ativo. */
async function isActiveAdmin(idToken: string, projectId: string, uid: string): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  if (!res.ok) return false;

  const doc = (await res.json()) as {
    fields?: { role?: { stringValue?: string }; active?: { booleanValue?: boolean } };
  };
  return doc.fields?.active?.booleanValue === true && doc.fields?.role?.stringValue === "admin";
}

/**
 * GET: devolve os parâmetros assinados pro navegador subir a foto
 * direto no Cloudinary (fetch multipart, ver `studentPhotoService.ts`).
 * É GET (não PUT) porque esta function não recebe nenhum arquivo — só
 * gera uma assinatura de curta duração (o `timestamp` embutido faz o
 * Cloudinary recusar assinaturas antigas).
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const studentId = params.studentId as string;

  let auth: { idToken: string; uid: string };
  try {
    auth = await requireIdToken(request, env.FIREBASE_PROJECT_ID);
  } catch (response) {
    return response as Response;
  }

  const admin = await isActiveAdmin(auth.idToken, env.FIREBASE_PROJECT_ID, auth.uid);
  if (!admin) return json({ error: "Apenas administradores podem alterar a foto." }, 403);

  const publicId = publicIdFor(studentId);
  const timestamp = Math.floor(Date.now() / 1000);

  // Parâmetros em ORDEM ALFABÉTICA — é assim que o Cloudinary exige
  // que a string a assinar seja montada. Qualquer parâmetro extra
  // enviado no upload real que não esteja aqui (ex.: `file`,
  // `api_key`, `cloud_name`, `resource_type`) NUNCA entra na
  // assinatura — regra do próprio Cloudinary.
  const paramsToSign = `invalidate=true&overwrite=true&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = await sha1Hex(paramsToSign + env.CLOUDINARY_API_SECRET);

  return json({
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    publicId,
    timestamp,
    signature,
  });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const studentId = params.studentId as string;

  let auth: { idToken: string; uid: string };
  try {
    auth = await requireIdToken(request, env.FIREBASE_PROJECT_ID);
  } catch (response) {
    return response as Response;
  }

  const admin = await isActiveAdmin(auth.idToken, env.FIREBASE_PROJECT_ID, auth.uid);
  if (!admin) return json({ error: "Apenas administradores podem remover a foto." }, 403);

  const publicId = publicIdFor(studentId);
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = await sha1Hex(paramsToSign + env.CLOUDINARY_API_SECRET);

  const body = new URLSearchParams({
    public_id: publicId,
    api_key: env.CLOUDINARY_API_KEY,
    timestamp: String(timestamp),
    signature,
    invalidate: "true",
  });

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }
  );

  if (!res.ok) {
    return json({ error: "Cloudinary recusou a remoção da foto." }, 502);
  }

  // Cloudinary responde 200 com { result: "not found" } quando o
  // objeto já não existia — tratamos como sucesso (mesmo espírito do
  // antigo `deleteObjectIgnoringNotFound`).
  return json({ ok: true });
};
