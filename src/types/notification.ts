/**
 * Formato do documento em: notifications/{notificationId}
 *
 * Fase 5 do plano de evolução ("Sistema de notificações"). Segue a
 * MESMA estrutura de decisão já usada em `types/auditLog.ts`: um tipo
 * enumerado curto, específico de cada evento, em vez de um campo de
 * texto livre — isso é o que permite à Command Palette/centro de
 * notificações decidir o ÍCONE e o LINK de destino sem precisar
 * interpretar texto.
 *
 * ESCOPO DA ETAPA 5: implementar a estrutura completa (tipo, service,
 * regras, índice, UI no Header com todos os estados) e ligá-la a um
 * subconjunto representativo de eventos reais — um por perfil citado
 * no prompt (aluno: nota lançada; professor: disciplina vinculada;
 * admin: novo usuário) — em vez de instrumentar TODAS as ações
 * possíveis do sistema de uma vez, o que arriscaria notificações
 * inconsistentes/duplicadas em fluxos ainda não revisados.
 *
 * ETAPA 6 (expansão): três novos tipos, cada um ligado a um evento que
 * passa no teste "tem valor real para quem recebe":
 * - `assessment_created`/`assessment_updated`: o aluno passa a saber
 *   que uma avaliação foi cadastrada/renomeada para sua disciplina
 *   ANTES do dia da prova, não só depois que a nota é lançada
 *   (`grade_posted` já cobre esse segundo momento).
 * - `attendance_warning`: dispara só quando a frequência do aluno
 *   CRUZA o limiar mínimo configurado (`AcademicSettings.minAttendanceRate`
 *   — ver `academicSettingsService`), nunca a cada falta isolada. Ver
 *   `AttendancePage.handleMark`: a checagem compara o percentual ANTES
 *   e DEPOIS do lançamento, então uma segunda falta consecutiva já
 *   abaixo do limiar não gera uma segunda notificação.
 *
 * Deliberadamente NÃO adicionados nesta etapa (evitar notificação sem
 * valor real, mesmo critério acima):
 * - `attendance_recorded`: notificar toda aula lançada é ruído puro —
 *   o aluno já teria uma notificação por aula, a maioria delas
 *   "presente", sem nenhuma decisão a tomar a partir disso.
 * - `boletim_updated`: o boletim é derivado de `grades`/
 *   `attendanceRecords` em tempo de leitura (não é um documento
 *   próprio que muda) — o único evento real por trás de "o boletim
 *   mudou" já É `grade_posted`/`attendance_warning`; um evento
 *   adicional aqui duplicaria a notificação para a mesma mudança.
 * - `report_available`: não existe hoje nenhuma ação de "gerar/
 *   publicar relatório" em `/relatorios` (a tela é uma visão sempre
 *   ao vivo, sem um passo de "exportar/disponibilizar") — criar este
 *   evento sem uma ação real por trás inventaria uma notificação para
 *   nada. Fica pendente para quando `/relatorios` ganhar um fluxo de
 *   exportação/publicação de fato.
 *
 * Novos tipos de evento podem ser adicionados a este union e a
 * `notificationService.createNotification` sem alterar a estrutura.
 */
export type NotificationType =
  | "grade_posted"
  | "discipline_assigned"
  | "teacher_created"
  | "assessment_created"
  | "assessment_updated"
  | "attendance_warning";

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  grade_posted: "Nota lançada",
  discipline_assigned: "Disciplina vinculada",
  teacher_created: "Novo usuário",
  assessment_created: "Avaliação cadastrada",
  assessment_updated: "Avaliação atualizada",
  attendance_warning: "Alerta de frequência",
};

export interface Notification {
  id: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Caminho interno (ex.: "/notas") para navegar ao clicar. `null` = sem destino específico. */
  link: string | null;
  read: boolean;
  createdAt: unknown; // Firestore Timestamp
}

export interface NotificationInput {
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
}
