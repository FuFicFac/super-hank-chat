import { getDb } from "@/lib/db/client";
import { getSessionById } from "@/lib/db/repositories/sessions-repository";
import {
  connectSession as registryConnect,
  disconnectSession as registryDisconnect,
  getRuntimeStatus,
} from "@/lib/hermes/hermes-registry";

export function connectHermesForSession(sessionId: string) {
  return registryConnect(sessionId);
}

export function disconnectHermesForSession(sessionId: string) {
  registryDisconnect(sessionId);
}

export function getConnectionStatus(sessionId: string) {
  const rt = getRuntimeStatus(sessionId);
  const row = getSessionById(getDb(), sessionId);
  if (rt.hasActiveProcess) {
    return {
      status: "connected" as const,
      hasActiveProcess: true,
      lastActivityAt: rt.lastActivityAt,
      stderrTail: rt.stderrTail,
    };
  }
  return {
    status: (row?.status ?? "disconnected") as string,
    hasActiveProcess: false,
    lastActivityAt: rt.lastActivityAt,
    stderrTail: rt.stderrTail,
  };
}
