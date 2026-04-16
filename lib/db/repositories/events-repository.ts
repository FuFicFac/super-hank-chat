import { desc, eq } from "drizzle-orm";
import type { HankDatabase } from "../client";
import { sessionEvents, type SessionEventRow } from "../schema";
import { newEventId } from "@/lib/utils/ids";
import { nowUnixSeconds } from "@/lib/utils/time";

export function appendSessionEvent(
  db: HankDatabase,
  input: {
    sessionId: string;
    type: string;
    payload?: unknown;
  },
): SessionEventRow {
  const id = newEventId();
  const row: typeof sessionEvents.$inferInsert = {
    id,
    sessionId: input.sessionId,
    type: input.type,
    payloadJson:
      input.payload === undefined ? null : JSON.stringify(input.payload),
    createdAt: nowUnixSeconds(),
  };
  db.insert(sessionEvents).values(row).run();
  return db.select().from(sessionEvents).where(eq(sessionEvents.id, id)).get()!;
}

export function listRecentEvents(
  db: HankDatabase,
  sessionId: string,
  limit = 100,
): SessionEventRow[] {
  return db
    .select()
    .from(sessionEvents)
    .where(eq(sessionEvents.sessionId, sessionId))
    .orderBy(desc(sessionEvents.createdAt))
    .limit(limit)
    .all()
    .reverse();
}
