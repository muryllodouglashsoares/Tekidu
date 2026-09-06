import { View, Text, StyleSheet, Svg, Path, Circle } from "@react-pdf/renderer";
import { pdfColors } from "@/components/pdf/boletimPdfTheme";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 16,
  },
  markWrap: {
    width: 64,
    backgroundColor: pdfColors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    backgroundColor: pdfColors.brand900,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  brand: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.surface,
    letterSpacing: 1.5,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.ink200,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});

/**
 * Cabeçalho institucional (item 15 do briefing): reproduz o mesmo
 * traço diagonal + ponto de `components/ui/BrandMark.tsx` usando as
 * primitivas de SVG do `@react-pdf/renderer`, para o documento carregar
 * a identidade visual real do Tekidu em vez de "El Dorado Academy" (a
 * marca da imagem de referência) — sem depender de um arquivo de
 * imagem externo, que poderia falhar ao carregar (item 26 do briefing).
 */
export function BoletimPDFHeader({ title }: { title: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.markWrap}>
        <Svg width={28} height={28} viewBox="0 0 24 24">
          <Path d="M5 19 L18 6" stroke={pdfColors.brand900} strokeWidth={1.8} strokeLinecap="round" />
          <Circle cx={18.5} cy={5.5} r={2.2} fill={pdfColors.brand900} />
        </Svg>
      </View>
      <View style={styles.body}>
        <Text style={styles.brand}>TEKIDU</Text>
        <Text style={styles.subtitle}>{title}</Text>
      </View>
    </View>
  );
}
