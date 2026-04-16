"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { ApiSessionSummary } from "@/types/api";
import { MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type Props = {
  sessions: ApiSessionSummary[];
  activeId: string;
  loading?: boolean;
  onCreate: () => void;
  creating?: boolean;
};

export function SessionSidebar({
  sessions,
  activeId,
  loading,
  onCreate,
  creating,
}: Props) {
  return (
    <aside className="flex w-full flex-col border-border bg-surface-muted/40 md:w-72 md:border-r">
      <div className="flex items-center justify-between gap-2 p-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Sessions</h2>
        <Button size="sm" onClick={onCreate} disabled={creating} aria-label="New session">
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        {loading ? (
          <p className="p-3 text-sm text-zinc-500">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <p className="p-3 text-sm text-zinc-500">No sessions yet. Create one to begin.</p>
        ) : (
          <ul className="flex flex-col p-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sessions/${s.id}`}
                  className={cn(
                    "block rounded-md px-2 py-2 text-sm transition-colors hover:bg-zinc-200/70 dark:hover:bg-zinc-800/80",
                    s.id === activeId &&
                      "bg-zinc-200/90 font-medium dark:bg-zinc-800/90",
                  )}
                >
                  <span className="line-clamp-2">{s.title}</span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    {s.messageCount} {s.messageCount === 1 ? "message" : "messages"} · {s.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </aside>
  );
}
