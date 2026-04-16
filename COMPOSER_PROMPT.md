Read the file VOICE_PLAN.md in this project root. You are AGENT B (Composer 2 / Cursor).

Your job is to build all the frontend UI components for voice mode in Super Hank Chat.

IMPORTANT: Only modify/create files in components/chat/. Do NOT touch lib/, hooks/, or app/api/ — another agent is building those.

The hooks you will import (being built by the other agent, just import them — they will exist):
- `@/hooks/use-speech-recognition` exports `useSpeechRecognition()` returning `{ transcript, listening, supported, start, stop, reset }`
- `@/hooks/use-voice-mode` exports `useVoiceMode()` returning `{ enabled, toggle, speaking, speak, stopSpeaking }`

Your tasks:

1. MODIFY `components/chat/stt-slot.tsx` — Replace the placeholder with a real mic button:
   - Props: `voiceEnabled?: boolean`, `onTranscript?: (text: string) => void`
   - Use `useSpeechRecognition` hook
   - Show a mic button (Mic icon from lucide-react) only when voiceEnabled is true
   - Pulsing red ring animation when listening
   - When final transcript is ready, call onTranscript

2. MODIFY `components/chat/tts-slot.tsx` — Replace placeholder with voice toggle:
   - Props: `enabled?: boolean`, `onToggle?: () => void`
   - Toggle button with Volume2 (on) / VolumeX (off) icons from lucide-react
   - Visual state indicator

3. MODIFY `components/chat/composer.tsx` — Add voice input:
   - Add props: `voiceEnabled?: boolean`
   - Add `onVoiceTranscript` handling — when transcript received, set it as input value
   - Pass voiceEnabled to SttSlot
   - Wire onTranscript to set the textarea value

4. MODIFY `components/chat/message-bubble.tsx` — Add speak button:
   - Add prop: `onSpeak?: (text: string) => void`
   - For assistant messages, show a small Volume2 icon button
   - Only visible when onSpeak is provided
   - On click, calls onSpeak(message.content)

5. MODIFY `components/chat/chat-header.tsx` — Wire voice toggle:
   - Add props: `voiceEnabled?: boolean`, `onToggleVoice?: () => void`
   - Pass to TtsSlot

6. MODIFY `components/chat/chat-shell.tsx` — Thread all voice props through:
   - Add to Props: `voiceEnabled?: boolean`, `onToggleVoice?: () => void`, `onSpeak?: (text: string) => void`
   - Pass voiceEnabled and onToggleVoice to ChatHeader
   - Pass voiceEnabled to Composer
   - Pass onSpeak to MessageList

7. MODIFY `components/chat/message-list.tsx` — Pass onSpeak to bubbles:
   - Add prop: `onSpeak?: (text: string) => void`
   - Pass to each MessageBubble

8. CREATE `components/chat/voice-indicator.tsx` — Visual feedback component:
   - Pulsing dot when listening, speaker wave animation when speaking
   - Use Tailwind animations (animate-pulse, custom keyframes if needed)

Use lucide-react for icons (Mic, MicOff, Volume2, VolumeX — all already available).
Use Tailwind for all styling. No new dependencies.
Keep the existing text chat working perfectly when voice is off.
