# Configuração necessária no Firebase Console

Este arquivo documenta configurações que **não podem ser aplicadas só por código**
e precisam ser feitas manualmente (ou via Firebase CLI) no projeto Firebase
`tekidu-26c0f`.

## Índices compostos do Firestore (causa raiz de "Notas não conseguiram ser carregadas")

As telas de **Notas** e **Frequência** fazem consultas com vários `where()`
combinados com `orderBy()`:

- `assessments`: `where(disciplineId) + where(classId) + where(schoolYear) + where(term) + orderBy(order)`
- `attendanceSessions`: mesmo padrão

O Firestore **exige um índice composto** para esse tipo de consulta (múltiplas
igualdades + ordenação por um campo diferente). Sem esse índice, a consulta é
rejeitada com o erro `failed-precondition`, o que faz a tela mostrar "Notas não
conseguiram ser carregadas" / "Não foi possível carregar a frequência".

Os índices necessários já estão declarados em `firestore.indexes.json`, na raiz
do projeto. Para aplicá-los ao projeto real, escolha UMA das opções abaixo:

### Opção A — via Firebase CLI (recomendado)

```bash
npm install -g firebase-tools   # se ainda não tiver o CLI instalado
firebase login
firebase use tekidu-26c0f
firebase deploy --only firestore:indexes
```

### Opção B — manualmente pelo Console

1. Acesse [Firebase Console](https://console.firebase.google.com/) → projeto
   `tekidu-26c0f` → **Firestore Database** → aba **Índices** → **Índices compostos**.
2. Clique em **Criar índice** e cadastre dois índices, ambos com escopo de
   **Coleção** (não "Grupo de coleções"):

   **Índice 1 — coleção `assessments`**
   | Campo | Ordem |
   |---|---|
   | disciplineId | Crescente |
   | classId | Crescente |
   | schoolYear | Crescente |
   | term | Crescente |
   | order | Crescente |

   **Índice 2 — coleção `attendanceSessions`**
   | Campo | Ordem |
   |---|---|
   | disciplineId | Crescente |
   | classId | Crescente |
   | schoolYear | Crescente |
   | term | Crescente |
   | order | Crescente |

3. Aguarde o status mudar de "Compilando" para "Ativado" (geralmente poucos
   minutos, pode levar mais tempo se já houver muitos documentos).

### Alternativa rápida (por ambiente)

Se o erro `failed-precondition` ocorrer em produção, a própria mensagem do
Firestore (visível no console do navegador, já que agora logamos o erro
técnico completo — ver `src/utils/firebaseError.ts`) inclui um **link direto**
que cria o índice exato exigido por aquela consulta, com um clique. Essa é a
forma mais rápida de resolver caso os passos acima não sejam suficientes.

## Firestore Security Rules

`firestore.rules` já está correto e não precisa de nenhuma mudança para o
problema de Notas/Frequência. Ainda assim, garanta que as regras publicadas no
Console são as mesmas deste arquivo:

```bash
firebase deploy --only firestore:rules
```

## Variáveis de ambiente

`.env.local` já está preenchido com as credenciais do projeto
`tekidu-26c0f` — nenhuma ação adicional é necessária aqui.
