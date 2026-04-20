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
    <div style={{ flex: 1, minHeight: 0, position: "relative", overflowY: "auto" }} ref={ref}>
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
      {!isAtBottom && (
        <button
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--d-green)",
            border: "none",
            color: "var(--d-on-accent)",
            fontSize: 18,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
            lineHeight: 1,
          }}
        >
          ↓
        </button>
      )}
    </div>
  );
}
