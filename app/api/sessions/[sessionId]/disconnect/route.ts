import { connectDisconnectBodySchema } from "@/lib/api/validators";
import { getDb, initDbSingleton } from "@/lib/db/client";
import { getSessionById } from "@/lib/db/repositories/sessions-repository";
import { disconnectHermesForSession } from "@/lib/services/connection-service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  await initDbSingleton();
  const { sessionId } = await context.params;
  const db = getDb();
  if (!getSessionById(db, sessionId)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const json = await request.json().catch(() => ({}));
  const parsed = connectDisconnectBodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  disconnectHermesForSession(sessionId);
  return Response.json({ status: "disconnected" });
}
