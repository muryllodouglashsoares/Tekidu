import { StyleSheet } from "@react-pdf/renderer";
import { BOLETIM_STATUS_LABEL, type BoletimStatus } from "@/types/boletim";
import { ACADEMIC_SITUATION_LABEL, type AcademicSituation } from "@/types/grade";

/**
 * Paleta usada no PDF — os mesmos valores de `--tk-*` definidos em
 * `src/index.css` (tema claro), convertidos para hex porque
 * `@react-pdf/renderer` não lê variáveis CSS. Mantido em um único
 * lugar para o PDF continuar visualmente alinhado ao restante do
 * Tekidu caso a paleta mude no futuro.
 */
export const pdfColors = {
  ink900: "#1E293B", // texto principal
  ink600: "#475569",
  ink500: "#64748B",
  ink400: "#94A3B8",
  ink300: "#CBD5E1",
  ink200: "#E2E8F0",
  ink100: "#F1F5F9",
  ink50: "#F8FAFC",
  brand700: "#3B5FCF", // azul de identidade (ação principal)
  brand800: "#2F4BA8",
  brand900: "#24397F",
  paper: "#F3F5F9",
  surface: "#FFFFFF",
  line: "#E2E8F0",
  success50: "#ECFDF5",
  success600: "#059669",
  success700: "#047857",
  danger50: "#FEF2F2",
  danger100: "#FEE2E2",
  danger600: "#DC2626",
  honors50: "#FEF2F2",
  honors600: "#DC2626",
};

/** Estilos reutilizados por mais de um componente do PDF. */
export const pdfShared = StyleSheet.create({
  sectionTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.surface,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionBar: {
    backgroundColor: pdfColors.brand900,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  box: {
    borderWidth: 1,
    borderColor: pdfColors.line,
    borderRadius: 4,
    overflow: "hidden",
  },
});

/** Formata uma média (escala 0–10) no padrão brasileiro: "8,0". */
export function formatAverage(value: number | null): string {
  if (value === null) return "—";
  return value.toFixed(1).replace(".", ",");
}

/** Formata um percentual de frequência: "92%". Nunca transforma ausência de dados em "0%". */
export function formatAttendance(value: number | null): string {
  if (value === null) return "—";
  const rounded = Number.isInteger(value) ? value : Math.round(value * 10) / 10;
  return `${String(rounded).replace(".", ",")}%`;
}

interface SituationStyle {
  label: string;
  background: string;
  color: string;
}

/** Mesma paleta semântica de `SituationBadge`/`AcademicStatusBadge` (interface web), adaptada ao PDF. */
export function situationStyle(situation: AcademicSituation): SituationStyle {
  switch (situation) {
    case "approved":
      return { label: ACADEMIC_SITUATION_LABEL[situation], background: pdfColors.success50, color: pdfColors.success700 };
    case "recovery":
      return { label: ACADEMIC_SITUATION_LABEL[situation], background: pdfColors.honors50, color: pdfColors.honors600 };
    case "failed":
      return { label: ACADEMIC_SITUATION_LABEL[situation], background: pdfColors.danger100, color: pdfColors.danger600 };
    default:
      return { label: ACADEMIC_SITUATION_LABEL[situation], background: pdfColors.ink100, color: pdfColors.ink500 };
  }
}

export function overallStatusStyle(status: BoletimStatus): SituationStyle {
  switch (status) {
    case "regular":
      return { label: BOLETIM_STATUS_LABEL[status], background: pdfColors.success50, color: pdfColors.success700 };
    case "attention":
    case "recovery":
      return { label: BOLETIM_STATUS_LABEL[status], background: pdfColors.honors50, color: pdfColors.honors600 };
    case "failed":
      return { label: BOLETIM_STATUS_LABEL[status], background: pdfColors.danger100, color: pdfColors.danger600 };
    default:
      return { label: BOLETIM_STATUS_LABEL[status], background: pdfColors.ink100, color: pdfColors.ink500 };
  }
}
