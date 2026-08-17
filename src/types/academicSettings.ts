import { PASSING_THRESHOLD, RECOVERY_THRESHOLD } from "@/types/grade";
import { ATTENDANCE_ATTENTION_THRESHOLD } from "@/types/attendance";

/**
 * Formato do documento em: academicSettings/{schoolYear}
 *
 * Item 6/7 do plano de consolidação V8 ("Tornar as regras acadêmicas
 * configuráveis" + "Criar o conceito de Ano Letivo"): antes desta
 * entidade, `PASSING_THRESHOLD`/`RECOVERY_THRESHOLD`
 * (types/grade.ts) e `ATTENDANCE_ATTENTION_THRESHOLD`
 * (types/attendance.ts) eram os ÚNICOS valores possíveis — fixos no
 * código, iguais para qualquer ano letivo. `academicSettings` permite
 * que cada ano letivo tenha sua própria configuração, sem exigir
 * alterar/reimplantar a aplicação.
 *
 * O ID do documento é o próprio ano letivo (`String(schoolYear)`), não
 * um ID gerado — cada ano tem no máximo uma configuração, então a
 * leitura é direta por ID (`getDoc`), sem necessidade de query nem de
 * índice.
 *
 * Quando não existe um documento para o ano consultado (ano letivo
 * novo, ainda não configurado por um admin), o sistema usa
 * `DEFAULT_ACADEMIC_SETTINGS` — os mesmos valores que já eram
 * hardcoded antes desta versão — em vez de bloquear qualquer tela que
 * dependa de uma configuração ainda inexistente.
 */
export interface AcademicSettings {
  schoolYear: number;
  /** Média mínima para aprovação direta (escala 0–10). */
  passingAverage: number;
  /** Média mínima para entrar em recuperação em vez de reprovar direto. */
  recoveryThreshold: number;
  /** Frequência mínima exigida, em percentual (0–100). */
  minAttendanceRate: number;
  /** Quantidade de bimestres/períodos do ano letivo. Fixo em 4 nesta
   * versão (ver `AssessmentTerm` em types/assessment.ts) — armazenado
   * aqui para permitir configurações futuras (trimestre/semestre) sem
   * quebrar o formato do documento. */
  termsCount: number;
  updatedAt: unknown; // Firestore Timestamp
}

/** Payload aceito ao salvar a configuração de um ano letivo. */
export interface AcademicSettingsInput {
  passingAverage: number;
  recoveryThreshold: number;
  minAttendanceRate: number;
  termsCount: number;
}

/**
 * Valores padrão usados quando o ano letivo consultado ainda não tem
 * uma configuração própria salva em `academicSettings`. Espelham
 * exatamente os antigos valores fixos (`PASSING_THRESHOLD`,
 * `RECOVERY_THRESHOLD`, `ATTENDANCE_ATTENTION_THRESHOLD`) para que a
 * introdução desta entidade não mude o comportamento de nenhum ano
 * letivo já em uso até que um admin configure algo diferente.
 */
export const DEFAULT_ACADEMIC_SETTINGS: Omit<AcademicSettings, "schoolYear" | "updatedAt"> = {
  passingAverage: PASSING_THRESHOLD,
  recoveryThreshold: RECOVERY_THRESHOLD,
  minAttendanceRate: ATTENDANCE_ATTENTION_THRESHOLD,
  termsCount: 4,
};

export function validateAcademicSettingsInput(input: AcademicSettingsInput): string | null {
  if (input.recoveryThreshold >= input.passingAverage) {
    return "A média mínima para recuperação deve ser menor que a média mínima para aprovação.";
  }
  if (input.passingAverage < 0 || input.passingAverage > 10) {
    return "A média mínima para aprovação deve estar entre 0 e 10.";
  }
  if (input.recoveryThreshold < 0 || input.recoveryThreshold > 10) {
    return "A média mínima para recuperação deve estar entre 0 e 10.";
  }
  if (input.minAttendanceRate < 0 || input.minAttendanceRate > 100) {
    return "A frequência mínima deve estar entre 0% e 100%.";
  }
  if (input.termsCount < 1 || input.termsCount > 12) {
    return "A quantidade de bimestres deve estar entre 1 e 12.";
  }
  return null;
}
