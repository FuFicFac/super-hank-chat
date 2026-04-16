import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-200",
        className,
      )}
      {...props}
    />
  );
}
