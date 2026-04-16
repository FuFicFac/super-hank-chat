import { createSessionBodySchema } from "@/lib/api/validators";
import { toSessionSummary } from "@/lib/api/dto";
import { initDbSingleton } from "@/lib/db/client";
import { listSessionsService, createSessionService } from "@/lib/services/session-service";

export const runtime = "nodejs";

export async function GET() {
  await initDbSingleton();
  const sessions = listSessionsService().map(toSessionSummary);
  return Response.json({ sessions });
}

export async function POST(request: Request) {
  await initDbSingleton();
  const json = await request.json().catch(() => ({}));
  const parsed = createSessionBodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const row = createSessionService(parsed.data);
  return Response.json({
    session: {
      id: row.id,
      title: row.title,
      status: row.status,
    },
  });
}
