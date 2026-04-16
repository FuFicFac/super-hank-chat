"use client";

import type { Artifact } from "@/lib/artifacts/schema";
import type { UiMessage } from "@/types/chat";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { MessageBubble } from "./message-bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDown } from "lucide-react";

export function MessageList({
  messages,
  onViewArtifact,
  onSpeak,
}: {
  messages: UiMessage[];
  onViewArtifact: (artifact: Artifact) => void;
  onSpeak?: (text: string) => void;
}) {
  const { ref, scrollToBottom, isAtBottom } = useAutoScroll<HTMLDivElement>([messages]);

  return (
    <div className="relative flex-1 min-h-0">
      <ScrollArea ref={ref} className="h-full">
        <div className="flex flex-col gap-2 px-4 py-4">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onViewArtifact={onViewArtifact}
              onSpeak={onSpeak}
            />
          ))}
        </div>
      </ScrollArea>
      {!isAtBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border bg-surface-elevated p-2 shadow-lg transition-opacity hover:bg-zinc-200 dark:hover:bg-zinc-700"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
        </button>
      )}
    </div>
  );
}
