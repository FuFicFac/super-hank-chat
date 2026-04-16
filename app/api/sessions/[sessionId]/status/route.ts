import { getDb, initDbSingleton } from "@/lib/db/client";
import { getSessionById } from "@/lib/db/repositories/sessions-repository";
import { getConnectionStatus } from "@/lib/services/connection-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  await initDbSingleton();
  const { sessionId } = await context.params;
  if (!getSessionById(getDb(), sessionId)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const s = getConnectionStatus(sessionId);
  return Response.json({
    status: s.status,
    hasActiveProcess: s.hasActiveProcess,
    lastActivityAt: s.lastActivityAt,
  });
}
