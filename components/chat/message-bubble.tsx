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
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (isMeta) {
    return (
      <div style={{
        alignSelf: "center",
        maxWidth: "80%",
        padding: "6px 14px",
        border: "1px dashed var(--d-blue)",
        color: "var(--d-blue-ink)",
        fontSize: 10,
        letterSpacing: 1.2,
        textAlign: "center",
        background: "rgba(58,143,224,0.08)",
      }}>
        <span style={{ opacity: 0.8, marginRight: 10 }}>{ts}</span>
        {message.content.toUpperCase()}
      </div>
    );
  }

  if (isUser) {
    return (
      <div style={{ alignSelf: "flex-end", maxWidth: "72%", textAlign: "right" }}>
        <div style={{
          fontSize: 9,
          color: "var(--d-mute)",
          letterSpacing: 1.2,
          marginBottom: 4,
        }}>
          EKELLO · {ts}
        </div>
        <div style={{
          background: "var(--d-green)",
          color: "var(--d-on-accent)",
          padding: "10px 14px",
          borderRadius: 10,
          fontFamily: "var(--font-serif, Newsreader, Georgia, serif)",
          fontSize: 15,
          lineHeight: 1.42,
          textAlign: "left",
          fontWeight: 500,
        }}>
          {message.content}
          {message.streaming && (
            <span style={{
              display: "inline-block",
              width: 8, height: 14,
              background: "var(--d-on-accent)",
              marginLeft: 2,
              verticalAlign: "-2px",
              animation: "dispatchBlink 0.9s infinite",
            }} />
          )}
        </div>
      </div>
    );
  }

  if (isAssistant) {
    return (
      <div style={{ alignSelf: "flex-start", maxWidth: "78%" }}>
        <div style={{
          fontSize: 9,
          color: "var(--d-green-ink)",
          letterSpacing: 1.6,
          marginBottom: 4,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}>
          <span>HANK · {ts}</span>
          {speaking && message.streaming && (
            <TtsBars />
          )}
          {!message.streaming && onSpeak && message.content.trim() && (
            <button
              onClick={() => onSpeak(message.content)}
              title="Speak this message"
              style={{
                background: "none",
                border: "none",
                color: "var(--d-mute)",
                cursor: "pointer",
                fontSize: 10,
                letterSpacing: 1,
                padding: 0,
              }}
            >
              ▶ SPEAK
            </button>
          )}
        </div>
        <div style={{
          fontFamily: "var(--font-serif, Newsreader, Georgia, serif)",
          fontSize: 16,
          lineHeight: 1.5,
          color: "var(--d-ink)",
          borderLeft: "2px solid var(--d-green)",
          paddingLeft: 14,
        }}>
          <MessageMarkdown content={message.content || (message.streaming ? "…" : "")} />
          {message.streaming && (
            <span style={{
              display: "inline-block",
              width: 8, height: 16,
              background: "var(--d-green)",
              marginLeft: 2,
              verticalAlign: "-2px",
              animation: "dispatchBlink 0.9s infinite",
            }} />
          )}
        </div>
        {message.artifact && onViewArtifact && (
          <div
            onClick={() => onViewArtifact(message.artifact!)}
            style={{
              marginTop: 10,
              marginLeft: 16,
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid var(--d-blue)",
              background: "var(--d-chip-bg)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "fit-content",
            }}
          >
            <span style={{
              fontSize: 9,
              color: "var(--d-blue-ink)",
              letterSpacing: 1.6,
              border: "1px solid var(--d-blue)",
              padding: "2px 5px",
              borderRadius: 4,
            }}>
              [{message.artifact.id ?? message.artifact.type.toUpperCase()}]
            </span>
            <span style={{ fontSize: 12, color: "var(--d-ink)" }}>
              {message.artifact.title ?? message.artifact.type}
            </span>
            <span style={{ fontSize: 10, color: "var(--d-mute)" }}>
              {message.artifact.type.toUpperCase()}
            </span>
            <span style={{ fontSize: 10, color: "var(--d-blue-ink)", marginLeft: 6 }}>
              OPEN →
            </span>
          </div>
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
        <span key={i} style={{
          width: 2,
          height: `${6 + i * 2}px`,
          background: "var(--d-green)",
          animation: "dispatchBlink 0.9s infinite",
          animationDelay: `${i * 120}ms`,
        }} />
      ))}
    </span>
  );
}
