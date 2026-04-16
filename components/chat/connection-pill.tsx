import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

export type ConnectionUiState = "connected" | "disconnected" | "connecting" | "error";

export function ConnectionPill({ state }: { state: ConnectionUiState }) {
  const label =
    state === "connected"
      ? "Connected"
      : state === "connecting"
        ? "Connecting"
        : state === "error"
          ? "Error"
          : "Disconnected";

  return (
    <Badge
      className={cn(
        "border-transparent",
        state === "connected" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        state === "disconnected" && "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
        state === "connecting" && "bg-amber-500/15 text-amber-800 dark:text-amber-200",
        state === "error" && "bg-red-500/15 text-red-700 dark:text-red-300",
      )}
      aria-live="polite"
    >
      {label}
    </Badge>
  );
}
