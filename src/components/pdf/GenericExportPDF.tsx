import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { BoletimPDFHeader } from "@/components/pdf/BoletimPDFHeader";
import { pdfColors, pdfShared } from "@/components/pdf/boletimPdfTheme";
import { formatExportDateTime } from "@/services/exports/exportFormat";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 44,
    paddingHorizontal: 32,
    fontFamily: "Helvetica",
    backgroundColor: pdfColors.surface,
  },
  subtitle: {
    marginBottom: 12,
    fontSize: 10,
    color: pdfColors.ink500,
  },
  metaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: pdfColors.line,
    borderRadius: 4,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  metaField: {
    minWidth: "25%",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.ink400,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.ink900,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: pdfColors.line,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  statLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.ink400,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.ink900,
  },
  tableTitle: {
    marginBottom: 6,
    marginTop: 14,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.ink900,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerCell: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.surface,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.line,
    paddingVertical: 6,
  },
  rowAlt: {
    backgroundColor: pdfColors.ink50,
  },
  cell: {
    fontSize: 8.5,
    color: pdfColors.ink600,
  },
  firstCell: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.ink900,
  },
  emptyRow: {
    paddingVertical: 14,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 9,
    color: pdfColors.ink400,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: pdfColors.line,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: pdfColors.ink400,
  },
});

export interface PdfTableColumn {
  label: string;
  /** Largura em porcentagem (0–100). As colunas de uma tabela devem somar ~100. */
  width: number;
  align?: "left" | "center" | "right";
}

export interface PdfTableSpec {
  title?: string;
  columns: PdfTableColumn[];
  rows: string[][];
  emptyMessage: string;
}

export interface PdfMetaField {
  label: string;
  value: string;
}

export interface PdfStat {
  label: string;
  value: string;
}

export interface GenericExportPdfProps {
  documentTitle: string;
  headerTitle: string;
  meta: PdfMetaField[];
  stats?: PdfStat[];
  tables: PdfTableSpec[];
  generatedAt: Date;
}

/**
 * Documento PDF genérico reutilizado por Relatórios e Frequência (item
 * 7 do briefing: uma camada de exportação reutilizável em vez de um
 * documento por tela). Reaproveita o cabeçalho institucional e a
 * paleta já usados no PDF do Boletim (`BoletimPDFHeader`/`boletimPdfTheme`)
 * para a exportação parecer uma extensão natural da Tekidu — nenhum
 * dado é calculado aqui, tudo já chega pronto de
 * `services/exports/*ExportService.ts`.
 */
export function GenericExportPDF({
  documentTitle,
  headerTitle,
  meta,
  stats,
  tables,
  generatedAt,
}: GenericExportPdfProps) {
  return (
    <Document title={documentTitle} author="Tekidu">
      <Page size="A4" style={styles.page} wrap>
        <View fixed>
          <BoletimPDFHeader title={headerTitle} />
        </View>

        {meta.length > 0 && (
          <View style={styles.metaContainer}>
            {meta.map((field) => (
              <View key={field.label} style={styles.metaField}>
                <Text style={styles.metaLabel}>{field.label}</Text>
                <Text style={styles.metaValue}>{field.value}</Text>
              </View>
            ))}
          </View>
        )}

        {stats && stats.length > 0 && (
          <View style={styles.statsRow}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.statBox}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
            ))}
          </View>
        )}

        {tables.map((table, tableIndex) => (
          <View key={table.title ?? tableIndex}>
            {table.title && <Text style={styles.tableTitle}>{table.title}</Text>}
            <PdfTable columns={table.columns} rows={table.rows} emptyMessage={table.emptyMessage} />
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Documento gerado eletronicamente pelo Tekidu — {formatExportDateTime(generatedAt)}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

function PdfTable({
  columns,
  rows,
  emptyMessage,
}: {
  columns: PdfTableColumn[];
  rows: string[][];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <View style={pdfShared.box}>
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={pdfShared.box}>
      <View style={[pdfShared.sectionBar, styles.headerRow, { paddingVertical: 7 }]}>
        {columns.map((col) => (
          <Text
            key={col.label}
            style={[styles.headerCell, { width: `${col.width}%`, textAlign: col.align ?? "left" }]}
          >
            {col.label}
          </Text>
        ))}
      </View>

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={rowIndex % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row} wrap={false}>
          {row.map((cellValue, cellIndex) => (
            <Text
              key={cellIndex}
              style={[
                cellIndex === 0 ? styles.firstCell : styles.cell,
                {
                  width: `${columns[cellIndex]?.width ?? 0}%`,
                  textAlign: columns[cellIndex]?.align ?? "left",
                  paddingLeft: cellIndex === 0 ? 8 : 0,
                },
              ]}
            >
              {cellValue}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}
