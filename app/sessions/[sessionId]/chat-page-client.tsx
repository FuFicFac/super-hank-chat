"use client";

import { AppFrame } from "@/components/layout/app-frame";
import { AgentPicker } from "@/components/chat/agent-picker";
import { ChatShell } from "@/components/chat/chat-shell";
import type { ConnectionUiState } from "@/components/chat/connection-pill";
import { useSessionList } from "@/hooks/use-session-list";
import { useSessionStream } from "@/hooks/use-session-stream";
import { useVoiceMode } from "@/hooks/use-voice-mode";
import { parseMessageForArtifact } from "@/lib/artifacts/parser";
import type { Artifact } from "@/lib/artifacts/schema";
import { getAgentProfile } from "@/lib/agents/profiles";
import {
  denoiseAssistantStream,
  extractToolActivity,
  sanitizeHermesDiagnosticDelta,
  toAssistantView,
  toVisibleHermesAssistantContent,
} from "@/lib/hermes/query-output";
import type { ApiMessage, ApiSessionSummary } from "@/types/api";
import type { UiMessage } from "@/types/chat";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function toUiMessage(m: ApiMessage): UiMessage {
  return {
    id: m.id,
    role: m.role as UiMessage["role"],
    content: m.content,
    status: m.status,
    createdAt: m.createdAt,
    streaming: m.status === "streaming",
    artifact: m.artifact ?? null,
    thinking: m.thinking ?? null,
  };
}

function sessionCode(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) >>> 0;
  }
  return "HNK-" + String(h % 10000).padStart(4, "0");
}

function safeMarkdownFilename(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^\w .-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return cleaned || "session";
}

export function ChatPageClient({
  sessionId,
  initialTitle,
  initialAgentId,
}: {
  sessionId: string;
  initialTitle: string;
  initialAgentId: string | null;
}) {
  const router = useRouter();
  const { sessions, loading: sessionsLoading, refresh } = useSessionList();
  const [title, setTitle] = useState(initialTitle);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [connection, setConnection] = useState<ConnectionUiState>("disconnected");
  const [headerBusy, setHeaderBusy] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [toolActivity, setToolActivity] = useState<string | null>(null);
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);
  const streamingAssistantRawRef = useRef<Map<string, string>>(new Map());
  const voice = useVoiceMode();
  // Latest voice state for use inside the SSE callback (avoids stale closure).
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

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
      setToolActivity(null);
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
      streamingAssistantRawRef.current.set(messageId, "");
      setTyping(true);
      setToolActivity(null);
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
      const prevRaw = streamingAssistantRawRef.current.get(messageId) ?? "";
      const raw = prevRaw + delta;
      streamingAssistantRawRef.current.set(messageId, raw);
      const activities = extractToolActivity(raw);
      setToolActivity(activities.length > 0 ? activities[activities.length - 1] : null);
      // During streaming show denoised text live (warning + reasoning borders
      // stripped) so Hank's thinking is visible as it arrives; the clean
      // answer/thinking split happens on message.completed.
      const visible = denoiseAssistantStream(toVisibleHermesAssistantContent(raw));
      const { prose, artifact } = parseMessageForArtifact(visible);
      if (artifact) setCurrentArtifact(artifact);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content: prose,
                artifact: artifact ?? m.artifact ?? null,
                streaming: true,
              }
            : m,
        ),
      );
      return;
    }
    if (type === "message.completed") {
      const messageId = typeof payload.messageId === "string" ? payload.messageId : "";
      const content = typeof payload.content === "string" ? payload.content : "";
      streamingAssistantRawRef.current.delete(messageId);
      setToolActivity(null);
      const { answer, thinking } = toAssistantView(content);
      const { prose, artifact } = parseMessageForArtifact(answer);
      if (artifact) setCurrentArtifact(artifact);
      // Auto-read the reply aloud when voice mode is on.
      if (voiceRef.current.enabled && prose.trim()) {
        void voiceRef.current.speak(prose);
      }
      setTyping(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content: prose || m.content,
                artifact: artifact ?? m.artifact ?? null,
                thinking: thinking ?? m.thinking ?? null,
                status: "complete",
                streaming: false,
              }
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

  const onCreateSession = useCallback(() => {
    setAgentPickerOpen(true);
  }, []);

  const onPickAgent = useCallback(async (agentId: string) => {
    setCreatingSession(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { session: { id: string } };
      setAgentPickerOpen(false);
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
  const currentSession = sortedSessions.find((s) => s.id === sessionId);
  const agent = getAgentProfile(currentSession?.agentId ?? initialAgentId);
  const onExportMarkdown = useCallback(() => {
    const transcript = messages
      .filter((message) => !message.streaming && message.content.trim())
      .map((message) => {
        const speaker =
          message.role === "assistant"
            ? agent.name
            : message.role === "user"
              ? "Ekello"
              : String(message.role);
        const time = new Date(message.createdAt * 1000).toLocaleString();
        return `## ${speaker} · ${time}\n\n${message.content.trim()}`;
      })
      .join("\n\n");

    const blob = new Blob([transcript], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fallbackCode = sessionCode(sessionId);
    link.href = url;
    link.download = `${safeMarkdownFilename(currentSession?.title || title || fallbackCode)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [agent.name, currentSession?.title, messages, sessionId, title]);

  return (
    <AppFrame>
      <ChatShell
        sessionId={sessionId}
        title={title}
        sessions={sortedSessions}
        sessionsLoading={sessionsLoading}
        agent={agent}
        messages={messages}
        connection={connection}
        headerBusy={headerBusy}
        composerDisabled={connection !== "connected"}
        typing={typing}
        toolActivity={toolActivity}
        diagnostics={diagnostics}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onSend={onSend}
        onCreateSession={onCreateSession}
        creatingSession={creatingSession}
        onSessionDeleted={refresh}
        currentArtifact={currentArtifact}
        onCloseArtifact={() => setCurrentArtifact(null)}
        onViewArtifact={(artifact) => setCurrentArtifact(artifact)}
        voiceEnabled={voice.enabled}
        onToggleVoice={voice.toggle}
        onExportMarkdown={onExportMarkdown}
        onSpeak={voice.speak}
        voiceSpeaking={voice.speaking}
      />
      <AgentPicker
        open={agentPickerOpen}
        onClose={() => {
          if (!creatingSession) setAgentPickerOpen(false);
        }}
        onPick={onPickAgent}
      />
    </AppFrame>
  );
}
