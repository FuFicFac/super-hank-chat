# Super Hank Chat — Upgrade Roadmap

**Author:** Claude (foreman), with EJ. **Updated:** 2026-07-05.
**Branch state:** Phase A complete on `phase-a-classroom` (Classroom/Dispatch dual theme, Hank avatar, mobile layout, thinking dropdown, smart auto-scroll). Awaiting EJ's merge approval.

Execution model: Claude orchestrates via swarm-dispatch (Codex CLI as builder, Claude inspectors in a Lean loop). Specs are written per-phase before dispatch, in the style of PHASE-A-SPEC.md.

---

## Phase A — "Classroom" redesign ✅ DONE (pending merge)

Shipped: dual-theme system (Classroom default / Dispatch toggle), warm playful design tokens, Nunito + serif typography, Keenan-Wright avatar slot (`public/avatar/hank.png` — suited Higgsfield version pending), Classroom motion + reduced-motion, mobile drawer/overlay/composer, collapsible "Hank's thinking" dropdown with global Thinking On/Off toggle, stick-to-bottom auto-scroll that releases when the reader scrolls up.

Small known polish items: Escape doesn't close the mobile drawer; session title hidden in Classroom header; occasional upstream Hermes truncation leaves a reasoning-only message (investigate in Phase D).

## Phase B — Voice Mode

Finish VOICE_PLAN.md (framework/slots already in the codebase):
1. STT via browser `webkitSpeechRecognition` — mic button in composer, live interim transcript.
2. TTS via Google Cloud/Gemini TTS (`GOOGLE_API_KEY` available at `~/.hermes/.env`; `/api/tts` route already scaffolded) — auto-read replies when voice mode is on, per-message Speak button (already wired UI-side).
3. Voice indicator states on the Hank avatar (`speaking` state already exists in `hank-avatar.tsx`).
4. Settings: voice on/off persists per session (`chat_sessions.metadata_json` → `AudioSessionPreferences`).

## Phase C — Hank's Brain (harness surfacing)

Goal: surface what the Hermes harness can already do, instead of treating it as a text pipe.

1. **Agent Profiles / multi-persona (NEW — EJ priority).**
   Pick an agent when starting a new chat window; each session is bound to a named agent profile with its own identity.
   - **App-side registry** (`data/agent-profiles.json` or a new `agent_profiles` DB table): each profile = `{ id, name, tagline, avatar image, system prompt / personality text, model?, toolsets?, voice? }`.
   - **Where profiles come from:** Hermes' local `personalities:` config is currently empty, and EJ's real agents (Butch, Alice, Janice, Doctor Little) live in OpenClaw on the Mac mini — so the app owns its profile registry. Optionally import/mirror OpenClaw agent identities as seed profiles (decision for EJ at build time: mirror the org vs. fresh cast).
   - **Session binding:** "＋ New chat" opens an agent picker (grid of avatar cards). Chosen profile ID is stored in `chat_sessions.metadata_json`; header + message bubbles show that agent's name and avatar instead of hardcoded "Hank".
   - **Hermes injection:** there is no spawn-time persona flag; personas are set in-session via system-prompt swap. On connect, the app injects the profile's persona (either prepend to the first query as a system-style preamble, or drive `/personality` if the profile is registered in Hermes config — prefer writing profiles into `personalities:` in `~/.hermes/config.yaml` via an explicit sync action EJ approves, since that file is shared with terminal Hank Jr.).
   - **Avatar pipeline tie-in:** each profile has its own portrait; Higgsfield-generated art (young Keenan in a suit for Hank, plus new faces for other agents) drops into `public/avatar/<profile>.png`.
   - Multiple agents "inside the same chat" (true multi-party) is explicitly out of scope for v1 — one agent per session window; talk to several by opening several windows.
2. **Live tool-activity feed** — parse Hermes `┊` tool-trace lines into a "Hank is browsing / running code…" activity strip above the typing indicator (teaching-friendly; students watch the agent work).
3. **Cross-session search** — SQLite FTS5 over `chat_messages`, search box above the session list (mirrors Hermes Desktop's session search).
4. **Command palette, wired for real** — implement the already-declared ⌘N/⌘R/⌘A/⌘E handlers + markdown export; slash-command completions in the composer.
5. **Structured Hermes events (stretch)** — investigate driving the `hermes dashboard` API instead of scraping `-Q` stdout; would make the thinking split, tool feed, and truncation issues robust at the source.

## Phase D — Hardening

1. Investigate/fix upstream response truncation (reasoning-only persisted messages — seen once in Phase A testing).
2. Tests: API routes, streaming finalization, message-service segmentation (unit tests exist for parser/segmentation; add integration).
3. DB indexes (`chat_messages(session_id, sequence)`, FTS table from Phase C).
4. Process-registry cleanup (stale `globalThis` map entries on crash), rate limiting on message send.
5. exFAT quality-of-life: document/automate the `.next` clobber + better-sqlite3 ABI dance (script in `scripts/`).
6. Escape-closes-drawer, Classroom header session title, remaining a11y polish.

---

## Deferred / ideas parking lot

- Shareable artifact links (student work gets a copyable URL via the existing preview route).
- Image generation surfaced in the composer (API route already exists).
- Artifact versioning/history.
- True multi-agent group chat in one window (revisit after Agent Profiles v1).
- Global Hermes config fix for the `Unknown toolsets: messaging` warning (one-line change in `~/.hermes/config.yaml`; app already strips it, so cosmetic elsewhere only).
