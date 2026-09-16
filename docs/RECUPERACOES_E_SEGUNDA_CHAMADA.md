# Recuperações e segunda chamada de avaliações quantitativas

Esta funcionalidade estende a arquitetura já existente de `assessments`/`grades`
para permitir que uma avaliação regular tenha uma **recuperação** e/ou uma
**segunda chamada**, sem jamais apagar ou sobrescrever a nota original.

## Modelo de dados

Nenhuma coleção nova foi criada. `assessments/{id}` ganhou dois campos
opcionais (retrocompatíveis — ausentes em documentos antigos):

```ts
assessmentKind?: "regular" | "recovery" | "second_call"; // ausente ⇒ "regular"
parentAssessmentId?: string; // presente apenas em recovery/second_call
```

`grades/{studentId_assessmentId}` não muda: uma recuperação/segunda chamada é
uma avaliação de verdade, então suas notas são documentos `grades` comuns,
com o mesmo mecanismo de ID determinístico já existente.

- **Segunda chamada**: `parentAssessmentId` aponta para a avaliação regular
  específica que ela substitui para quem faltou. Nunca leia esses campos
  diretamente — use `effectiveAssessmentKind(assessment)` (`types/assessment.ts`).
- **Recuperação**: `parentAssessmentId` aponta para uma avaliação regular do
  mesmo contexto (disciplina/turma/ano/bimestre), usada como âncora de
  validação e de agrupamento na interface. O efeito da recuperação é sobre o
  **resultado final do contexto**, não sobre uma avaliação específica.

## Regras de cálculo (fonte única de verdade)

Toda a lógica vive em `src/types/grade.ts`, sem fórmulas duplicadas em
componentes:

- `calculateEffectiveAssessmentScore(original, secondCall)` — se há nota de
  segunda chamada lançada, ela é a nota considerada daquela avaliação; a nota
  original nunca é apagada, só deixa de entrar no cálculo.
- `calculateEffectiveAcademicResult(baseResult, recovery)` — resultado efetivo
  = maior valor entre o resultado original e a nota de recuperação (política
  inicial — **DECISÃO INSTITUCIONAL A CONFIRMAR**, ver comentário na função
  caso a instituição prefira outra fórmula).
- `resolveStudentAcademicResult(assessments, scores, thresholds)` — orquestra
  as duas funções acima + `calculateWeightedAverage`/`deriveSituationFromAverage`
  já existentes, devolvendo o histórico completo (nota original, de segunda
  chamada e efetiva por avaliação) e o resultado final. **Notas, Boletim e o
  contador de pendências da tela de Notas usam todos esta mesma função** —
  antes desta funcionalidade, o Boletim usava média aritmética simples sem
  considerar peso; essa divergência foi corrigida como parte deste trabalho.
- "Incompleto" (`situation`) considera apenas avaliações **regulares** —
  recuperação/segunda chamada sem nota lançada nunca torna o bimestre
  incompleto.

## Permissões e segurança

- `assessmentService.createAssessment`/`validateSpecialAssessmentParent`
  validam no cliente que a avaliação-pai existe, é regular e pertence ao
  mesmo contexto; bloqueiam uma segunda segunda-chamada ativa para a mesma
  avaliação.
- `assessmentService.deleteAssessment` bloqueia a exclusão de uma avaliação
  regular enquanto existir recuperação/segunda chamada vinculada.
- `firestore.rules` espelha a mesma validação de vínculo pai/filho
  (`isValidAssessmentKind`/`isValidAssessmentParent`) como barreira real
  contra chamadas diretas à API — o professor só pode apontar
  `parentAssessmentId` para uma avaliação da própria disciplina, porque a
  regra exige que o payload e a avaliação-pai tenham o mesmo `disciplineId`.
- Aluno e responsável continuam sem permissão de escrita em `assessments`/
  `grades` — apenas passam a enxergar as avaliações especiais e o resultado
  efetivo via as mesmas leituras já existentes.

## Interface

- **Notas** (`GradesTable`): colunas agrupadas hierarquicamente (avaliação
  regular → segunda chamada → recuperação, com indicador "↳"); Média/Situação
  usam o resultado efetivo, com indicação discreta quando a recuperação foi
  aplicada.
- **Gerenciador de avaliações** (`AssessmentManagerModal`): cada avaliação
  regular ganha as ações "Criar segunda chamada"/"Criar recuperação", que
  reabrem o mesmo formulário, pré-preenchido e com o vínculo explícito.
- **Boletim**: mostra a média já considerando peso + recuperação, com o
  indicativo discreto "Recuperação realizada" e tooltip com a média sem
  recuperação.

## Auditoria e notificações

Eventos dedicados em `auditLog.ts`: `recovery_created/updated/deleted` e
`second_call_created/updated/deleted`. Lançamento de nota continua usando o
`grade_updated` já existente. Notificações reaproveitam os tipos
`assessment_created`/`assessment_updated` já existentes, com título e
mensagem específicos para recuperação/segunda chamada.
