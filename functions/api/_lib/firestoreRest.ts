// functions/api/_lib/firestoreRest.ts
//
// Cliente mínimo da API REST do Firestore, autenticado com o access
// token da Service Account (ver `googleAuth.ts`). Como este código
// roda com credenciais de Service Account (não o SDK do cliente), ele
// NÃO passa pelas Firestore Security Rules — mesmo modelo de acesso
// do Admin SDK. Por isso `functions/api/send-push.ts` é o único lugar
// do projeto que pode ler/gravar dados de QUALQUER usuário; nunca deve
// ser exposto de um jeito que aceite parâmetros arbitrários do cliente
// além do `notificationId` (ver justificativa em `notificationService.ts`).
//
// Implementa só o subconjunto necessário para o Push (get, patch,
// runQuery) — não é um cliente Firestore genérico.

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { timestampValue: string }
  | { nullValue: null }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

interface FirestoreDocument {
  name: string;
  fields: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

/** Converte os campos tipados do Firestore REST para um objeto JS simples (só os tipos usados neste projeto). */
function decodeFields(fields: Record<string, FirestoreValue> | undefined): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!fields) return result;
  for (const [key, value] of Object.entries(fields)) {
    if ("stringValue" in value) result[key] = value.stringValue;
    else if ("booleanValue" in value) result[key] = value.booleanValue;
    else if ("integerValue" in value) result[key] = Number(value.integerValue);
    else if ("timestampValue" in value) result[key] = value.timestampValue;
    else if ("nullValue" in value) result[key] = null;
    else if ("mapValue" in value) result[key] = decodeFields(value.mapValue.fields);
  }
  return result;
}

function encodeValue(value: string | boolean | null): FirestoreValue {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  return { stringValue: value };
}

export interface FirestoreClient {
  /** Lê um documento por caminho relativo (ex.: "notifications/abc123"). `null` se não existir. */
  getDocument(path: string): Promise<{ id: string; data: Record<string, unknown> } | null>;
  /** Atualiza SOMENTE os campos informados (updateMask), sem sobrescrever o resto do documento. */
  patchDocument(path: string, fields: Record<string, string | boolean | null>): Promise<void>;
  /** Lista subdocumentos de uma coleção, opcionalmente filtrando por igualdade num campo. */
  queryCollection(
    parentPath: string,
    collectionId: string,
    whereEquals?: { field: string; value: string | boolean }
  ): Promise<{ id: string; data: Record<string, unknown> }[]>;
}

export function createFirestoreClient(projectId: string, accessToken: string): FirestoreClient {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

  return {
    async getDocument(path) {
      const response = await fetch(`${base}/${path}`, { headers });
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`Firestore GET ${path} falhou (HTTP ${response.status})`);
      }
      const doc = (await response.json()) as FirestoreDocument;
      const id = doc.name.split("/").pop() as string;
      return { id, data: decodeFields(doc.fields) };
    },

    async patchDocument(path, fields) {
      const fieldPaths = Object.keys(fields);
      const mask = fieldPaths.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join("&");
      const encodedFields: Record<string, FirestoreValue> = {};
      for (const [key, value] of Object.entries(fields)) encodedFields[key] = encodeValue(value);

      const response = await fetch(`${base}/${path}?${mask}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ fields: encodedFields }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Firestore PATCH ${path} falhou (HTTP ${response.status}): ${text}`);
      }
    },

    async queryCollection(parentPath, collectionId, whereEquals) {
      const structuredQuery: Record<string, unknown> = {
        from: [{ collectionId }],
      };
      if (whereEquals) {
        structuredQuery.where = {
          fieldFilter: {
            field: { fieldPath: whereEquals.field },
            op: "EQUAL",
            value: encodeValue(whereEquals.value),
          },
        };
      }

      const response = await fetch(`${base}/${parentPath}:runQuery`, {
        method: "POST",
        headers,
        body: JSON.stringify({ structuredQuery }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Firestore runQuery ${parentPath}/${collectionId} falhou (HTTP ${response.status}): ${text}`);
      }
      const rows = (await response.json()) as { document?: FirestoreDocument }[];
      return rows
        .filter((row): row is { document: FirestoreDocument } => Boolean(row.document))
        .map((row) => ({
          id: row.document.name.split("/").pop() as string,
          data: decodeFields(row.document.fields),
        }));
    },
  };
}
