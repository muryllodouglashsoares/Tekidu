import type { ReactElement } from "react";

/**
 * Renderiza um documento `@react-pdf/renderer` para Blob e dispara o
 * download — sem servidor, sem Cloud Function (item 4 do briefing).
 * `@react-pdf/renderer` já é dependência do projeto (usado pelo
 * boletim); importado aqui via dynamic import para não acoplar seu
 * carregamento ao bundle inicial de Relatórios/Frequência quando essas
 * páginas não passam por `BoletimPdfDownloadButton`.
 */
export async function downloadPdfDocument(document: ReactElement, fileName: string): Promise<void> {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(document).toBlob();
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = fileName;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
