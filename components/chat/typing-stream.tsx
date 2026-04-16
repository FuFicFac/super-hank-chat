"use client";

export function TypingStream({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="flex justify-start px-3 md:px-6">
      <div className="rounded-2xl bg-surface-elevated px-4 py-2 text-xs text-zinc-500 ring-1 ring-border dark:bg-zinc-900/60 dark:text-zinc-400">
        Hermes is responding…
      </div>
    </div>
  );
}
