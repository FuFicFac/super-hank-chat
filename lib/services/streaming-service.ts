import type { HermesOutboundEvent } from "@/lib/hermes/hermes-events";

type Subscriber = (ev: HermesOutboundEvent) => void;

export function formatSseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

const subscribers = new Map<string, Set<Subscriber>>();

export function publishStreamEvent(sessionId: string, ev: HermesOutboundEvent) {
  const set = subscribers.get(sessionId);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(ev);
    } catch {
      /* ignore */
    }
  }
}

export function subscribeStream(sessionId: string, listener: Subscriber): () => void {
  let set = subscribers.get(sessionId);
  if (!set) {
    set = new Set();
    subscribers.set(sessionId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) subscribers.delete(sessionId);
  };
}
