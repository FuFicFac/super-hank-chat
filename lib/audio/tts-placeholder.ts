import type { TextToSpeechProvider } from "./contracts";

export const ttsNotImplemented: TextToSpeechProvider = {
  id: "placeholder-tts",
  async speak() {
    throw new Error("TTS is not implemented in Hank Chat v1");
  },
  async stop() {
    /* no-op */
  },
};
