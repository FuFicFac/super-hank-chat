"use client";

import { preprocessAssistantMarkdown } from "@/lib/utils/markdown";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

export function MessageMarkdown({ content }: { content: string }) {
  const text = preprocessAssistantMarkdown(content);
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:bg-zinc-900/80 prose-pre:text-zinc-100">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
