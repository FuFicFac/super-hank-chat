"use client";

import type { UiMessage } from "@/types/chat";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { MessageBubble } from "./message-bubble";
import { ScrollArea } from "@/components/ui/scroll-area";

export function MessageList({ messages }: { messages: UiMessage[] }) {
  const { ref } = useAutoScroll<HTMLDivElement>([messages]);

  return (
    <ScrollArea ref={ref} className="flex-1">
      <div className="flex flex-col gap-2 px-4 py-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>
    </ScrollArea>
  );
}
