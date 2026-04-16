"use client";

import { ConnectionPill, type ConnectionUiState } from "@/components/chat/connection-pill";
import { TtsSlot } from "@/components/chat/tts-slot";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { Plug, Unplug } from "lucide-react";

type Props = {
  title: string;
  connection: ConnectionUiState;
  busy?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  diagnostics?: string | null;
};

export function ChatHeader({
  title,
  connection,
  busy,
  onConnect,
  onDisconnect,
  diagnostics,
}: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/90 px-3 py-3 backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {APP_NAME}
            </p>
            <h1 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <TtsSlot />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ConnectionPill state={connection} />
          <Button
            size="sm"
            variant="outline"
            onClick={onConnect}
            disabled={busy || connection === "connected" || connection === "connecting"}
          >
            <Plug className="mr-1 h-4 w-4" aria-hidden />
            Connect
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDisconnect}
            disabled={busy || connection === "disconnected"}
          >
            <Unplug className="mr-1 h-4 w-4" aria-hidden />
            Disconnect
          </Button>
        </div>
        {diagnostics ? (
          <p
            className="max-h-24 overflow-auto rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 font-mono text-xs text-amber-900 dark:text-amber-100"
            role="status"
          >
            {diagnostics}
          </p>
        ) : null}
      </div>
    </header>
  );
}
