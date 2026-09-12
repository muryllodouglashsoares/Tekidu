/**
 * Formato do documento em: conversations/{conversationId}
 *
 * PARTE 1 do plano de evolução — Mensageria/chat interno (professor ↔
 * aluno). Segue o mesmo espírito de modelagem já usado no restante do
 * projeto: nenhuma coleção nova guarda uma cópia paralela de dados que
 * já existem em `students`/`disciplines` — ela apenas REFERENCIA esses
 * documentos pelo ID (`studentId`, `disciplineId`) e denormaliza só o
 * necessário para renderizar a lista de conversas sem uma leitura
 * extra por item (`studentName`/`teacherName`, mesmo padrão de
 * `Discipline.teacherName`).
 *
 * ID DO DOCUMENTO (determinístico): `{teacherUid}_{studentId}` — mesmo
 * racional de `gradeService.buildGradeId`/`attendanceRecordService.
 * buildAttendanceRecordId` (evita duplicar o par professor+aluno e
 * torna "encontrar ou criar a conversa" uma operação de leitura por ID,
 * nunca uma query). Um par professor+aluno tem NO MÁXIMO uma
 * conversa — mesmo que o vínculo exista em mais de uma disciplina,
 * `disciplineId` guarda apenas a disciplina usada para provar a
 * elegibilidade no momento da criação (ver `firestore.rules`), não uma
 * conversa por disciplina.
 *
 * `participantUids` contém os DOIS uids de Firebase Authentication
 * (nunca o `studentId` do roster) — é este campo que a Security Rule
 * usa para decidir quem pode ler a conversa (`request.auth.uid in
 * participantUids`), mesmo padrão de `academicEvents.ownerId`, mas
 * para dois participantes em vez de um.
 */
export interface Conversation {
  id: string;
  participantUids: string[];

  /** ID do documento em `students` (roster), NÃO o uid de Auth. */
  studentId: string;
  /** uid de Firebase Authentication do aluno — também presente em `participantUids`. */
  studentUid: string;
  /** Snapshot do nome do aluno no momento da criação da conversa. */
  studentName: string;

  /** uid de Firebase Authentication do professor — também presente em `participantUids`. */
  teacherUid: string;
  /** Snapshot do nome do professor no momento da criação da conversa. */
  teacherName: string;

  classId: string;
  /**
   * Disciplina usada para comprovar o vínculo professor↔turma↔aluno no
   * momento da criação (ver `isValidConversationPair` em
   * `firestore.rules`). Nunca `null` em conversas criadas por esta
   * funcionalidade; opcional apenas por segurança de tipo caso um
   * documento futuro precise ser criado sem essa referência.
   */
  disciplineId: string | null;
  /** Snapshot do nome da disciplina usada para o vínculo. */
  disciplineName: string | null;

  lastMessage: string | null;
  lastMessageAt: unknown; // Firestore Timestamp | null
  lastMessageSenderUid: string | null;

  /**
   * Contagem de não lidas POR PARTICIPANTE (`{ [uid]: number }`).
   * Denormalizado no documento da conversa (em vez de contar
   * mensagens com `read == false` a cada renderização da lista) para
   * a lista de conversas não precisar de uma consulta extra por
   * conversa só para saber o contador do badge — mesmo racional de
   * `students.average` (valor derivado guardado por conveniência,
   * documentado aqui para não ser confundido com a fonte de verdade,
   * que é o campo `readAt` de cada mensagem).
   */
  unreadCount: Record<string, number>;

  createdAt: unknown; // Firestore Timestamp
  updatedAt: unknown; // Firestore Timestamp
}

/** Payload aceito por `chatService.getOrCreateConversation`. */
export interface ConversationCreateInput {
  teacherUid: string;
  teacherName: string;
  studentId: string;
  studentUid: string;
  studentName: string;
  classId: string;
  disciplineId: string;
  disciplineName: string;
}
