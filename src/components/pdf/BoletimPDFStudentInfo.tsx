import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { pdfColors } from "@/components/pdf/boletimPdfTheme";
import type { Student } from "@/types/student";
import type { SchoolClass } from "@/types/schoolClass";
import { BOLETIM_PERIOD_LABEL, type BoletimPeriod } from "@/types/boletim";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: pdfColors.line,
    borderRadius: 4,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  field: {
    width: "16.6%",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.ink400,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  value: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.ink900,
  },
});

/**
 * Bloco de identificação (itens 4–7 e 9 do briefing): Nome, Matrícula,
 * Turma, Série e Ano letivo/Período — os mesmos campos já exibidos no
 * card "Identificação do aluno" de `BoletimPage`/`MyBoletimPage`, sem
 * email/uid (item 9 do briefing: nada de dados desnecessários).
 */
export function BoletimPDFStudentInfo({
  student,
  schoolClass,
  schoolYear,
  period,
}: {
  student: Student;
  /**
   * `null` no Portal do Aluno (`MyBoletimPage`): a Security Rule de
   * `classes/{classId}` permite leitura apenas para staff
   * (`isActiveStaff()`), então o aluno nunca busca o documento da
   * turma — Turma/Série simplesmente não aparecem no PDF dele, o
   * mesmo comportamento já usado na tela (item 18 do briefing: nenhuma
   * consulta administrativa extra para alunos).
   */
  schoolClass: SchoolClass | null;
  schoolYear: number;
  period: BoletimPeriod;
}) {
  const fields = [
    { label: "Aluno", value: student.name },
    { label: "Matrícula", value: student.registrationNumber || "—" },
    ...(schoolClass
      ? [
          { label: "Turma", value: schoolClass.name },
          { label: "Série", value: schoolClass.grade || "—" },
        ]
      : []),
    { label: "Ano letivo", value: String(schoolYear) },
  ];

  return (
    <View style={styles.container}>
      {fields.map((field) => (
        <View key={field.label} style={styles.field}>
          <Text style={styles.label}>{field.label}</Text>
          <Text style={styles.value}>{field.value}</Text>
        </View>
      ))}
      <View style={styles.field}>
        <Text style={styles.label}>Período</Text>
        <Text style={styles.value}>{BOLETIM_PERIOD_LABEL[period]}</Text>
      </View>
    </View>
  );
}
