import type { SpeechToTextProvider } from "./contracts";

export const sttNotImplemented: SpeechToTextProvider = {
  id: "placeholder-stt",
  async transcribe() {
    throw new Error("STT is not implemented in Hank Chat v1");
  },
};
