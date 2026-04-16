"use client";

import { useCallback, useRef, useState } from "react";
import { googleTtsProvider } from "@/lib/audio/google-tts";

export function useVoiceMode() {
  const [enabled, setEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  const speak = useCallback(async (text: string) => {
    // Abort any in-progress speech
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setSpeaking(true);
    try {
      await googleTtsProvider.speak(text, controller.signal);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.warn("[VoiceMode] TTS error:", err);
    } finally {
      setSpeaking(false);
      abortRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    googleTtsProvider.stop();
    setSpeaking(false);
  }, []);

  return { enabled, toggle, speaking, speak, stopSpeaking };
}
