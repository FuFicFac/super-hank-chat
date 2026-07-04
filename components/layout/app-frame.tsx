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
        "app-frame h-dvh overflow-hidden flex flex-col antialiased",
        className,
      )}
    >
      {children}
    </div>
  );
}
