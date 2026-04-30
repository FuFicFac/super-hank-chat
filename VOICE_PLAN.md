# Super Hank Chat — Voice Mode Plan

## Overview
Add optional voice input (STT) and voice output (TTS) to Super Hank Chat.
- **STT**: Browser's built-in `webkitSpeechRecognition` API (free, no key needed)
- **TTS**: Google Gemini / Google Cloud TTS via API route using `GOOGLE_API_KEY`
- **Voice Mode**: A toggle in the header. When ON, mic button appears in composer and responses auto-read aloud.

## Existing Seams (already in codebase)
- `lib/audio/contracts.ts` — `TextToSpeechProvider`, `SpeechToTextProvider`, `AudioOutputController`, `VoiceInputController` interfaces
- `lib/audio/stt-placeholder.ts` — placeholder STT provider
- `lib/audio/tts-placeholder.ts` — placeholder TTS provider
- `components/chat/stt-slot.tsx` — empty slot rendered inside `Composer`
- `components/chat/tts-slot.tsx` — empty slot rendered inside `ChatHeader`

## Architecture

```
Voice ON:
  User clicks mic → Browser SpeechRecognition → transcribed text → composer input → onSend (Hermes as usual)
  Response arrives → auto-call POST /api/tts { text } → stream audio → play in browser

Voice OFF:
  Normal text chat, no voice features visible
```

Google API is ONLY used for TTS. STT uses the browser's free built-in API.

---

## AGENT A — Claude Code Sub-Agent (Backend + Hooks + Lib)

### Files to CREATE:
1. **`lib/audio/google-tts.ts`** — TextToSpeechProvider implementation
   - Implements `speak(text, signal?)` — calls `/api/tts` with POST, gets back audio, plays via `Audio()` element
   - Implements `stop()` — pauses and clears current audio
   - Export: `googleTtsProvider: TextToSpeechProvider`

2. **`lib/audio/browser-stt.ts`** — SpeechToTextProvider using browser API
   - Uses `webkitSpeechRecognition` / `SpeechRecognition`
   - Real-time transcription (interim results)
   - Export: `browserSttProvider: SpeechToTextProvider`
   - Also export: `isSpeechRecognitionSupported(): boolean`

3. **`app/api/tts/route.ts`** — POST endpoint
   - Accepts: `{ text: string }`
   - Reads `GOOGLE_API_KEY` from env
   - Calls Google's TTS endpoint (use `https://texttospeech.googleapis.com/v1/text:synthesize`)
   - Returns audio as `audio/mpeg` stream
   - If no API key, return 501

4. **`hooks/use-speech-recognition.ts`** — Browser STT hook
   ```ts
   export function useSpeechRecognition(): {
     transcript: string;        // current transcript text
     listening: boolean;        // is mic active
     supported: boolean;        // is browser STT available
     start: () => void;         // begin listening
     stop: () => void;          // stop listening
     reset: () => void;         // clear transcript
   }
   ```

5. **`hooks/use-voice-mode.ts`** — Voice mode state
   ```ts
   export function useVoiceMode(): {
     enabled: boolean;          // voice mode on/off
     toggle: () => void;        // flip voice mode
     speaking: boolean;         // TTS currently playing
     speak: (text: string) => Promise<void>;  // trigger TTS
     stopSpeaking: () => void;  // stop TTS playback
   }
   ```

### Files to MODIFY:
- **`lib/audio/contracts.ts`** — Add if needed (probably fine as-is)

### DO NOT TOUCH:
- Any file in `components/` — that's Composer 2's territory
- `chat-shell.tsx`, `chat-header.tsx`, `composer.tsx`, `message-bubble.tsx`
- `stt-slot.tsx`, `tts-slot.tsx`

---

## AGENT B — Composer 2 / Cursor (Frontend UI Components)

### Files to MODIFY:

1. **`components/chat/stt-slot.tsx`** — Real mic button
   - Import and use `useSpeechRecognition` from `@/hooks/use-speech-recognition`
   - Show mic button (Mic icon from lucide-react)
   - When clicked: start listening, show pulsing red indicator
   - When transcript is ready, call `onTranscript(text)` callback prop
   - Only render when `voiceEnabled` prop is true

2. **`components/chat/tts-slot.tsx`** — Voice mode toggle
   - A toggle button (Volume2 / VolumeX icons from lucide-react)
   - When clicked, calls `onToggle` callback prop
   - Shows current state (on/off) visually

3. **`components/chat/composer.tsx`** — Wire up mic
   - Accept new props: `voiceEnabled?: boolean`, `onVoiceTranscript?: (text: string) => void`
   - Pass to SttSlot
   - When transcript received, set it as the input value and optionally auto-send

4. **`components/chat/message-bubble.tsx`** — Add speak button
   - Accept new prop: `onSpeak?: (text: string) => void`
   - Small speaker icon button on each assistant message
   - Only visible when voice mode enabled

5. **`components/chat/chat-header.tsx`** — Wire voice toggle
   - Accept new props: `voiceEnabled?: boolean`, `onToggleVoice?: () => void`
   - Pass to TtsSlot

6. **`components/chat/chat-shell.tsx`** — Thread voice props
   - Accept `voiceEnabled`, `onToggleVoice`, `onSpeak` in Props
   - Pass down to ChatHeader, Composer, MessageList

7. **`components/chat/message-list.tsx`** — Pass onSpeak to bubbles
   - Accept `onSpeak` prop, pass to each MessageBubble

### Files to CREATE:
8. **`components/chat/voice-indicator.tsx`** — Visual feedback
   - Pulsing dot or waveform animation when listening
   - Speaker animation when TTS is playing

### DO NOT TOUCH:
- Any file in `lib/`, `hooks/`, or `app/api/` — that's Claude Code's territory
- `use-auto-scroll.ts`, `use-session-stream.ts`

---

## Integration Point (after both agents finish)
`chat-page-client.tsx` will need to be updated to:
- Import `useVoiceMode` hook
- Pass voice props down to `ChatShell`
- Wire `speak()` to message responses when voice mode is on

This file will be integrated AFTER both agents complete.

---

## Environment
- Working directory: `/Users/ekelloharrid/super-hank-chat`
- Dev server: port 3099
- Google API key: provide `GOOGLE_API_KEY` via local environment only; never commit key values or key fragments.
- For the API route, read the key from `process.env.GOOGLE_API_KEY`
- Next.js 15, React 19, TypeScript, Tailwind CSS
- Icons: lucide-react (already installed)
- NO new dependencies unless absolutely necessary

## DO NOT:
- Change the existing chat flow or Hermes integration
- Touch the session/message API routes
- Add any AI inference through Google — only TTS
- Break the existing text-only chat experience
