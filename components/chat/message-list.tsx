"use client";

import type { Artifact } from "@/lib/artifacts/schema";
import type { UiMessage } from "@/types/chat";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { MessageBubble } from "./message-bubble";

export function MessageList({
  messages,
  onViewArtifact,
  onSpeak,
  speaking,
}: {
  messages: UiMessage[];
  onViewArtifact: (artifact: Artifact) => void;
  onSpeak?: (text: string) => void;
  speaking?: boolean;
}) {
  const { ref, scrollToBottom, isAtBottom } = useAutoScroll<HTMLDivElement>([messages]);

  return (
    <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
      {/* Scroll container — ref goes here so useAutoScroll targets the right element */}
      <div style={{ position: "absolute", inset: 0, overflowY: "auto" }} ref={ref}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 22,
          padding: "28px 24px 24px",
        }}>
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onViewArtifact={onViewArtifact}
              onSpeak={onSpeak}
              speaking={speaking}
            />
          ))}
        </div>
      </div>

      {/* Scroll-to-bottom button — outside the scroll container so it stays visible */}
      {!isAtBottom && (
        <button
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
          style={{
            position: "absolute",
            bottom: 20,
            right: 20,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "var(--d-green)",
            border: "2px solid var(--d-on-accent)",
            color: "var(--d-on-accent)",
            fontSize: 22,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            lineHeight: 1,
            zIndex: 10,
          }}
        >
          ↓
        </button>
      )}
    </div>
  );
}
