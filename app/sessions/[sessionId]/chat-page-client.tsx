"use client";

import { AppFrame } from "@/components/layout/app-frame";
import { ChatShell } from "@/components/chat/chat-shell";
import type { ConnectionUiState } from "@/components/chat/connection-pill";
import { SessionSidebar } from "@/components/chat/session-sidebar";
import { useSessionList } from "@/hooks/use-session-list";
import { useSessionStream } from "@/hooks/use-session-stream";
import { sanitizeHermesDiagnosticDelta } from "@/lib/hermes/query-output";
import type { ApiMessage, ApiSessionSummary } from "@/types/api";
import type { UiMessage } from "@/types/chat";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function toUiMessage(m: ApiMessage): UiMessage {
  return {
    id: m.id,
    role: m.role as UiMessage["role"],
    content: m.content,
    status: m.status,
    createdAt: m.createdAt,
    streaming: m.status === "streaming",
  };
}

export function ChatPageClient({
  sessionId,
  initialTitle,
}: {
  sessionId: string;
  initialTitle: string;
}) {
  const router = useRouter();
  const { sessions, loading: sessionsLoading, refresh } = useSessionList();
  const [title, setTitle] = useState(initialTitle);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [connection, setConnection] = useState<ConnectionUiState>("disconnected");
  const [headerBusy, setHeaderBusy] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [diagnostics, setDiagnostics] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}/messages`);
    if (!res.ok) return;
    const data = (await res.json()) as { messages: ApiMessage[] };
    setMessages(data.messages.map(toUiMessage));
  }, [sessionId]);

  const loadStatus = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}/status`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      status: string;
      hasActiveProcess: boolean;
    };
    if (data.hasActiveProcess || data.status === "connected") setConnection("connected");
    else if (data.status === "error") setConnection("error");
    else setConnection("disconnected");
  }, [sessionId]);

  useEffect(() => {
    void loadMessages();
    void loadStatus();
  }, [loadMessages, loadStatus]);

  useSessionStream(sessionId, (type, payload) => {
    if (type === "heartbeat") return;

    if (type === "session.connected") {
      setConnection("connected");
      setDiagnostics(null);
      return;
    }
    if (type === "session.disconnected") {
      setConnection("disconnected");
      setTyping(false);
      void loadMessages();
      return;
    }
    if (type === "session.error") {
      setConnection("error");
      const msg = typeof payload.message === "string" ? payload.message : "Hermes error";
      setDiagnostics((prev) => [prev, msg].filter(Boolean).join("\n").slice(-4000));
      return;
    }
    if (type === "stderr.delta") {
      const delta = sanitizeHermesDiagnosticDelta(
        typeof payload.delta === "string" ? payload.delta : "",
      );
      if (!delta) return;
      setDiagnostics((prev) => `${prev ?? ""}${delta}`.slice(-4000));
      return;
    }
    if (type === "message.started") {
      const messageId = typeof payload.messageId === "string" ? payload.messageId : "";
      if (!messageId) return;
      setTyping(true);
      setMessages((prev) => {
        if (prev.some((m) => m.id === messageId)) return prev;
        return [
          ...prev,
          {
            id: messageId,
            role: "assistant",
            content: "",
            status: "streaming",
            createdAt: Math.floor(Date.now() / 1000),
            streaming: true,
          },
        ];
      });
      return;
    }
    if (type === "message.delta") {
      const messageId = typeof payload.messageId === "string" ? payload.messageId : "";
      const delta = typeof payload.delta === "string" ? payload.delta : "";
      if (!messageId || !delta) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: m.content + delta, streaming: true } : m,
        ),
      );
      return;
    }
    if (type === "message.completed") {
      const messageId = typeof payload.messageId === "string" ? payload.messageId : "";
      const content = typeof payload.content === "string" ? payload.content : "";
      setTyping(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: content || m.content, status: "complete", streaming: false }
            : m,
        ),
      );
      void loadMessages();
      return;
    }
  });

  const onConnect = useCallback(async () => {
    setHeaderBusy(true);
    setConnection("connecting");
    setDiagnostics(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setConnection("error");
        setDiagnostics(body?.error ?? `Connect failed (${res.status})`);
        return;
      }
      setConnection("connected");
      await loadStatus();
    } finally {
      setHeaderBusy(false);
    }
  }, [loadStatus, sessionId]);

  const onDisconnect = useCallback(async () => {
    setHeaderBusy(true);
    try {
      await fetch(`/api/sessions/${sessionId}/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setConnection("disconnected");
      setTyping(false);
      await loadMessages();
      await loadStatus();
    } finally {
      setHeaderBusy(false);
    }
  }, [loadMessages, loadStatus, sessionId]);

  const onSend = useCallback(
    async (text: string) => {
      const res = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.status === 409) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setDiagnostics(body?.error ?? "Connect to Hermes before sending messages.");
        return;
      }
      if (!res.ok) {
        setDiagnostics(`Send failed (${res.status})`);
        return;
      }
      await loadMessages();
    },
    [loadMessages, sessionId],
  );

  const onCreateSession = useCallback(async () => {
    setCreatingSession(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { session: { id: string } };
      await refresh();
      router.push(`/sessions/${data.session.id}`);
    } finally {
      setCreatingSession(false);
    }
  }, [refresh, router]);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  const sortedSessions: ApiSessionSummary[] = useMemo(() => {
    return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sessions]);

  return (
    <AppFrame>
      <details className="border-b border-border bg-surface-muted/30 md:hidden">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-zinc-800 marker:hidden dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
          Sessions
        </summary>
        <div className="max-h-64 overflow-y-auto border-t border-border">
          <SessionSidebar
            sessions={sortedSessions}
            activeId={sessionId}
            loading={sessionsLoading}
            onCreate={onCreateSession}
            creating={creatingSession}
          />
        </div>
      </details>
      <ChatShell
        sessionId={sessionId}
        title={title}
        sessions={sortedSessions}
        sessionsLoading={sessionsLoading}
        messages={messages}
        connection={connection}
        headerBusy={headerBusy}
        composerDisabled={connection !== "connected"}
        typing={typing}
        diagnostics={diagnostics}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onSend={onSend}
        onCreateSession={onCreateSession}
        creatingSession={creatingSession}
      />
    </AppFrame>
  );
}
