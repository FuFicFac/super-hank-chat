import { spawn, type ChildProcessByStdio } from "child_process";
import type { Readable } from "stream";
import { getDb } from "@/lib/db/client";
import { appendSessionEvent } from "@/lib/db/repositories/events-repository";
import {
  deleteMessageById,
  insertMessage,
  updateMessageContent,
} from "@/lib/db/repositories/messages-repository";
import {
  getSessionById,
  touchSession,
  updateSession,
} from "@/lib/db/repositories/sessions-repository";
import { publishStreamEvent } from "@/lib/services/streaming-service";
import { newMessageId } from "@/lib/utils/ids";
import { nowUnixMs } from "@/lib/utils/time";
import { buildHermesQueryArgs, extractHermesQueryResult, sanitizeHermesDiagnosticDelta } from "./query-output";
import { sseEvent } from "./hermes-events";

type SessionMetadata = {
  hermesSessionId?: string;
};

type ActiveRun = {
  child: ChildProcessByStdio<null, Readable, Readable>;
  messageId: string;
  startedAt: number;
  lastActivityAt: number;
  stderrTail: string;
};

const activeRuns = new Map<string, ActiveRun>();
const DEFAULT_CMD = process.env.HERMES_BIN ?? "hermes";

function emit(sessionId: string, ev: ReturnType<typeof sseEvent>) {
  publishStreamEvent(sessionId, ev);
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
    payload: { messageId, reason: "process-exit" },
  });
  emit(sessionId, sseEvent("message.delta", { sessionId, messageId, delta: finalContent }));
  emit(
    sessionId,
    sseEvent("message.completed", {
      sessionId,
      messageId,
      content: finalContent,
      reason: "process-exit",
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

function markDisconnected(sessionId: string, reason: "disconnect" | "exit" | "error") {
  const db = getDb();
  updateSession(db, sessionId, {
    status: reason === "error" ? "error" : "disconnected",
    lastDisconnectedAt: Math.floor(Date.now() / 1000),
  });
  appendSessionEvent(db, {
    sessionId,
    type: "session.disconnected",
    payload: { reason },
  });
  emit(sessionId, sseEvent("session.disconnected", { sessionId, reason }));
}

export function getRuntimeStatus(sessionId: string) {
  const run = activeRuns.get(sessionId);
  return {
    status: run ? ("connected" as const) : ("disconnected" as const),
    hasActiveProcess: Boolean(run),
    lastActivityAt: run?.lastActivityAt ?? null,
    stderrTail: run?.stderrTail ?? "",
  };
}

export function connectSession(sessionId: string): { ok: true } | { ok: false; error: string } {
  const db = getDb();
  const session = getSessionById(db, sessionId);
  if (!session) return { ok: false, error: "Session not found" };

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
  const run = activeRuns.get(sessionId);
  if (run) {
    activeRuns.delete(sessionId);
    failAssistantMessage(sessionId, run.messageId);
    try {
      run.child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
  markDisconnected(sessionId, "disconnect");
}

export function sendToHermes(
  sessionId: string,
  text: string,
): { ok: true } | { ok: false; error: string } {
  const db = getDb();
  const session = getSessionById(db, sessionId);
  if (!session) return { ok: false, error: "Session not found" };
  if (session.status !== "connected") {
    return { ok: false, error: "Hermes is not connected for this session" };
  }
  if (activeRuns.has(sessionId)) {
    return { ok: false, error: "Hermes is still responding to the previous message" };
  }

  const metadata = parseSessionMetadata(session.metadataJson);
  const messageId = beginAssistantMessage(sessionId);
  const args = buildHermesQueryArgs(text, metadata.hermesSessionId ?? null);
  const child = spawn(DEFAULT_CMD, args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    env: {
      ...process.env,
      TERM: "dumb",
      NO_COLOR: "1",
    },
  });

  activeRuns.set(sessionId, {
    child,
    messageId,
    startedAt: nowUnixMs(),
    lastActivityAt: nowUnixMs(),
    stderrTail: "",
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (buf: Buffer) => {
    stdout += buf.toString("utf8");
    const run = activeRuns.get(sessionId);
    if (run) run.lastActivityAt = nowUnixMs();
  });

  child.stderr.on("data", (buf: Buffer) => {
    const rawDelta = buf.toString("utf8");
    stderr += rawDelta;
    const delta = sanitizeHermesDiagnosticDelta(rawDelta);
    const run = activeRuns.get(sessionId);
    if (run) {
      run.lastActivityAt = nowUnixMs();
      if (delta) {
        run.stderrTail = (run.stderrTail + delta).slice(-4000);
      }
    }
    if (!delta) return;
    emit(sessionId, sseEvent("stderr.delta", { sessionId, delta }));
    appendSessionEvent(getDb(), {
      sessionId,
      type: "stderr",
      payload: { delta },
    });
  });

  child.on("error", (err) => {
    activeRuns.delete(sessionId);
    failAssistantMessage(sessionId, messageId);
    appendSessionEvent(getDb(), {
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
  });

  child.on("close", (code, signal) => {
    // If disconnectSession() already removed this run and cleaned up, bail out.
    // Without this guard, a SIGTERM'd process would double-call fail/complete handlers.
    const alreadyAborted = !activeRuns.has(sessionId);
    activeRuns.delete(sessionId);
    if (alreadyAborted) return;

    const result = extractHermesQueryResult(stdout);
    const visibleStderr = sanitizeHermesDiagnosticDelta(stderr).trim();
    if (result.sessionId) {
      writeSessionMetadata(sessionId, { hermesSessionId: result.sessionId });
    }

    if (result.content) {
      completeAssistantMessage(sessionId, messageId, result.content);
      return;
    }

    failAssistantMessage(sessionId, messageId);

    const errorMessage = result.error ?? visibleStderr;
    if (code !== 0 || errorMessage) {
      appendSessionEvent(getDb(), {
        sessionId,
        type: "process.exit",
        payload: { code, signal, stderr: errorMessage ?? "" },
      });
      emit(
        sessionId,
        sseEvent("session.error", {
          sessionId,
          message: errorMessage || `Hermes exited with code ${code ?? "unknown"}`,
          code,
          signal,
        }),
      );
    }
  });

  return { ok: true };
}
