import { cn } from "@/lib/utils/cn";
import type { TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[44px] w-full resize-none rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-zinc-100 dark:placeholder:text-zinc-400",
          className,
        )}
        {...props}
      />
    );
  },
);
