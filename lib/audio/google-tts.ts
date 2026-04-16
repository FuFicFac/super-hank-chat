"use client";

import type { TextToSpeechProvider } from "./contracts";

let currentAudio: HTMLAudioElement | null = null;

export const googleTtsProvider: TextToSpeechProvider = {
  id: "google-tts",

  async speak(text: string, signal?: AbortSignal): Promise<void> {
    // Stop any currently playing audio first
    await this.stop();

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal,
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "TTS request failed");
      throw new Error(`TTS error ${res.status}: ${msg}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;

    return new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        cleanup();
        resolve();
      };
      audio.onerror = () => {
        cleanup();
        reject(new Error("Audio playback failed"));
      };

      if (signal) {
        signal.addEventListener("abort", () => {
          audio.pause();
          cleanup();
          reject(new DOMException("Aborted", "AbortError"));
        });
      }

      audio.play().catch((err) => {
        cleanup();
        reject(err);
      });

      function cleanup() {
        currentAudio = null;
        URL.revokeObjectURL(url);
      }
    });
  },

  async stop(): Promise<void> {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  },
};
