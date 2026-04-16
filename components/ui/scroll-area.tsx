import { cn } from "@/lib/utils/cn";
import { forwardRef, type HTMLAttributes } from "react";

export const ScrollArea = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function ScrollArea({ className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("relative min-h-0 overflow-y-auto overflow-x-hidden", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
