"use client";

import { VoiceIndicator } from "@/components/chat/voice-indicator";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  voiceEnabled?: boolean;
  onTranscript?: (text: string) => void;
  disabled?: boolean;
};

export function SttSlot({ voiceEnabled, onTranscript, disabled }: Props) {
  const { transcript, listening, supported, start, stop, reset } =
    useSpeechRecognition();
  const prevListening = useRef(false);

  useEffect(() => {
    if (prevListening.current && !listening && transcript.trim() && onTranscript) {
      onTranscript(transcript.trim());
      reset();
    }
    prevListening.current = listening;
  }, [listening, transcript, onTranscript, reset]);

  if (!voiceEnabled) return null;

  const toggle = () => {
    if (!supported || disabled) return;
    if (listening) {
      stop();
    } else {
      reset();
      start();
    }
  };

  const micDisabled = disabled || !supported;

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div
        className={
          listening
            ? "rounded-full p-0.5 ring-2 ring-red-500 ring-offset-2 ring-offset-background animate-pulse"
            : ""
        }
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative h-10 w-10 shrink-0"
          onClick={toggle}
          disabled={micDisabled}
          aria-pressed={listening}
          aria-label={listening ? "Stop voice input" : "Start voice input"}
          title={
            !supported
              ? "Speech recognition is not supported in this browser"
              : listening
                ? "Stop listening"
                : "Speak to type"
          }
        >
          {supported ? (
            <Mic className="h-4 w-4" aria-hidden />
          ) : (
            <MicOff className="h-4 w-4 text-zinc-400" aria-hidden />
          )}
        </Button>
      </div>
      <VoiceIndicator listening={listening} speaking={false} />
    </div>
  );
}
