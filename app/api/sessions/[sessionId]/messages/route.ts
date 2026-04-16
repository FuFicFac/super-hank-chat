import { postMessageBodySchema } from "@/lib/api/validators";
import { getDb, initDbSingleton } from "@/lib/db/client";
import { getSessionById } from "@/lib/db/repositories/sessions-repository";
import { listMessagesService, persistUserMessage } from "@/lib/services/message-service";
import { sendToHermes } from "@/lib/hermes/hermes-registry";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  await initDbSingleton();
  const { sessionId } = await context.params;
  const db = getDb();
  if (!getSessionById(db, sessionId)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const messages = listMessagesService(sessionId);
  return Response.json({ messages });
}

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
  const json = await request.json().catch(() => null);
  const parsed = postMessageBodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const msg = persistUserMessage(db, sessionId, parsed.data.content);
  const forwarded = sendToHermes(sessionId, parsed.data.content);
  if (!forwarded.ok) {
    return Response.json(
      {
        accepted: false,
        error: forwarded.error,
        messageId: msg.id,
      },
      { status: 409 },
    );
  }
  return Response.json({ accepted: true, messageId: msg.id });
}
