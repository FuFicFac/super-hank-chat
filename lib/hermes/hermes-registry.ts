import { getDb } from "@/lib/db/client";
import { appendSessionEvent } from "@/lib/db/repositories/events-repository";
import { deleteMessageById, insertMessage, updateMessageContent } from "@/lib/db/repositories/messages-repository";
import {
  getSessionById,
  touchSession,
  updateSession,
} from "@/lib/db/repositories/sessions-repository";
import { publishStreamEvent } from "@/lib/services/streaming-service";
import { newMessageId } from "@/lib/utils/ids";
import { nowUnixMs } from "@/lib/utils/time";
import {
  extractHermesQueryResult,
  HERMES_SESSION_ID_RE,
  normalizeNewlines,
  sanitizeHermesDiagnosticDelta,
} from "./query-output";
import { HermesAdapter } from "./hermes-adapter";
import { sseEvent } from "./hermes-events";

const IDLE_MS = 90_000;

type SessionMetadata = {
  hermesSessionId?: string;
};

type ActiveMessage = {
  messageId: string;
  buffer: string;
  idleTimer: ReturnType<typeof setTimeout> | null;
  emittedLen: number;
};

// Use globalThis to share state across Next.js route handler module instances
// (Next.js dev mode can isolate module scope per route, but globalThis is always shared)
declare global {
  // eslint-disable-next-line no-var
  var __hermesSessionProcesses: Map<string, HermesAdapter> | undefined;
  // eslint-disable-next-line no-var
  var __hermesActiveMessages: Map<string, ActiveMessage> | undefined;
  // eslint-disable-next-line no-var
  var __hermesLastActivity: Map<string, number> | undefined;
  // eslint-disable-next-line no-var
  var __hermesStderrTail: Map<string, string> | undefined;
}

const sessionProcesses = (globalThis.__hermesSessionProcesses ??= new Map<string, HermesAdapter>());
const activeMessageIds = (globalThis.__hermesActiveMessages ??= new Map<string, ActiveMessage>());
const sessionLastActivity = (globalThis.__hermesLastActivity ??= new Map<string, number>());
const sessionStderrTail = (globalThis.__hermesStderrTail ??= new Map<string, string>());

function emit(sessionId: string, ev: ReturnType<typeof sseEvent>) {
  publishStreamEvent(sessionId, ev);
}

function touchActivity(sessionId: string) {
  sessionLastActivity.set(sessionId, nowUnixMs());
}

