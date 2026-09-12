/**
 * Geração de planilhas .xlsx inteiramente no navegador (itens 4, 13 e
 * 14 do briefing): nenhuma requisição a servidor, nenhuma Cloud
 * Function — só o `exceljs` (biblioteca open-source, MIT), carregado
 * sob demanda (dynamic import) para não engordar o bundle inicial das
 * páginas de Relatórios/Frequência.
 *
 * Por que `exceljs` e não `xlsx` (SheetJS)? A versão gratuita do
 * `xlsx` (SheetJS Community Edition) não aplica estilo de célula
 * (negrito/cor de cabeçalho), congelamento de painel nem autofiltro —
 * esses recursos ficam restritos à edição paga. Como o briefing pede
 * explicitamente cabeçalho destacado, congelamento e filtro automático
 * (itens 18/34), `exceljs` é a biblioteca gratuita que cobre esses
 * requisitos sem custo adicional.
 */

/** Uma coluna da planilha: cabeçalho, largura e como extrair/formatar o valor de cada linha. */
export interface ExportColumn<T> {
  header: string;
  width?: number;
  /** Formato numérico do Excel (ex.: "0.0", "0.0%", "dd/mm/yyyy"). Omitido = texto/valor bruto. */
  numFmt?: string;
  /**
   * Sintaxe de método (não propriedade-arrow): TypeScript checa os
   * parâmetros de métodos de forma bivariante, permitindo que
   * `ExportSheet<Specifico>` seja atribuído a `ExportSheet<unknown>`
   * ao combinar abas de tipos diferentes em um único array — sem
   * precisar de `any` para isso.
   */
  value(row: T): string | number | null;
}

export interface ExportSheet<T = unknown> {
  name: string;
  columns: ExportColumn<T>[];
  rows: T[];
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Constrói o workbook a partir de uma ou mais abas (item 15 do
 * briefing: abas só quando fazem sentido para os dados reais) e
 * dispara o download. Cada aba recebe cabeçalho em negrito com fundo,
 * largura de coluna adequada, congelamento da primeira linha e
 * autofiltro — mantendo a planilha utilizável no Excel/LibreOffice
 * (item 18), sem cores excessivas ou elementos decorativos.
 */
export async function downloadExcelWorkbook(sheets: ExportSheet[], fileName: string): Promise<void> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tekidu";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name, {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.columns = sheet.columns.map((col) => ({
      header: col.header,
      width: col.width ?? 18,
      style: col.numFmt ? { numFmt: col.numFmt } : undefined,
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF24397F" } };
    headerRow.alignment = { vertical: "middle" };

    for (const row of sheet.rows) {
      worksheet.addRow(sheet.columns.map((col) => col.value(row)));
    }

    if (sheet.rows.length > 0) {
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheet.columns.length },
      };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, fileName);
}
