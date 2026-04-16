import { SSE_HEARTBEAT_MS } from "@/lib/constants";
import { getDb, initDbSingleton } from "@/lib/db/client";
import { getSessionById } from "@/lib/db/repositories/sessions-repository";
import type { HermesOutboundEvent } from "@/lib/hermes/hermes-events";
import {
  formatSseMessage,
  subscribeStream,
} from "@/lib/services/streaming-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  await initDbSingleton();
  const { sessionId } = await context.params;
  if (!getSessionById(getDb(), sessionId)) {
    return new Response("Not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: (() => void) | undefined;

  const cleanup = () => {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = undefined;
    unsubscribe?.();
    unsubscribe = undefined;
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const safeEnqueue = (raw: string) => {
        try {
          controller.enqueue(encoder.encode(raw));
        } catch {
          /* reader closed */
        }
      };

      const onEvent = (ev: HermesOutboundEvent) => {
        safeEnqueue(formatSseMessage(ev.type, ev.payload));
      };

      unsubscribe = subscribeStream(sessionId, onEvent);
      heartbeat = setInterval(() => {
        safeEnqueue(formatSseMessage("heartbeat", { t: Date.now() }));
      }, SSE_HEARTBEAT_MS);

      request.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
