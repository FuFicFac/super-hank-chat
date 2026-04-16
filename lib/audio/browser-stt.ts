"use client";

import type { SpeechToTextProvider } from "./contracts";

/**
 * Check if the browser supports the Web Speech Recognition API.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  );
}

/**
 * Get the SpeechRecognition constructor if available.
 */
function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => SpeechRecognition)
    | null;
}

/**
 * Browser-based SpeechToTextProvider using the Web Speech API.
 *
 * The `transcribe` method on the interface expects a Blob, but the browser
 * Speech Recognition API works with the microphone directly. This provider
 * implements the interface for compatibility but the primary usage path is
 * through the `useSpeechRecognition` hook which uses the browser API directly.
 */
export const browserSttProvider: SpeechToTextProvider = {
  id: "browser-stt",

  async transcribe(_audio: Blob, _signal?: AbortSignal): Promise<string> {
    // The browser Speech Recognition API doesn't accept audio blobs —
    // it captures from the microphone directly. This method exists to
    // satisfy the interface. Real usage goes through the hook.
    throw new Error(
      "Browser STT does not support blob transcription. Use useSpeechRecognition hook instead.",
    );
  },
};

/**
 * Create a SpeechRecognition instance configured for continuous recognition
 * with interim results. Used by the useSpeechRecognition hook.
 */
export function createRecognition(): SpeechRecognition | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  return recognition;
}
