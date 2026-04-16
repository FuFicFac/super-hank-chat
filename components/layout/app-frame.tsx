import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

export function AppFrame({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "h-dvh overflow-hidden flex flex-col bg-surface text-zinc-900 antialiased dark:text-zinc-50",
        className,
      )}
    >
      {children}
    </div>
  );
}
