/**
 * Extension seams for future audio features. No providers ship in v1.
 * @see EXTENSIONS.md
 */

export interface TextToSpeechProvider {
  readonly id: string;
  speak(text: string, signal?: AbortSignal): Promise<void>;
  stop(): Promise<void>;
}

export interface SpeechToTextProvider {
  readonly id: string;
  transcribe(audio: Blob, signal?: AbortSignal): Promise<string>;
}

export interface AudioOutputController {
  setVolume(level: number): void;
}

export interface VoiceInputController {
  start(): Promise<void>;
  stop(): Promise<Blob | null>;
}
