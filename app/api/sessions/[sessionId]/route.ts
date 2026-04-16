import { toSessionDetail } from "@/lib/api/dto";
import { getSessionById } from "@/lib/db/repositories/sessions-repository";
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
