import {
  ACCEPTED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  documentTypeFromMimeType,
  isAcceptedDocumentMimeType,
  type AbsenceJustificationDocumentType,
} from "@/types/absenceJustification";

export interface PreparedJustificationDocument {
  documentData: string;
  documentName: string;
  documentType: AbsenceJustificationDocumentType;
  documentSize: number;
}

/**
 * Valida um arquivo ANTES do processamento (seção 9 do prompt) —
 * formato e tamanho. Chamada tanto pelo componente de upload (feedback
 * imediato ao selecionar, antes de qualquer compressão) quanto, para
 * PDFs, dentro de `prepareJustificationDocument` (PDF não pode ser
 * comprimido no navegador, então o limite aqui é definitivo para esse
 * tipo — ver nota de arquitetura em `types/absenceJustification.ts`).
 */
export function validateJustificationDocument(file: File): string | null {
  if (!isAcceptedDocumentMimeType(file.type)) {
    return "Formato não suportado. Envie uma imagem (JPG, PNG, WEBP) ou um PDF.";
  }
  if (file.type === "application/pdf" && file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return `PDFs não podem ser reduzidos automaticamente. Envie um arquivo de até ${formatFileSize(
      MAX_DOCUMENT_SIZE_BYTES
    )} (dica: escaneie em resolução mais baixa ou em preto e branco).`;
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renameToJpeg(originalName: string): string {
  const withoutExtension = originalName.replace(/\.[a-zA-Z0-9]+$/, "");
  return `${withoutExtension || "documento"}.jpg`;
}

/**
 * Comprime uma imagem no próprio navegador (Canvas API) até caber em
 * `maxBytes`, reduzindo qualidade e, se necessário, dimensões — feito
 * inteiramente no cliente, sem nenhum serviço externo. Sempre
 * reencoda como JPEG (melhor taxa de compressão para fotos de
 * documento; a eventual transparência de um PNG/WEBP de entrada não
 * importa aqui, o conteúdo é uma foto de atestado, não uma imagem com
 * fundo transparente).
 *
 * Retorna o arquivo original sem alterações se ele já couber, ou se o
 * tipo não for uma imagem (PDF não passa por aqui).
 */
export async function compressImageIfNeeded(file: File, maxBytes: number): Promise<File> {
  if (file.type === "application/pdf" || file.size <= maxBytes) return file;

  const bitmap = await createImageBitmap(file);
  try {
    const qualitySteps = [0.8, 0.65, 0.5, 0.35, 0.2];
    const scaleSteps = [1, 0.75, 0.5];

    for (const scale of scaleSteps) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of qualitySteps) {
        // eslint-disable-next-line no-await-in-loop
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", quality)
        );
        if (blob && blob.size <= maxBytes) {
          return new File([blob], renameToJpeg(file.name), { type: "image/jpeg" });
        }
      }
    }

    // Nenhuma combinação coube no limite — devolve a menor tentativa
    // (qualidade mínima, menor escala) para que a validação de
    // tamanho, feita em seguida por quem chamou, rejeite com uma
    // mensagem clara em vez de travar o fluxo silenciosamente.
    const canvas = document.createElement("canvas");
    const smallestScale = scaleSteps[scaleSteps.length - 1];
    canvas.width = Math.max(1, Math.round(bitmap.width * smallestScale));
    canvas.height = Math.max(1, Math.round(bitmap.height * smallestScale));
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const finalBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", qualitySteps[qualitySteps.length - 1])
    );
    return finalBlob ? new File([finalBlob], renameToJpeg(file.name), { type: "image/jpeg" }) : file;
  } finally {
    bitmap.close();
  }
}

/** Lê um arquivo como data URI (`data:<mime>;base64,<...>`) via FileReader — nenhuma chamada de rede envolvida. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

/**
 * Orquestra o preparo do documento comprobatório inteiramente no
 * cliente (seção 8/9 do prompt, adaptado para o plano gratuito — ver
 * nota de arquitetura em `types/absenceJustification.ts`): comprime a
 * imagem se necessário, valida formato/tamanho final e codifica em
 * base64. Não há upload nem I/O de rede aqui — o resultado é gravado
 * pelo chamador (`absenceJustificationService.submitAbsenceJustification`)
 * como parte do MESMO `setDoc` da justificativa, o que elimina por
 * completo o problema de "arquivo órfão" que existiria com um serviço
 * de armazenamento externo (upload bem-sucedido + gravação do
 * Firestore falhando): aqui é tudo um único documento, uma única
 * escrita, atômica.
 */
export async function prepareJustificationDocument(file: File): Promise<PreparedJustificationDocument> {
  const initialError = validateJustificationDocument(file);
  if (initialError) throw new Error(initialError);

  const processedFile = await compressImageIfNeeded(file, MAX_DOCUMENT_SIZE_BYTES);

  if (processedFile.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error(
      `Não foi possível reduzir a imagem o suficiente (ainda ${formatFileSize(
        processedFile.size
      )}, o máximo é ${formatFileSize(
        MAX_DOCUMENT_SIZE_BYTES
      )}). Tente uma foto com menos detalhes, melhor iluminação ou em outro ângulo.`
    );
  }

  const documentData = await fileToDataUrl(processedFile);

  return {
    documentData,
    documentName: file.name,
    documentType: documentTypeFromMimeType(file.type),
    documentSize: processedFile.size,
  };
}

export const ACCEPTED_DOCUMENT_INPUT_ACCEPT = ACCEPTED_DOCUMENT_MIME_TYPES.join(",");
