import { useState, type ReactElement } from "react";
import { FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { downloadPdfDocument } from "@/services/exports/exportPdf";
import { downloadExcelWorkbook, type ExportSheet } from "@/services/exports/exportWorkbook";

interface ExportButtonsProps {
  /** Nome do arquivo já sanitizado, sem extensão (ver `buildExportFileName`). */
  fileNameBase: string;
  /**
   * Constrói o documento PDF sob demanda — só chamado ao clicar em
   * "Exportar PDF". Omitido quando o PDF já é oferecido por outro botão
   * do próprio contexto (ex.: boletim individual, que reaproveita
   * `BoletimPdfDownloadButton`) — evita duas ações de PDF na mesma tela.
   */
  getPdfDocument?: () => ReactElement;
  /** Constrói as abas do Excel sob demanda — só chamado ao clicar em "Exportar Excel". */
  getExcelSheets: () => ExportSheet[];
  /** Quando `true`, nenhuma exportação é gerada; mostra o aviso de "sem dados" (item 31 do briefing). */
  isEmpty: boolean;
  className?: string;
}

/**
 * Ações de exportação reutilizadas em Relatórios e Frequência (item 7
 * do briefing: camada de exportação única, sem duplicar a lógica de
 * loading/erro/toast em cada tela). O PDF/Excel só é gerado no
 * clique — os dados exibidos na tela (já filtrados/paginados pelas
 * regras de permissão) são a única fonte usada.
 */
export function ExportButtons({ fileNameBase, getPdfDocument, getExcelSheets, isEmpty, className }: ExportButtonsProps) {
  const toast = useToast();
  const [busy, setBusy] = useState<"pdf" | "excel" | null>(null);

  function handleEmpty() {
    toast.info("Não há dados disponíveis para exportação com os filtros selecionados.");
  }

  async function handleExportPdf() {
    if (!getPdfDocument) return;
    if (isEmpty) return handleEmpty();
    setBusy("pdf");
    try {
      await downloadPdfDocument(getPdfDocument(), `${fileNameBase}.pdf`);
      toast.success("PDF gerado com sucesso.");
    } catch (error) {
      console.error("exports:pdf", error);
      toast.error("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  async function handleExportExcel() {
    if (isEmpty) return handleEmpty();
    setBusy("excel");
    try {
      await downloadExcelWorkbook(getExcelSheets(), `${fileNameBase}.xlsx`);
      toast.success("Excel gerado com sucesso.");
    } catch (error) {
      console.error("exports:excel", error);
      toast.error("Não foi possível gerar o Excel. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`flex shrink-0 items-center gap-2 ${className ?? ""}`}>
      {getPdfDocument && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleExportPdf}
          loading={busy === "pdf"}
          disabled={busy !== null}
          aria-label="Exportar em PDF"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          {busy === "pdf" ? "Gerando PDF..." : "PDF"}
        </Button>
      )}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleExportExcel}
        loading={busy === "excel"}
        disabled={busy !== null}
        aria-label="Exportar em Excel"
      >
        <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
        {busy === "excel" ? "Gerando Excel..." : "Excel"}
      </Button>
    </div>
  );
}
