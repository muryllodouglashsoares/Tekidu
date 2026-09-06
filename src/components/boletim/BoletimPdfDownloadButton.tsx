import { useEffect, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BoletimPDF } from "@/components/pdf/BoletimPDF";
import { getStudentBoletimPdfData, type BoletimPdfData } from "@/services/boletim/boletimPdfService";
import type { StudentBoletim } from "@/services/boletim/boletimService";
import type { Student } from "@/types/student";
import type { SchoolClass } from "@/types/schoolClass";
import type { BoletimPeriod } from "@/types/boletim";
import { describeFirebaseError } from "@/utils/firebaseError";

interface BoletimPdfDownloadButtonProps {
  student: Student;
  /** ID da turma — usado para reconsultar os bimestres no relatório anual (item 6 do briefing). */
  classId: string;
  /** `null` no Portal do Aluno (`MyBoletimPage`) — ver nota em `BoletimPDFStudentInfo`. */
  schoolClass: SchoolClass | null;
  schoolYear: number;
  period: BoletimPeriod;
  boletim: StudentBoletim;
}

/** Remove acentos/caracteres especiais para um nome de arquivo seguro em qualquer SO. */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Botão "Baixar boletim em PDF" (itens 16–17 do briefing). Ao ficar
 * visível, prepara os dados do PDF (`getStudentBoletimPdfData`) — para
 * o período "annual" isso busca os quatro bimestres em paralelo; para
 * um bimestre específico é praticamente instantâneo, pois reaproveita
 * o `boletim` já carregado pela página. Só depois de pronto o
 * `PDFDownloadLink` é renderizado, para o clique do usuário já
 * disparar o download em vez de esperar uma consulta ao Firestore.
 *
 * Usado tanto em `BoletimPage` (staff) quanto em `MyBoletimPage`
 * (aluno) — em ambos os casos o `student`/`boletim` já chegam
 * filtrados pelas mesmas regras de permissão da tela (item 18 do
 * briefing: o PDF nunca faz nenhuma consulta administrativa extra).
 */
export function BoletimPdfDownloadButton({
  student,
  classId,
  schoolClass,
  schoolYear,
  period,
  boletim,
}: BoletimPdfDownloadButtonProps) {
  const [pdfData, setPdfData] = useState<BoletimPdfData | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function prepare() {
    setPreparing(true);
    setError(null);
    try {
      const data = await getStudentBoletimPdfData(student.id, classId, schoolYear, period, boletim);
      setPdfData(data);
    } catch (err) {
      setError(describeFirebaseError(err, "boletim:pdf"));
    } finally {
      setPreparing(false);
    }
  }

  useEffect(() => {
    setPdfData(null);
    prepare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id, classId, schoolYear, period, boletim]);

  if (error) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={prepare}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Tentar gerar PDF novamente
      </Button>
    );
  }

  if (preparing || !pdfData) {
    return (
      <Button type="button" variant="secondary" size="sm" loading disabled>
        Preparando PDF...
      </Button>
    );
  }

  const fileName = `boletim-${slugify(student.registrationNumber || student.name)}-${schoolYear}${
    period === "annual" ? "" : `-bim${period}`
  }.pdf`;

  return (
    <PDFDownloadLink
      document={
        <BoletimPDF
          student={student}
          schoolClass={schoolClass}
          schoolYear={schoolYear}
          data={pdfData}
          generatedAt={new Date()}
        />
      }
      fileName={fileName}
    >
      {({ loading }) => (
        <Button type="button" variant="secondary" size="sm" loading={loading}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {loading ? "Preparando PDF..." : "Baixar boletim em PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
