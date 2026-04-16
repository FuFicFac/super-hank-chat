"use client";

import type { TextToSpeechProvider } from "@/lib/audio/contracts";

/**
 * Reserved UI seam for future TTS. Pass a provider when one exists.
 */
export function TtsSlot(_: { provider?: TextToSpeechProvider | null }) {
  void _;
  return null;
}
