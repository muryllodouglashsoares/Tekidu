import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { BoletimPDFHeader } from "@/components/pdf/BoletimPDFHeader";
import { BoletimPDFStudentInfo } from "@/components/pdf/BoletimPDFStudentInfo";
import { BoletimPDFRemarksAndGrading, BoletimPDFOverallStats } from "@/components/pdf/BoletimPDFSummary";
import { BoletimPDFTable } from "@/components/pdf/BoletimPDFTable";
import { pdfColors } from "@/components/pdf/boletimPdfTheme";
import type { Student } from "@/types/student";
import type { SchoolClass } from "@/types/schoolClass";
import type { BoletimPdfData } from "@/services/boletim/boletimPdfService";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 44,
    paddingHorizontal: 32,
    fontFamily: "Helvetica",
    backgroundColor: pdfColors.surface,
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

interface BoletimPDFProps {
  student: Student;
  schoolClass: SchoolClass | null;
  schoolYear: number;
  data: BoletimPdfData;
  generatedAt: Date;
}

/**
 * Documento principal do boletim em PDF (item 8 do briefing). Reúne os
 * subcomponentes de apresentação — nenhum deles recalcula nota,
 * frequência ou situação: tudo já vem pronto de `BoletimPdfData`
 * (`services/boletim/boletimPdfService.ts`), que por sua vez reaproveita
 * `getStudentBoletim` (item 23: a regra fica nos services/types, o PDF
 * só apresenta).
 *
 * Página A4, com o cabeçalho institucional repetido em todas as
 * páginas (`fixed`) caso a tabela precise continuar em uma segunda
 * página (item 21 do briefing).
 */
export function BoletimPDF({ student, schoolClass, schoolYear, data, generatedAt }: BoletimPDFProps) {
  const title = data.period === "annual" ? "Boletim Acadêmico — Relatório Anual" : "Boletim Acadêmico";

  return (
    <Document title={`Boletim - ${student.name}`} author="Tekidu">
      <Page size="A4" style={styles.page} wrap>
        <View fixed>
          <BoletimPDFHeader title={title} />
        </View>

        <BoletimPDFStudentInfo
          student={student}
          schoolClass={schoolClass}
          schoolYear={schoolYear}
          period={data.period}
        />

        <BoletimPDFOverallStats
          overallAverage={data.overallAverage}
          overallAttendanceRate={data.overallAttendanceRate}
          disciplineCount={data.disciplines.length}
          overallStatus={data.overallStatus}
        />

        <BoletimPDFRemarksAndGrading overallStatus={data.overallStatus} settings={data.settings} />

        <BoletimPDFTable rows={data.disciplines} />

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Documento gerado eletronicamente pelo Tekidu — {formatDateTime(generatedAt)}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
