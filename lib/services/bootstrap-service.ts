import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { chatSessions } from "@/lib/db/schema";
import { resetAllConnectedToDisconnected } from "@/lib/db/repositories/sessions-repository";

export function resetStaleSessionConnections() {
  try {
    const db = getDb();
    const before = db
      .select({ c: sql<number>`count(*)`.mapWith(Number) })
      .from(chatSessions)
      .where(eq(chatSessions.status, "connected"))
      .get();
    const n = before?.c ?? 0;
    resetAllConnectedToDisconnected(db);
    if (n > 0) {
      console.info(`[hank-chat] Reset ${n} stale session(s) to disconnected`);
    }
  } catch (e) {
    console.warn(
      "[hank-chat] Could not reset session statuses (database may not be migrated yet)",
      e,
    );
  }
}
