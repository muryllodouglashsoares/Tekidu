import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { pdfColors, pdfShared, formatAverage, formatAttendance, situationStyle } from "@/components/pdf/boletimPdfTheme";
import type { AssessmentTerm } from "@/types/assessment";
import type { BoletimPdfDisciplineRow } from "@/services/boletim/boletimPdfService";

const TERM_SHORT_LABEL: Record<AssessmentTerm, string> = {
  "1": "1º BIM",
  "2": "2º BIM",
  "3": "3º BIM",
  "4": "4º BIM",
};

const styles = StyleSheet.create({
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
  disciplineCell: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.ink900,
  },
  finalAverageCell: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.ink900,
  },
  situationPill: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  situationText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
  },
  emptyRow: {
    paddingVertical: 14,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 9,
    color: pdfColors.ink400,
  },
});

/** Larguras de coluna: Disciplina cresce, bimestres/média/frequência/situação têm largura fixa proporcional. */
function getColumnWidths(termCount: number) {
  const fixedColumns = termCount + 3; // + Média + Frequência + Situação
  const disciplineWidth = 26;
  const remaining = 100 - disciplineWidth;
  const fixedWidth = remaining / fixedColumns;
  return { disciplineWidth, fixedWidth };
}

/**
 * Tabela "ACADEMICS" da imagem de referência, adaptada (item 6 do
 * briefing): no relatório anual mostra as 4 colunas de bimestre
 * ("1º BIM".."4º BIM", nunca "Q1".."Q4" — item 5), e no relatório de um
 * bimestre específico mostra apenas a coluna daquele período. Os
 * valores exibidos são exatamente os já calculados por
 * `getStudentBoletim`/`getStudentBoletimPdfData` — este componente só
 * apresenta, nunca recalcula (item 23 do briefing).
 */
export function BoletimPDFTable({ rows }: { rows: BoletimPdfDisciplineRow[] }) {
  if (rows.length === 0) {
    return (
      <View style={pdfShared.box}>
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>Nenhuma disciplina vinculada a esta turma no período selecionado.</Text>
        </View>
      </View>
    );
  }

  const terms = rows[0].terms.map((t) => t.term);
  const { disciplineWidth, fixedWidth } = getColumnWidths(terms.length);

  return (
    <View style={pdfShared.box}>
      <View style={[pdfShared.sectionBar, styles.headerRow, { paddingVertical: 7 }]}>
        <Text style={[styles.headerCell, { width: `${disciplineWidth}%` }]}>Disciplina</Text>
        {terms.map((term) => (
          <Text key={term} style={[styles.headerCell, { width: `${fixedWidth}%`, textAlign: "center" }]}>
            {TERM_SHORT_LABEL[term]}
          </Text>
        ))}
        <Text style={[styles.headerCell, { width: `${fixedWidth}%`, textAlign: "center" }]}>Média</Text>
        <Text style={[styles.headerCell, { width: `${fixedWidth}%`, textAlign: "center" }]}>Frequência</Text>
        <Text style={[styles.headerCell, { width: `${fixedWidth}%`, textAlign: "center" }]}>Situação</Text>
      </View>

      {rows.map((row, index) => {
        const status = situationStyle(row.situation);
        return (
          <View
            key={row.discipline.id}
            style={index % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}
            wrap={false}
          >
            <Text style={[styles.disciplineCell, { width: `${disciplineWidth}%`, paddingLeft: 8 }]}>
              {row.discipline.name}
            </Text>
            {row.terms.map((term) => (
              <Text key={term.term} style={[styles.cell, { width: `${fixedWidth}%`, textAlign: "center" }]}>
                {formatAverage(term.average)}
              </Text>
            ))}
            <Text style={[styles.finalAverageCell, { width: `${fixedWidth}%`, textAlign: "center" }]}>
              {formatAverage(row.finalAverage)}
            </Text>
            <Text style={[styles.cell, { width: `${fixedWidth}%`, textAlign: "center" }]}>
              {formatAttendance(row.attendanceRate)}
            </Text>
            <View style={{ width: `${fixedWidth}%`, alignItems: "center" }}>
              <View style={[styles.situationPill, { backgroundColor: status.background }]}>
                <Text style={[styles.situationText, { color: status.color }]}>{status.label}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
