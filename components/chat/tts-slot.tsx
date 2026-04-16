"use client";

import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

type Props = {
  enabled?: boolean;
  onToggle?: () => void;
};

export function TtsSlot({ enabled, onToggle }: Props) {
  const isOn = Boolean(enabled);

  return (
    <Button
      type="button"
      variant={isOn ? "default" : "outline"}
      size="icon"
      className={`h-9 w-9 shrink-0 transition-colors ${
        isOn
          ? "border border-emerald-500/50 bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/25 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
          : "text-zinc-500 dark:text-zinc-400"
      }`}
      onClick={onToggle}
      disabled={!onToggle}
      aria-pressed={isOn}
      aria-label={isOn ? "Voice mode on" : "Voice mode off"}
      title={isOn ? "Turn voice mode off" : "Turn voice mode on"}
    >
      {isOn ? (
        <Volume2 className="h-4 w-4" aria-hidden />
      ) : (
        <VolumeX className="h-4 w-4" aria-hidden />
      )}
    </Button>
  );
}
