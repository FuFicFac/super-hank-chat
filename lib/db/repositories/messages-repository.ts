import { asc, desc, eq, max, sql } from "drizzle-orm";
import { persistDb, type HankDatabase } from "../client";
import { chatMessages, type ChatMessageRow } from "../schema";
import { newMessageId } from "@/lib/utils/ids";
import { nowUnixSeconds } from "@/lib/utils/time";

export function listMessagesForSession(
  db: HankDatabase,
  sessionId: string,
): ChatMessageRow[] {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.sequence), asc(chatMessages.createdAt))
    .all();
}

function nextSequence(db: HankDatabase, sessionId: string): number {
  const row = db
    .select({ m: max(chatMessages.sequence) })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .get();
  return (row?.m ?? 0) + 1;
}

export function insertMessage(
  db: HankDatabase,
  input: {
    sessionId: string;
    role: string;
    content: string;
    status?: string;
    stderr?: boolean;
    metadataJson?: string | null;
    id?: string;
  },
): ChatMessageRow {
  const id = input.id ?? newMessageId();
  const t = nowUnixSeconds();
  const sequence = nextSequence(db, input.sessionId);
  const row: typeof chatMessages.$inferInsert = {
    id,
    sessionId: input.sessionId,
    role: input.role,
    content: input.content,
    sequence,
    createdAt: t,
    updatedAt: t,
    status: input.status ?? "complete",
    stderr: input.stderr ?? false,
    metadataJson: input.metadataJson ?? null,
  };
  db.insert(chatMessages).values(row).run();
  persistDb();
  return db.select().from(chatMessages).where(eq(chatMessages.id, id)).get()!;
}

export function updateMessageContent(
  db: HankDatabase,
  messageId: string,
  content: string,
  status?: string,
) {
  db.update(chatMessages)
    .set({
      content,
      updatedAt: nowUnixSeconds(),
      ...(status ? { status } : {}),
    })
    .where(eq(chatMessages.id, messageId))
    .run();
  persistDb();
}

export function deleteMessageById(db: HankDatabase, messageId: string) {
  db.delete(chatMessages).where(eq(chatMessages.id, messageId)).run();
  persistDb();
}

export function getMessageById(
  db: HankDatabase,
  messageId: string,
): ChatMessageRow | undefined {
  return db.select().from(chatMessages).where(eq(chatMessages.id, messageId)).get();
}

export function countMessages(db: HankDatabase, sessionId: string): number {
  const row = db
    .select({ c: sql<number>`count(*)` })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .get();
  return row?.c ?? 0;
}

export function getLatestMessages(
  db: HankDatabase,
  sessionId: string,
  limit: number,
): ChatMessageRow[] {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(desc(chatMessages.sequence), desc(chatMessages.createdAt))
    .limit(limit)
    .all()
    .reverse();
}
