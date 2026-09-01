import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { logAuditEvent } from "@/services/audit/auditService";

/**
 * Foto de perfil OFICIAL do aluno.
 *
 * ARMAZENAMENTO: Cloudinary (plano Free, sem cartão de crédito), não
 * mais Firebase Storage nem Cloudflare R2 (ambos passaram a exigir
 * cadastro de cartão pra ativar, mesmo dentro do tier gratuito). Ver
 * `functions/api/student-photo/[studentId].ts` (Cloudflare Pages
 * Function que assina o upload/faz a remoção) e `CLOUDINARY_SETUP.md`
 * (passo a passo de configuração).
 *
 * FLUXO DE UPLOAD ("signed upload" do Cloudinary): o navegador NUNCA
 * fala direto com o Cloudinary sem antes passar pela Pages Function.
 * 1) Pede uma assinatura à function (que só assina depois de validar
 *    que o usuário logado é admin ativo); 2) sobe a imagem DIRETO pro
 *    Cloudinary usando essa assinatura; 3) só então grava
 *    `photoURL`/`photoUpdatedAt` no Firestore. Assim o arquivo nunca
 *    passa pelo nosso próprio servidor (mais rápido, mais barato), mas
 *    a autorização continua sendo decidida sempre pelo backend, nunca
 *    só pela UI.
 *
 * REGRA DE AUTORIDADE (ver `types/student.ts`, `firestore.rules`):
 * só o ADMIN pode chamar `uploadStudentPhoto`/`removeStudentPhoto`.
 * Este arquivo não reforça isso sozinho — quem chama
 * (`StudentPhotoPanel`) só mostra os controles para
 * `profile?.role === "admin"`, e a Pages Function recusa gerar a
 * assinatura (ou fazer a remoção) para qualquer outra role. As DUAS
 * camadas são necessárias (nunca confiar só na UI).
 *
 * CAMINHO FIXO E CANÔNICO — a única decisão que simplifica todo o
 * resto do recurso: `public_id` sempre `tekidu/student-photos/{studentId}`
 * no Cloudinary (com `overwrite: true`). Como o caminho nunca muda,
 * substituir uma foto é só SOBRESCREVER o mesmo objeto — não há
 * arquivo antigo para descobrir/apagar, logo não há risco de arquivo
 * órfão em uma substituição (a limpeza só é necessária quando o
 * ALUNO inteiro é excluído — ver `deleteStudentPhotoObject`, chamada
 * por `studentService.deleteStudent`). Sempre JPEG (a compressão
 * abaixo converte qualquer formato de entrada aceito para JPEG).
 */

const MAX_INPUT_FILE_BYTES = 8 * 1024 * 1024; // 8MB antes da compressão
const ACCEPTED_INPUT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_DIMENSION_PX = 640; // suficiente para avatar em qualquer tela, incl. retina
const JPEG_QUALITY = 0.85;

export const STUDENT_PHOTO_ACCEPT = ACCEPTED_INPUT_TYPES.join(",");

/**
 * Valida o arquivo ESCOLHIDO pelo admin antes de qualquer
 * processamento. Lançada como `Error` com mensagem já pronta para
 * exibição (mesmo padrão de `studentService.createStudent`).
 */
function assertValidPhotoFile(file: File): void {
  if (!ACCEPTED_INPUT_TYPES.includes(file.type)) {
    throw new Error("Formato de imagem não suportado. Envie um arquivo JPEG, PNG ou WebP.");
  }
  if (file.size > MAX_INPUT_FILE_BYTES) {
    throw new Error("A imagem é muito grande. O tamanho máximo é 8MB.");
  }
}

/**
 * Redimensiona (mantendo proporção, maior lado ≤ `MAX_DIMENSION_PX`) e
 * recomprime a imagem para JPEG via `<canvas>`. Roda inteiramente no
 * cliente, antes do upload direto pro Cloudinary. Também serve como
 * validação de integridade: um arquivo corrompido ou que não é
 * realmente uma imagem falha em `img.onerror` abaixo, antes de
 * qualquer upload.
 */
function compressToJpeg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Não foi possível processar a imagem neste navegador."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Não foi possível processar a imagem. Tente outro arquivo."));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("O arquivo selecionado não é uma imagem válida ou está corrompido."));
    };

    img.src = objectUrl;
  });
}

interface PhotoActor {
  uid: string;
  name: string;
}

interface SignedUploadParams {
  cloudName: string;
  apiKey: string;
  publicId: string;
  timestamp: number;
  signature: string;
}

/** Pega o ID Token do usuário logado (para autenticar a chamada à Pages Function). */
async function currentIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sessão expirada. Faça login novamente.");
  return user.getIdToken();
}

