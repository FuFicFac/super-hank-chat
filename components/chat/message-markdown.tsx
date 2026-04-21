"use client";

import { preprocessAssistantMarkdown } from "@/lib/utils/markdown";
import ReactMarkdown, { type Components } from "react-markdown";
import { isValidElement } from "react";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { useRef, useState } from "react";
import { Copy, Check } from "lucide-react";

export function MessageMarkdown({ content }: { content: string }) {
  const text = preprocessAssistantMarkdown(content);

  const components: Components = {
    a: ({ href, children, ...props }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    ),
    pre: ({ children, ...props }) => {
      // Extract language from code element's className
      let language = "plaintext";
      let codeContent = "";

      // Handle code element inside pre
      const codeElement = Array.isArray(children)
        ? children.find((child) => isValidElement(child) && child.type === "code")
        : isValidElement(children) && children.type === "code"
          ? children
          : null;

      if (codeElement && codeElement.props) {
        const className = codeElement.props.className || "";
        const match = className.match(/language-(\w+)/);
        if (match) {
          language = match[1];
        }
        codeContent = codeElement.props.children || "";
      }

      return (
        <CodeBlock language={language} codeContent={codeContent}>
          {children}
        </CodeBlock>
      );
    },
  };

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:p-0 prose-pre:bg-transparent prose-code:before:content-none prose-code:after:content-none prose-code:font-mono prose-code:text-sm prose-headings:font-semibold prose-a:text-blue-500">
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({
  language,
  codeContent,
  children,
}: {
  language: string;
  codeContent: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    try {
      // Use DOM textContent — reliable after rehype-highlight transforms children into nodes
      const text = preRef.current?.textContent ?? "";
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
      {/* Toolbar */}
      <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          title={copied ? "Copied!" : "Copy code"}
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
          )}
        </button>
      </div>

      {/* Code block */}
      <pre ref={preRef} className="p-4 overflow-x-auto text-sm bg-white dark:bg-zinc-900/50">
        {children}
      </pre>
    </div>
  );
}
