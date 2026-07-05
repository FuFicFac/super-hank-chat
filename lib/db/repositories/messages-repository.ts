import { asc, desc, eq, max, sql } from "drizzle-orm";
import type { HankDatabase } from "../client";
import { chatMessages, type ChatMessageRow } from "../schema";
import { parseSessionAgentId } from "./sessions-repository";
import { newMessageId } from "@/lib/utils/ids";
import { nowUnixSeconds } from "@/lib/utils/time";

export type MessageSearchResult = {
  sessionId: string;
  title: string;
  agentId: string | null;
  snippet: string;
  createdAt: number;
};

type MessageSearchRow = {
  sessionId: string;
  title: string;
  metadataJson: string | null;
  content: string;
  createdAt: number;
};

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
}

export function deleteMessageById(db: HankDatabase, messageId: string) {
  db.delete(chatMessages).where(eq(chatMessages.id, messageId)).run();
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

function buildSnippet(content: string, query: string): string {
  const collapsed = content.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";
  const matchAt = collapsed.toLowerCase().indexOf(query.toLowerCase());
  const center = matchAt >= 0 ? matchAt : 0;
  const start = Math.max(0, center - 45);
  const end = Math.min(collapsed.length, start + 120);
  const snippet = collapsed.slice(start, end).trim();
  const prefix = start > 0 ? "…" : "";
  const suffix = end < collapsed.length ? "…" : "";
  return `${prefix}${snippet}${suffix}`;
}

export function searchMessages(
  db: HankDatabase,
  query: string,
  limit = 30,
): MessageSearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));
  const rows = db.all(sql`
    WITH ranked_matches AS (
      SELECT
        chat_messages.session_id AS sessionId,
        chat_sessions.title AS title,
        chat_sessions.metadata_json AS metadataJson,
        chat_messages.content AS content,
        chat_messages.created_at AS createdAt,
        row_number() OVER (
          PARTITION BY chat_messages.session_id
          ORDER BY chat_messages.created_at DESC, chat_messages.sequence DESC
        ) AS rn
      FROM chat_messages
      INNER JOIN chat_sessions ON chat_sessions.id = chat_messages.session_id
      WHERE chat_messages.content LIKE '%' || ${trimmed} || '%'
    )
    SELECT sessionId, title, metadataJson, content, createdAt
    FROM ranked_matches
    WHERE rn = 1
    ORDER BY createdAt DESC
    LIMIT ${safeLimit}
  `) as MessageSearchRow[];

  return rows.map((row) => ({
    sessionId: row.sessionId,
    title: row.title,
    agentId: parseSessionAgentId(row.metadataJson),
    snippet: buildSnippet(row.content, trimmed),
    createdAt: row.createdAt,
  }));
}
