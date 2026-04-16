import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md" | "icon";
  children: ReactNode;
};

export function Button({
  className,
  variant = "default",
  size = "md",
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variant === "default" &&
          "bg-zinc-100 text-zinc-900 hover:bg-white dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700",
        variant === "ghost" && "hover:bg-zinc-200/60 dark:hover:bg-zinc-800/80",
        variant === "outline" &&
          "border border-border bg-transparent hover:bg-zinc-200/40 dark:hover:bg-zinc-800/60",
        variant === "destructive" && "bg-red-600 text-white hover:bg-red-500",
        size === "sm" && "h-8 px-3 text-sm",
        size === "md" && "h-10 px-4 text-sm",
        size === "icon" && "h-9 w-9",
        className,
      )}
      {...props}
    />
  );
}