/** Extrai a mensagem de erro do corpo JSON da Pages Function, com fallback genérico. */
async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

/** Pede à Pages Function os parâmetros assinados (só admin ativo recebe uma assinatura válida). */
async function requestSignedUpload(studentId: string, idToken: string): Promise<SignedUploadParams> {
  const response = await fetch(`/api/student-photo/${studentId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível autorizar o upload. Tente novamente."));
  }

  return (await response.json()) as SignedUploadParams;
}

/** Sobe o JPEG já comprimido DIRETO pro Cloudinary, usando os parâmetros assinados. */
async function uploadToCloudinary(jpeg: Blob, signed: SignedUploadParams): Promise<string> {
  const formData = new FormData();
  formData.append("file", jpeg, "photo.jpg");
  formData.append("api_key", signed.apiKey);
  formData.append("timestamp", String(signed.timestamp));
  formData.append("signature", signed.signature);
  formData.append("public_id", signed.publicId);
  formData.append("overwrite", "true");
  formData.append("invalidate", "true");

  const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("O Cloudinary recusou o upload da imagem. Tente novamente.");
  }

  const result = (await response.json()) as { secure_url?: string };
  if (!result.secure_url) throw new Error("Resposta inesperada do Cloudinary.");
  return result.secure_url;
}

/**
 * Adiciona ou substitui a foto oficial do aluno.
 *
 * ORDEM DAS ETAPAS (propositalmente nesta sequência — ver briefing,
 * "Tenha cuidado para não remover a foto antiga antes de garantir que
 * a nova foi armazenada com sucesso"): o upload para o Cloudinary
 * acontece PRIMEIRO; só depois dele confirmar sucesso é que o
 * Firestore é atualizado. Se o upload falhar, esta função lança antes
 * de tocar no Firestore — o aluno permanece com a foto anterior
 * (ou sem foto, se essa era a situação).
 *
 * Só toca nos campos `photoURL`/`photoUpdatedAt` no Firestore (nunca
 * um `updateStudent` com o resto do formulário junto) — é isso que
 * permite à Security Rule restringir exatamente esta escrita ao admin
 * sem interferir na edição normal de outros campos por um professor.
 */
export async function uploadStudentPhoto(
  studentId: string,
  file: File,
  actor: PhotoActor
): Promise<string> {
  assertValidPhotoFile(file);
  const jpeg = await compressToJpeg(file);
  const idToken = await currentIdToken();

  const signed = await requestSignedUpload(studentId, idToken);
  const photoURL = await uploadToCloudinary(jpeg, signed);

  await updateDoc(doc(db, "students", studentId), {
    photoURL,
    photoUpdatedAt: serverTimestamp(),
  });

  logAuditEvent({
    type: "student_photo_updated",
    actorId: actor.uid,
    actorName: actor.name,
    studentId,
    before: null,
    after: "Foto atualizada",
  });

  return photoURL;
}

/**
 * Remove a foto oficial do aluno (Cloudinary + referência no Firestore).
 * `hasPhoto` evita uma chamada de rede quando já sabemos, pelo estado
 * carregado em tela, que não existe objeto para apagar.
 */
export async function removeStudentPhoto(
  studentId: string,
  hasPhoto: boolean,
  actor: PhotoActor
): Promise<void> {
  if (hasPhoto) {
    await deletePhotoObject(studentId);
  }

  await updateDoc(doc(db, "students", studentId), {
    photoURL: null,
    photoUpdatedAt: serverTimestamp(),
  });

  logAuditEvent({
    type: "student_photo_updated",
    actorId: actor.uid,
    actorName: actor.name,
    studentId,
    before: "Foto atualizada",
    after: "Foto removida",
  });
}

/**
 * Limpeza best-effort chamada por `studentService.deleteStudent` ao
 * excluir o cadastro inteiro do aluno. Diferente de
 * `removeStudentPhoto`, aqui não há documento `students/{id}` para
 * atualizar (está sendo excluído em seguida) nem log de auditoria
 * específico de foto (a exclusão do aluno em si não é auditada hoje,
 * então não introduzimos assimetria auditando só a foto). Erros são
 * engolidos propositalmente — mesma decisão de `logAuditEvent`: uma
 * falha ao limpar o Cloudinary nunca deve impedir a exclusão do aluno.
 */
export async function deleteStudentPhotoObject(studentId: string): Promise<void> {
  try {
    await deletePhotoObject(studentId);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[studentPhotoService] Falha ao limpar foto no Cloudinary", studentId, error);
  }
}

async function deletePhotoObject(studentId: string): Promise<void> {
  const idToken = await currentIdToken();
  const response = await fetch(`/api/student-photo/${studentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível remover a foto. Tente novamente."));
  }
}
