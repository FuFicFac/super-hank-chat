import type { Artifact } from "@/lib/artifacts/schema";
import type { UiMessage } from "@/types/chat";
import { ExternalLink, Volume2 } from "lucide-react";
import { MessageMarkdown } from "./message-markdown";

export function MessageBubble({
  message,
  onViewArtifact,
  onSpeak,
}: {
  message: UiMessage;
  onViewArtifact?: (artifact: Artifact) => void;
  onSpeak?: (text: string) => void;
}) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isMeta = message.role === "system" || message.role === "status";

  // Format timestamp
  const timestamp = new Date(message.createdAt * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isMeta) {
    return (
      <div className="flex justify-center mb-1">
        <div className="max-w-[90%] rounded-md border border-dashed border-zinc-300 dark:border-zinc-600 px-3 py-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
          {message.content}
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end mb-1">
        <div>
          <div className="bg-blue-600 dark:bg-blue-700 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm">
            <span>{message.content}</span>
            {message.streaming ? (
              <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-blue-200" />
            ) : null}
          </div>
          <div className="text-xs text-zinc-400 text-right mr-1 mt-1">
            {timestamp}
          </div>
        </div>
      </div>
    );
  }

  if (isAssistant) {
    const canSpeak = Boolean(onSpeak) && !message.streaming && message.content.trim();

    return (
      <div className="flex justify-start mb-1">
        <div className="max-w-[85%]">
          <div className="relative bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tl-sm px-4 py-3 pr-10">
            <MessageMarkdown
              content={message.content || (message.streaming ? "…" : "")}
            />
            {message.streaming ? (
              <span className="mt-2 inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
            ) : null}
            {canSpeak ? (
              <button
                type="button"
                className="absolute right-2 top-2 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200/80 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700/80 dark:hover:text-zinc-100"
                aria-label="Speak this message"
                title="Speak this message"
                onClick={() => onSpeak?.(message.content)}
              >
                <Volume2 className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
          {message.artifact && onViewArtifact ? (
            <button
              type="button"
              className="mt-1.5 ml-1 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={() => onViewArtifact(message.artifact!)}
            >
              <ExternalLink size={11} />
              View {message.artifact.title ?? message.artifact.type}
            </button>
          ) : null}
          <div className="text-xs text-zinc-400 text-left ml-1 mt-1">
            {timestamp}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
