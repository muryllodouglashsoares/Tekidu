import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { pdfColors, pdfShared, formatAverage, formatAttendance, overallStatusStyle } from "@/components/pdf/boletimPdfTheme";
import type { AcademicSettings } from "@/types/academicSettings";
import type { BoletimStatus } from "@/types/boletim";

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  column: {
    flex: 1,
  },
  body: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: pdfColors.line,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 46,
    justifyContent: "center",
  },
  remarkText: {
    fontSize: 9,
    color: pdfColors.ink600,
    lineHeight: 1.4,
  },
  gradingLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  gradingLabel: {
    fontSize: 8.5,
    color: pdfColors.ink500,
  },
  gradingValue: {
    fontSize: 8.5,
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
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  statusPillText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
});

/**
 * Mensagem automática de observações (item 14 do briefing) — derivada
 * da situação geral já calculada pelo boletim, nunca um comentário
 * inventado. Não existe campo de texto livre no `StudentBoletim`, então
 * o PDF não pode exibir nenhuma observação que a interface web não
 * mostraria.
 */
function remarkFor(status: BoletimStatus): string {
  switch (status) {
    case "regular":
      return "Situação acadêmica: Regular. O aluno não apresenta pendências neste período.";
    case "attention":
      return "Aluno com frequência abaixo do mínimo exigido em uma ou mais disciplinas.";
    case "recovery":
      return "Aluno em recuperação em uma ou mais disciplinas neste período.";
    case "failed":
      return "Aluno em situação de reprovação em uma ou mais disciplinas, ou com frequência crítica.";
    default:
      return "Ainda não há dados acadêmicos suficientes para avaliar a situação deste aluno no período selecionado.";
  }
}

/** "REMARKS" + "GRADING SYSTEM" da imagem de referência, adaptados às regras reais do Tekidu (itens 13–14). */
export function BoletimPDFRemarksAndGrading({
  overallStatus,
  settings,
}: {
  overallStatus: BoletimStatus;
  settings: AcademicSettings;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.column}>
        <View style={pdfShared.sectionBar}>
          <Text style={pdfShared.sectionTitle}>Observações</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.remarkText}>{remarkFor(overallStatus)}</Text>
        </View>
      </View>

      <View style={styles.column}>
        <View style={pdfShared.sectionBar}>
          <Text style={pdfShared.sectionTitle}>Sistema de avaliação</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.gradingLine}>
            <Text style={styles.gradingLabel}>Escala de notas</Text>
            <Text style={styles.gradingValue}>0,0 — 10,0</Text>
          </View>
          <View style={styles.gradingLine}>
            <Text style={styles.gradingLabel}>Aprovação (média mínima)</Text>
            <Text style={styles.gradingValue}>{formatAverage(settings.passingAverage)}</Text>
          </View>
          <View style={styles.gradingLine}>
            <Text style={styles.gradingLabel}>Recuperação (média mínima)</Text>
            <Text style={styles.gradingValue}>{formatAverage(settings.recoveryThreshold)}</Text>
          </View>
          <View style={styles.gradingLine}>
            <Text style={styles.gradingLabel}>Frequência mínima exigida</Text>
            <Text style={styles.gradingValue}>{formatAttendance(settings.minAttendanceRate)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Resumo geral (item 10 do briefing): média, frequência, disciplinas e situação — mesmos indicadores de `BoletimSummary`. */
export function BoletimPDFOverallStats({
  overallAverage,
  overallAttendanceRate,
  disciplineCount,
  overallStatus,
}: {
  overallAverage: number | null;
  overallAttendanceRate: number | null;
  disciplineCount: number;
  overallStatus: BoletimStatus;
}) {
  const status = overallStatusStyle(overallStatus);

  return (
    <View style={styles.statsRow}>
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>Média geral</Text>
        <Text style={styles.statValue}>{formatAverage(overallAverage)}</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>Frequência geral</Text>
        <Text style={styles.statValue}>{formatAttendance(overallAttendanceRate)}</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>Disciplinas</Text>
        <Text style={styles.statValue}>{disciplineCount}</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>Situação geral</Text>
        <View style={[styles.statusPill, { backgroundColor: status.background }]}>
          <Text style={[styles.statusPillText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
    </View>
  );
}