function parseSessionMetadata(metadataJson: string | null | undefined): SessionMetadata {
  if (!metadataJson) return {};
  try {
    const parsed = JSON.parse(metadataJson) as SessionMetadata;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSessionMetadata(sessionId: string, patch: SessionMetadata) {
  const db = getDb();
  const existing = getSessionById(db, sessionId);
  if (!existing) return;
  const merged: SessionMetadata = {
    ...parseSessionMetadata(existing.metadataJson),
    ...patch,
  };
  updateSession(db, sessionId, { metadataJson: JSON.stringify(merged) });
}

function getDisplayableContent(buf: string, streaming: boolean): string {
  const n = normalizeNewlines(buf);
  const lines = n.split("\n");
  const sidIdx = lines.findIndex((l) => HERMES_SESSION_ID_RE.test(l.trim()));

  if (sidIdx >= 0) {
    return lines.slice(0, sidIdx).join("\n");
  }

  if (!streaming) {
    return n;
  }

  if (!n.endsWith("\n") && lines.length > 0) {
    return lines.slice(0, -1).join("\n");
  }
  return n;
}

function bufferHasSessionIdLine(buf: string): boolean {
  const n = normalizeNewlines(buf);
  return n.split("\n").some((l) => HERMES_SESSION_ID_RE.test(l.trim()));
}

function flushStreamable(sessionId: string, active: ActiveMessage, streaming: boolean) {
  const text = getDisplayableContent(active.buffer, streaming);
  if (text.length <= active.emittedLen) return;
  const delta = text.slice(active.emittedLen);
  active.emittedLen = text.length;
  if (!delta) return;
  emit(sessionId, sseEvent("message.delta", { sessionId, messageId: active.messageId, delta }));
}

function clearIdleTimer(active: ActiveMessage) {
  if (active.idleTimer) {
    clearTimeout(active.idleTimer);
    active.idleTimer = null;
  }
}

function resetIdleTimer(sessionId: string) {
  const active = activeMessageIds.get(sessionId);
  if (!active) return;
  clearIdleTimer(active);
  active.idleTimer = setTimeout(() => {
    finalizeAssistantMessage(sessionId);
  }, IDLE_MS);
  active.idleTimer.unref?.();
}

function beginAssistantMessage(sessionId: string): string {
  const db = getDb();
  const messageId = newMessageId();
  insertMessage(db, {
    id: messageId,
    sessionId,
    role: "assistant",
    content: "",
    status: "streaming",
  });
  appendSessionEvent(db, {
    sessionId,
    type: "assistant.started",
    payload: { messageId },
  });
  emit(sessionId, sseEvent("message.started", { sessionId, messageId }));
  return messageId;
}

function completeAssistantMessage(sessionId: string, messageId: string, content: string) {
  const db = getDb();
  const finalContent = content.trim();
  if (!finalContent) {
    deleteMessageById(db, messageId);
    return;
  }
  updateMessageContent(db, messageId, finalContent, "complete");
  touchSession(db, sessionId);
  appendSessionEvent(db, {
    sessionId,
    type: "assistant.completed",
    payload: { messageId, reason: "session-id-line" },
  });
  emit(
    sessionId,
    sseEvent("message.completed", {
      sessionId,
      messageId,
      content: finalContent,
      reason: "session-id-line",
    }),
  );
}

function failAssistantMessage(sessionId: string, messageId: string) {
  deleteMessageById(getDb(), messageId);
  appendSessionEvent(getDb(), {
    sessionId,
    type: "assistant.aborted",
    payload: { messageId },
  });
}

function finalizeAssistantMessage(sessionId: string) {
  const active = activeMessageIds.get(sessionId);
  if (!active) return;

  flushStreamable(sessionId, active, false);

  clearIdleTimer(active);
  const { messageId, buffer } = active;
  activeMessageIds.delete(sessionId);

  const result = extractHermesQueryResult(buffer);
  if (result.sessionId) {
    writeSessionMetadata(sessionId, { hermesSessionId: result.sessionId });
  }
  if (result.content) {
    completeAssistantMessage(sessionId, messageId, result.content);
  } else {
    failAssistantMessage(sessionId, messageId);
  }
}

function handleStdoutDelta(sessionId: string, delta: string) {
  touchActivity(sessionId);
  const active = activeMessageIds.get(sessionId);
  if (!active) return;

  active.buffer += delta;
  resetIdleTimer(sessionId);
  flushStreamable(sessionId, active, true);

  if (bufferHasSessionIdLine(active.buffer)) {
    finalizeAssistantMessage(sessionId);
  }
}

function handleProcessExit(sessionId: string, code: number | null, signal: NodeJS.Signals | null) {
  const hadAdapter = sessionProcesses.has(sessionId);
  sessionProcesses.delete(sessionId);
  sessionStderrTail.delete(sessionId);
  sessionLastActivity.delete(sessionId);

  if (activeMessageIds.has(sessionId)) {
    finalizeAssistantMessage(sessionId);
  }

  if (!hadAdapter) return;

  const db = getDb();
  updateSession(db, sessionId, {
    status: "disconnected",
    lastDisconnectedAt: Math.floor(Date.now() / 1000),
  });
  touchSession(db, sessionId);
  appendSessionEvent(db, {
    sessionId,
    type: "session.disconnected",
    payload: { reason: "exit", code, signal },
  });
  emit(sessionId, sseEvent("session.disconnected", { sessionId, reason: "exit" }));
}

function handleProcessError(sessionId: string, err: Error) {
  const hadAdapter = sessionProcesses.has(sessionId);
  sessionProcesses.delete(sessionId);
  sessionStderrTail.delete(sessionId);
  sessionLastActivity.delete(sessionId);

  if (activeMessageIds.has(sessionId)) {
    finalizeAssistantMessage(sessionId);
  }

  if (!hadAdapter) return;

  const db = getDb();
  updateSession(db, sessionId, {
    status: "error",
    lastDisconnectedAt: Math.floor(Date.now() / 1000),
  });
  touchSession(db, sessionId);
  appendSessionEvent(db, {
    sessionId,
    type: "process.error",
    payload: { message: err.message, code: (err as NodeJS.ErrnoException).code },
  });
  emit(
    sessionId,
    sseEvent("session.error", {
      sessionId,
      message: err.message,
      code: (err as NodeJS.ErrnoException).code,
    }),
  );
}

function wireAdapter(sessionId: string, adapter: HermesAdapter) {
  adapter.on("stdout", (plainDelta: string) => {
    handleStdoutDelta(sessionId, plainDelta);
  });
  adapter.on("stderr", (rawDelta: string) => {
    touchActivity(sessionId);
    const delta = sanitizeHermesDiagnosticDelta(rawDelta);
    if (delta) {
      const prev = sessionStderrTail.get(sessionId) ?? "";
      sessionStderrTail.set(sessionId, (prev + delta).slice(-4000));
    }
    if (!delta) return;
    emit(sessionId, sseEvent("stderr.delta", { sessionId, delta }));
    appendSessionEvent(getDb(), {
      sessionId,
      type: "stderr",
      payload: { delta },
    });
  });
  adapter.on("exit", (code, signal) => {
    handleProcessExit(sessionId, code, signal);
  });
  adapter.on("error", (err) => {
    handleProcessError(sessionId, err);
  });
}

export function getRuntimeStatus(sessionId: string) {
  const adapter = sessionProcesses.get(sessionId);
  const active = activeMessageIds.get(sessionId);
  return {
    status: adapter ? ("connected" as const) : ("disconnected" as const),
    hasActiveProcess: Boolean(adapter),
    hasActiveMessage: Boolean(active),
    lastActivityAt: sessionLastActivity.get(sessionId) ?? null,
    stderrTail: sessionStderrTail.get(sessionId) ?? "",
  };
}

export function connectSession(sessionId: string): { ok: true } | { ok: false; error: string } {
  const db = getDb();
  const session = getSessionById(db, sessionId);
  if (!session) return { ok: false, error: "Session not found" };

  if (sessionProcesses.has(sessionId)) {
    return { ok: true };
  }

  const adapter = new HermesAdapter();
  wireAdapter(sessionId, adapter);
  adapter.start({ args: ["chat", "-Q"] });
  sessionProcesses.set(sessionId, adapter);

  updateSession(db, sessionId, {
    status: "connected",
    lastConnectedAt: Math.floor(Date.now() / 1000),
  });
  touchSession(db, sessionId);
  appendSessionEvent(db, { sessionId, type: "session.connected", payload: {} });
  emit(sessionId, sseEvent("session.connected", { sessionId }));
  return { ok: true };
}

export function disconnectSession(sessionId: string) {
  const adapter = sessionProcesses.get(sessionId);
  sessionProcesses.delete(sessionId);
  sessionStderrTail.delete(sessionId);
  sessionLastActivity.delete(sessionId);

  if (adapter) {
    adapter.stop();
  }

  const active = activeMessageIds.get(sessionId);
  if (active) {
    clearIdleTimer(active);
    activeMessageIds.delete(sessionId);
    failAssistantMessage(sessionId, active.messageId);
  }

  const db = getDb();
  updateSession(db, sessionId, {
    status: "disconnected",
    lastDisconnectedAt: Math.floor(Date.now() / 1000),
  });
  touchSession(db, sessionId);
  appendSessionEvent(db, {
    sessionId,
    type: "session.disconnected",
    payload: { reason: "disconnect" },
  });
  emit(sessionId, sseEvent("session.disconnected", { sessionId, reason: "disconnect" }));
}

export function sendToHermes(
  sessionId: string,
  text: string,
): { ok: true } | { ok: false; error: string } {
  const db = getDb();
  const session = getSessionById(db, sessionId);
  if (!session) return { ok: false, error: "Session not found" };

  const adapter = sessionProcesses.get(sessionId);
  if (!adapter) {
    return { ok: false, error: "Not connected" };
  }
  if (session.status !== "connected") {
    return { ok: false, error: "Not connected" };
  }
  if (activeMessageIds.has(sessionId)) {
    return { ok: false, error: "Still responding" };
  }

  const messageId = beginAssistantMessage(sessionId);
  activeMessageIds.set(sessionId, {
    messageId,
    buffer: "",
    idleTimer: null,
    emittedLen: 0,
  });
  resetIdleTimer(sessionId);
  adapter.sendMessage(text);
  return { ok: true };
}
