import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_ACADEMIC_SETTINGS,
  type AcademicSettings,
  type AcademicSettingsInput,
} from "@/types/academicSettings";

const COLLECTION = "academicSettings";

function docId(schoolYear: number): string {
  return String(schoolYear);
}

function toSettings(schoolYear: number, data: Record<string, unknown> | undefined): AcademicSettings {
  if (!data) {
    return { schoolYear, ...DEFAULT_ACADEMIC_SETTINGS, updatedAt: null };
  }
  return {
    schoolYear,
    passingAverage: (data.passingAverage as number) ?? DEFAULT_ACADEMIC_SETTINGS.passingAverage,
    recoveryThreshold: (data.recoveryThreshold as number) ?? DEFAULT_ACADEMIC_SETTINGS.recoveryThreshold,
    minAttendanceRate: (data.minAttendanceRate as number) ?? DEFAULT_ACADEMIC_SETTINGS.minAttendanceRate,
    termsCount: (data.termsCount as number) ?? DEFAULT_ACADEMIC_SETTINGS.termsCount,
    updatedAt: data.updatedAt,
  };
}

/**
 * Busca a configuração acadêmica de UM ano letivo. Leitura direta por
 * ID (o ID do documento é o próprio ano) — nunca uma query, então não
 * exige índice. Quando o ano ainda não foi configurado por um admin,
 * retorna os valores padrão (`DEFAULT_ACADEMIC_SETTINGS`) em vez de
 * `null` — todo o resto do sistema (Notas, Boletim, Dashboard,
 * Relatórios) pode sempre confiar em receber uma configuração válida
 * daqui, sem precisar checar "e se não existir?" em cada tela.
 */
export async function getAcademicSettings(schoolYear: number): Promise<AcademicSettings> {
  const snapshot = await getDoc(doc(db, COLLECTION, docId(schoolYear)));
  return toSettings(schoolYear, snapshot.exists() ? snapshot.data() : undefined);
}

/**
 * Cria ou substitui a configuração acadêmica de um ano letivo. Só
 * admins podem chamar isso com sucesso (ver firestore.rules) — regras
 * acadêmicas (média mínima, frequência mínima) são uma decisão
 * institucional, não uma preferência de professor.
 */
export async function saveAcademicSettings(
  schoolYear: number,
  data: AcademicSettingsInput
): Promise<void> {
  await setDoc(doc(db, COLLECTION, docId(schoolYear)), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
