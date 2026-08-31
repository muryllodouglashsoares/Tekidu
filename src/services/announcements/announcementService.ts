import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/types/user";
import {
  ANNOUNCEMENT_PRIORITY_WEIGHT,
  type Announcement,
  type AnnouncementInput,
} from "@/types/announcement";

const announcementsCollection = collection(db, "announcements");

function toAnnouncement(id: string, data: Record<string, unknown>): Announcement {
  return {
    id,
    title: (data.title as string) ?? "",
    content: (data.content as string) ?? "",
    category: (data.category as Announcement["category"]) ?? "general",
    priority: (data.priority as Announcement["priority"]) ?? "normal",
    audience: (data.audience as Announcement["audience"]) ?? "all",
    published: (data.published as boolean) ?? false,
    pinned: (data.pinned as boolean) ?? false,
    createdBy: (data.createdBy as string) ?? "",
    createdByName: (data.createdByName as string) ?? "",
    authorRole: (data.authorRole as Announcement["authorRole"]) ?? "admin",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    publishedAt: (data.publishedAt as unknown) ?? null,
    expiresAt: (data.expiresAt as unknown) ?? null,
  };
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return 0;
}

/** `true` quando `expiresAt` já passou. Um aviso sem `expiresAt` nunca expira. */
export function isAnnouncementExpired(announcement: Announcement): boolean {
  if (!announcement.expiresAt) return false;
  return toMillis(announcement.expiresAt) < Date.now();
}

/**
 * Ordena para exibição: fixados primeiro, depois por prioridade
 * (urgente > importante > normal), depois pelos mais recentes (seção
 * 16 do briefing). Feito em memória — a lista já foi filtrada por
 * role/audience/publicação nas queries acima, então o volume por tela
 * é pequeno o suficiente para não justificar um campo de ordenação
 * denormalizado no Firestore.
 */
export function sortAnnouncements(list: Announcement[]): Announcement[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const priorityDiff =
      ANNOUNCEMENT_PRIORITY_WEIGHT[b.priority] - ANNOUNCEMENT_PRIORITY_WEIGHT[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    const aDate = toMillis(a.publishedAt ?? a.createdAt);
    const bDate = toMillis(b.publishedAt ?? b.createdAt);
    return bDate - aDate;
  });
}

function dedupeById(list: Announcement[]): Announcement[] {
  const seen = new Set<string>();
  const result: Announcement[] = [];
  for (const item of list) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

/**
 * Busca os avisos visíveis para o perfil logado (seção 48 do
 * briefing). O escopo é resolvido no CLIENTE apenas para decidir QUAIS
 * queries disparar — a garantia real de que ninguém lê além do
 * permitido está em `firestore.rules`, que espelha exatamente estas
 * mesmas regras.
 *
 * - admin: acesso irrestrito (publicados, rascunhos, expirados).
 * - teacher: avisos publicados destinados a "all"/"teachers", MAIS os
 *   seus próprios avisos (publicados ou rascunho) — duas queries
 *   mescladas, já que a Rule de leitura para `createdBy == uid` é uma
 *   condição independente da de "publicado + audience".
 * - student: apenas avisos publicados destinados a "all"/"students".
 */
export async function getAnnouncementsForRole(profile: UserProfile): Promise<Announcement[]> {
  if (profile.role === "admin") {
    const snapshot = await getDocs(query(announcementsCollection, orderBy("createdAt", "desc")));
    return snapshot.docs.map((d) => toAnnouncement(d.id, d.data()));
  }

  if (profile.role === "teacher") {
    const [publishedSnapshot, ownSnapshot] = await Promise.all([
      getDocs(
        query(
          announcementsCollection,
          where("published", "==", true),
          where("audience", "in", ["all", "teachers"]),
          orderBy("publishedAt", "desc")
        )
      ),
      getDocs(
        query(
          announcementsCollection,
          where("createdBy", "==", profile.uid),
          orderBy("createdAt", "desc")
        )
      ),
    ]);
    const published = publishedSnapshot.docs.map((d) => toAnnouncement(d.id, d.data()));
    const own = ownSnapshot.docs.map((d) => toAnnouncement(d.id, d.data()));
    return dedupeById([...own, ...published]);
  }

  // student
  const snapshot = await getDocs(
    query(
      announcementsCollection,
      where("published", "==", true),
      where("audience", "in", ["all", "students"]),
      orderBy("publishedAt", "desc")
    )
  );
  return snapshot.docs.map((d) => toAnnouncement(d.id, d.data()));
}

interface AnnouncementAuthor {
  uid: string;
  name: string;
  role: "admin" | "teacher";
}

function expiresAtToTimestamp(expiresAt: string | null): Timestamp | null {
  if (!expiresAt) return null;
  // Fim do dia informado, para o aviso continuar válido durante toda a
  // data escolhida (mesmo espírito de "data de expiração" de um prazo,
  // não um instante exato).
  return Timestamp.fromDate(new Date(`${expiresAt}T23:59:59`));
}

export async function createAnnouncement(
  author: AnnouncementAuthor,
  input: AnnouncementInput,
  publish: boolean
): Promise<string> {
  const ref = await addDoc(announcementsCollection, {
    title: input.title.trim(),
    content: input.content.trim(),
    category: input.category,
    priority: input.priority,
    audience: input.audience,
    published: publish,
    // Fixar é exclusivo do admin (seção 16) — reforçado aqui mesmo que
    // a UI já esconda o controle do professor, para nunca depender só
    // do frontend.
    pinned: author.role === "admin" ? input.pinned : false,
    createdBy: author.uid,
    createdByName: author.name,
    authorRole: author.role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: publish ? serverTimestamp() : null,
    expiresAt: expiresAtToTimestamp(input.expiresAt),
  });
  return ref.id;
}

export async function updateAnnouncement(
  announcementId: string,
  input: AnnouncementInput,
  authorRole: "admin" | "teacher"
): Promise<void> {
  await updateDoc(doc(db, "announcements", announcementId), {
    title: input.title.trim(),
    content: input.content.trim(),
    category: input.category,
    priority: input.priority,
    audience: input.audience,
    pinned: authorRole === "admin" ? input.pinned : false,
    expiresAt: expiresAtToTimestamp(input.expiresAt),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAnnouncement(announcementId: string): Promise<void> {
  await deleteDoc(doc(db, "announcements", announcementId));
}

export async function publishAnnouncement(announcementId: string): Promise<void> {
  await updateDoc(doc(db, "announcements", announcementId), {
    published: true,
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Despublicar retorna o aviso ao estado de rascunho (seção 21). */
export async function unpublishAnnouncement(announcementId: string): Promise<void> {
  await updateDoc(doc(db, "announcements", announcementId), {
    published: false,
    updatedAt: serverTimestamp(),
  });
}

/** Fixar/desafixar — exclusivo de admin, também reforçado na Rule. */
export async function toggleAnnouncementPinned(
  announcementId: string,
  pinned: boolean
): Promise<void> {
  await updateDoc(doc(db, "announcements", announcementId), {
    pinned,
    updatedAt: serverTimestamp(),
  });
}
