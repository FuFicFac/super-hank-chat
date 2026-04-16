import { cn } from "@/lib/utils/cn";
import type { UiMessage } from "@/types/chat";
import { MessageMarkdown } from "./message-markdown";

export function MessageBubble({ message }: { message: UiMessage }) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isMeta = message.role === "system" || message.role === "status";

  if (isMeta) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[90%] rounded-md border border-dashed border-border px-3 py-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[min(720px,92%)] rounded-2xl px-4 py-3 text-sm shadow-sm",
          isUser &&
            "bg-emerald-600 text-white dark:bg-emerald-700 whitespace-pre-wrap",
          isAssistant &&
            "bg-surface-elevated text-zinc-900 ring-1 ring-border dark:bg-zinc-900/70 dark:text-zinc-50",
        )}
      >
        {isAssistant ? (
          <MessageMarkdown content={message.content || (message.streaming ? "…" : "")} />
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
        {message.streaming ? (
          <span className="mt-2 inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
        ) : null}
      </div>
    </div>
  );
}
