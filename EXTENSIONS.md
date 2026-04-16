# Extension seams (TTS / STT / metadata)

## Persistence note

The app stores a normal SQLite file at `data/hank-chat.db` using **Drizzle ORM** with the **`sql.js`** driver (WASM) so Hank Chat runs on Node versions where native `better-sqlite3` binaries may be unavailable. The on-disk format remains SQLite; you can open the same file with other SQLite tools.

Hank Chat v1 ships **contracts only** for audio. Implementation lives behind these seams:

- `lib/audio/contracts.ts` — `TextToSpeechProvider`, `SpeechToTextProvider`, `AudioOutputController`, `VoiceInputController`
- `lib/audio/tts-placeholder.ts` / `lib/audio/stt-placeholder.ts` — throw if invoked; safe to swap for real providers
- `components/chat/tts-slot.tsx` / `components/chat/stt-slot.tsx` — UI hooks next to header and composer; currently render nothing

## Per-session metadata

`chat_sessions.metadata_json` stores optional JSON for future preferences (for example `AudioSessionPreferences` in `types/audio.ts`). Nothing writes this field in v1 beyond future work.

## Where providers plug in

1. Instantiate a provider implementing the interfaces in `contracts.ts`.
2. Pass it into `TtsSlot` / `SttSlot` from `chat-header.tsx` / `composer.tsx` once you have session-scoped instances.
3. Keep all audio I/O on the client or behind dedicated API routes; do not mix into `lib/hermes/`.

Hermes integration remains isolated in `lib/hermes/` and must stay on the Node.js runtime.
