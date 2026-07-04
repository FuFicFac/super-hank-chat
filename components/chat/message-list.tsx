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
    <div className="message-list-shell">
      {/* Scroll container — ref goes here so useAutoScroll targets the right element */}
      <div className="message-scroll" ref={ref}>
        <div className="message-stack">
          {messages.map((m, index) => {
            const previous = messages[index - 1];
            const showAvatar = m.role === "assistant" && previous?.role !== "assistant";
            return (
              <MessageBubble
                key={m.id}
                message={m}
                onViewArtifact={onViewArtifact}
                onSpeak={onSpeak}
                speaking={speaking}
                showAvatar={showAvatar}
              />
            );
          })}
        </div>
      </div>

      {/* Scroll-to-bottom button — outside the scroll container so it stays visible */}
      {!isAtBottom && (
        <button
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
          className="scroll-bottom-button classroom-button"
        >
          ↓
        </button>
      )}
    </div>
  );
}
