"use client";

import { ArtifactIframe } from "./artifact-iframe";
import type { Artifact } from "@/lib/artifacts/schema";
import { X, Maximize2, Minimize2, Copy, Check } from "lucide-react";
import { useState } from "react";

type Props = {
  artifact: Artifact;
  onClose: () => void;
};

const TYPE_LABELS: Record<string, string> = {
  html: "HTML",
  svg: "SVG",
  code: "Code",
  markdown: "Markdown",
};

export function ArtifactPanel({ artifact, onClose }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopySource = () => {
    navigator.clipboard.writeText(artifact.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-900"
          : "flex h-full flex-col bg-white dark:bg-zinc-900"
      }
    >
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {TYPE_LABELS[artifact.type] ?? artifact.type}
          </span>
          {artifact.title && (
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {artifact.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopySource}
            title="Copy source"
            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <ArtifactIframe
          type={artifact.type}
          content={artifact.content}
          title={artifact.title}
        />
      </div>
    </div>
  );
}
