import { desc, eq, sql } from "drizzle-orm";
import { persistDb, type HankDatabase } from "../client";
import { chatMessages, chatSessions, type ChatSessionRow } from "../schema";
import { newSessionId } from "@/lib/utils/ids";
import { nowUnixSeconds } from "@/lib/utils/time";

export type SessionListItem = {
  id: string;
  title: string;
  status: string;
  updatedAt: number;
  messageCount: number;
};

export function listSessions(db: HankDatabase): SessionListItem[] {
  const rows = db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      status: chatSessions.status,
      updatedAt: chatSessions.updatedAt,
      messageCount: sql<number>`count(${chatMessages.id})`.mapWith(Number),
    })
    .from(chatSessions)
    .leftJoin(chatMessages, eq(chatMessages.sessionId, chatSessions.id))
    .groupBy(chatSessions.id)
    .orderBy(desc(chatSessions.updatedAt))
    .all();
  return rows;
}

export function getSessionById(
  db: HankDatabase,
  sessionId: string,
): ChatSessionRow | undefined {
  return db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).get();
}

export function createSession(
  db: HankDatabase,
  input: { title?: string },
): ChatSessionRow {
  const id = newSessionId();
  const title = input.title?.trim() || "New Session";
  const t = nowUnixSeconds();
  const row: typeof chatSessions.$inferInsert = {
    id,
    title,
    status: "disconnected",
    createdAt: t,
    updatedAt: t,
    metadataJson: null,
  };
  db.insert(chatSessions).values(row).run();
  persistDb();
  return getSessionById(db, id)!;
}

export function updateSession(
  db: HankDatabase,
  sessionId: string,
  patch: Partial<
    Pick<
      ChatSessionRow,
      | "title"
      | "status"
      | "lastConnectedAt"
      | "lastDisconnectedAt"
      | "metadataJson"
    >
  >,
): ChatSessionRow | undefined {
  const existing = getSessionById(db, sessionId);
  if (!existing) return undefined;
  const updatedAt = nowUnixSeconds();
  db.update(chatSessions)
    .set({ ...patch, updatedAt })
    .where(eq(chatSessions.id, sessionId))
    .run();
  persistDb();
  return getSessionById(db, sessionId);
}

/** Mark every session that still claims "connected" as disconnected (server restart). */
export function resetAllConnectedToDisconnected(db: HankDatabase) {
  db.update(chatSessions)
    .set({
      status: "disconnected",
      lastDisconnectedAt: nowUnixSeconds(),
      updatedAt: nowUnixSeconds(),
    })
    .where(eq(chatSessions.status, "connected"))
    .run();
  persistDb();
}

export function touchSession(db: HankDatabase, sessionId: string) {
  db.update(chatSessions)
    .set({ updatedAt: nowUnixSeconds() })
    .where(eq(chatSessions.id, sessionId))
    .run();
  persistDb();
}
