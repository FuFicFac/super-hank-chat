"use client";

import type { Artifact } from "@/lib/artifacts/schema";
import type { UiMessage } from "@/types/chat";
import { MessageMarkdown } from "./message-markdown";

export function MessageBubble({
  message,
  onViewArtifact,
  onSpeak,
  speaking,
}: {
  message: UiMessage;
  onViewArtifact?: (artifact: Artifact) => void;
  onSpeak?: (text: string) => void;
  speaking?: boolean;
}) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isMeta = message.role === "system" || message.role === "status";

  const ts = new Date(message.createdAt * 1000).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isMeta) {
    return (
      <div className="message-status-pill">
        <span style={{ opacity: 0.8, marginRight: 10 }}>{ts}</span>
        {message.content}
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="message-bubble-wrap" data-role="user">
        <div className="message-meta">Ekello · {ts}</div>
        <div className="message-card message-card-user">
          {message.content}
          {message.streaming && <span className="message-caret message-caret-user" />}
        </div>
      </div>
    );
  }

  if (isAssistant) {
    return (
      <div className="message-bubble-wrap" data-role="assistant">
        <div className="message-meta">
          <span>Hank · {ts}</span>
          {speaking && message.streaming && <TtsBars />}
          {!message.streaming && onSpeak && message.content.trim() && (
            <button
              type="button"
              onClick={() => onSpeak(message.content)}
              title="Speak this message"
              className="speak-button classroom-button"
            >
              Speak
            </button>
          )}
        </div>
        <div className="message-card message-card-assistant">
          <MessageMarkdown content={message.content || (message.streaming ? "…" : "")} />
          {message.streaming && <span className="message-caret message-caret-assistant" />}
        </div>
        {message.artifact && onViewArtifact && (
          <button
            type="button"
            onClick={() => onViewArtifact(message.artifact!)}
            className="artifact-chip classroom-button"
          >
            <span className="artifact-chip-code">
              {message.artifact.id ?? message.artifact.type.toUpperCase()}
            </span>
            <span style={{ fontSize: 12, color: "var(--d-ink)" }}>
              {message.artifact.title ?? message.artifact.type}
            </span>
            <span style={{ fontSize: 10, color: "var(--d-mute)" }}>
              {message.artifact.type.toUpperCase()}
            </span>
            <span style={{ fontSize: 10, color: "var(--d-blue-ink)", marginLeft: 6 }}>
              Open →
            </span>
          </button>
        )}
      </div>
    );
  }

  return null;
}

function TtsBars() {
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "end", height: 10 }}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            width: 2,
            height: `${6 + i * 2}px`,
            background: "var(--d-green)",
            animation: "dispatchBlink 0.9s infinite",
            animationDelay: `${i * 120}ms`,
          }}
        />
      ))}
    </span>
  );
}
