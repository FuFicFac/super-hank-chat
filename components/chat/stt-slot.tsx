"use client";

import type { SpeechToTextProvider } from "@/lib/audio/contracts";

/**
 * Reserved UI seam for future STT / voice input.
 */
export function SttSlot(_: { provider?: SpeechToTextProvider | null }) {
  void _;
  return null;
}
