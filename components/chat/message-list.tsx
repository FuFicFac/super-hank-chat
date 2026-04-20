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
          style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--d-bg2)",
            border: "1px solid var(--d-outline)",
            color: "var(--d-outline-ink)",
            fontSize: 9,
            letterSpacing: 1.6,
            padding: "5px 10px",
            cursor: "pointer",
          }}
          aria-label="Scroll to bottom"
        >
          ↓ LATEST
        </button>
      )}
    </div>
  );
}
