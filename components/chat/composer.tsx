"use client";

import { SttSlot } from "@/components/chat/stt-slot";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal } from "lucide-react";
import { useCallback, useState, type KeyboardEvent } from "react";

type Props = {
  disabled?: boolean;
  placeholder?: string;
  onSend: (text: string) => void | Promise<void>;
};

export function Composer({ disabled, placeholder, onSend }: Props) {
  const [value, setValue] = useState("");

  const submit = useCallback(async () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    await onSend(text);
  }, [disabled, onSend, value]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div className="border-t border-border bg-surface/80 p-3 backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        <div className="flex items-end gap-2">
          <SttSlot />
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder ?? "Message Hermes…"}
            disabled={disabled}
            rows={3}
            className="flex-1"
            aria-label="Message input"
          />
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={disabled || !value.trim()}
            className="shrink-0"
            aria-label="Send message"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Enter sends · Shift+Enter adds a new line
        </p>
      </div>
    </div>
  );
}
