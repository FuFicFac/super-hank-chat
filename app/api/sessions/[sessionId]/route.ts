import { toSessionDetail } from "@/lib/api/dto";
import { deleteSession, getSessionById } from "@/lib/db/repositories/sessions-repository";
import { getDb, initDbSingleton } from "@/lib/db/client";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  await initDbSingleton();
  const { sessionId } = await context.params;
  const row = getSessionById(getDb(), sessionId);
  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({ session: toSessionDetail(row) });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  await initDbSingleton();
  const { sessionId } = await context.params;
  const deleted = deleteSession(getDb(), sessionId);
  if (!deleted) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({ deleted: true });
}
