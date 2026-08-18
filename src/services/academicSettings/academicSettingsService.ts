import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logAuditEvent } from "@/services/audit/auditService";
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
 * Serializa os três limiares configuráveis em uma única string legível
 * para o log de auditoria (Tarefa 4) — a estrutura de `AuditLog` só
 * tem um par `before`/`after` (não um por campo), então os três
 * valores viajam juntos, no mesmo formato dos dois lados da mudança.
 */
function describeThresholds(settings: {
  passingAverage: number;
  recoveryThreshold: number;
  minAttendanceRate: number;
}): string {
  return `média mínima: ${settings.passingAverage}, recuperação: ${settings.recoveryThreshold}, frequência mínima: ${settings.minAttendanceRate}%`;
}

/**
 * Cria ou substitui a configuração acadêmica de um ano letivo. Só
 * admins podem chamar isso com sucesso (ver firestore.rules) — regras
 * acadêmicas (média mínima, frequência mínima) são uma decisão
 * institucional, não uma preferência de professor.
 *
 * Registra um evento de auditoria (Tarefa 4, Fase 1 pós-auditoria V8):
 * antes desta mudança, alterar a régua de aprovação de todo um ano
 * letivo não deixava nenhum rastro. Busca a configuração ANTERIOR
 * (`getAcademicSettings`, que já cai para os padrões do sistema
 * quando o ano ainda não tinha configuração própria) antes de
 * sobrescrever, para que `before` reflita o estado real anterior —
 * inclusive na primeira configuração de um ano novo (nesse caso,
 * `before` descreve os valores padrão do sistema, não `null`, já que
 * "não configurado" e "usando o padrão" são o mesmo estado efetivo
 * para quem lê o log). Segue o comportamento "fire-and-forget" já
 * documentado em `auditService.ts`: uma falha ao logar nunca deve
 * impedir a configuração de ser salva.
 */
export async function saveAcademicSettings(
  schoolYear: number,
  data: AcademicSettingsInput,
  actor: { id: string; name: string }
): Promise<void> {
  const before = await getAcademicSettings(schoolYear);

  await setDoc(doc(db, COLLECTION, docId(schoolYear)), {
    ...data,
    updatedAt: serverTimestamp(),
  });

  logAuditEvent({
    type: "academic_settings_updated",
    actorId: actor.id,
    actorName: actor.name,
    before: describeThresholds(before),
    after: describeThresholds(data),
  });
}
