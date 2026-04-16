"use client";

type Props = {
  listening?: boolean;
  speaking?: boolean;
};

/**
 * Compact status for voice input/output — pulsing capture dot while listening,
 * animated bars while TTS is playing.
 */
export function VoiceIndicator({ listening, speaking }: Props) {
  if (!listening && !speaking) return null;

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-300"
      role="status"
      aria-live="polite"
    >
      {listening ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span>Listening…</span>
        </>
      ) : null}
      {speaking ? (
        <>
          <span className="inline-flex h-4 items-end gap-0.5" aria-hidden>
            <span className="h-2 w-0.5 animate-pulse rounded-full bg-emerald-500 [animation-delay:0ms]" />
            <span className="h-3 w-0.5 animate-pulse rounded-full bg-emerald-500 [animation-delay:150ms]" />
            <span className="h-2 w-0.5 animate-pulse rounded-full bg-emerald-500 [animation-delay:300ms]" />
          </span>
          <span>Speaking…</span>
        </>
      ) : null}
    </div>
  );
}
