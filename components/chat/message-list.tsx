"use client";

import type { Artifact } from "@/lib/artifacts/schema";
import type { AgentProfile } from "@/lib/agents/profiles";
import type { UiMessage } from "@/types/chat";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";

export function MessageList({
  messages,
  agent,
  onViewArtifact,
  onSpeak,
  speaking,
}: {
  messages: UiMessage[];
  agent: AgentProfile;
  onViewArtifact: (artifact: Artifact) => void;
  onSpeak?: (text: string) => void;
  speaking?: boolean;
}) {
  const { ref, scrollToBottom, isAtBottom } = useAutoScroll<HTMLDivElement>([messages]);

  // When you send a message, always snap to the bottom (re-engage following)
  // regardless of where you'd scrolled — a new message from you is intentional.
  const lastSeenIdRef = useRef<string | null>(null);
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.id !== lastSeenIdRef.current) {
      const isNew = lastSeenIdRef.current !== null;
      lastSeenIdRef.current = last.id;
      if (isNew && last.role === "user") scrollToBottom("smooth");
    }
  }, [messages, scrollToBottom]);

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
                agent={agent}
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
          onClick={() => scrollToBottom("smooth")}
          aria-label="Scroll to bottom"
          className="scroll-bottom-button classroom-button"
        >
          ↓
        </button>
      )}
    </div>
  );
}
