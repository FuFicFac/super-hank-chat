# PHASE C2 + D — Tool-activity feed + Hardening

**Builder:** Codex CLI. **Branch:** `phase-a-classroom` (stacking, AFTER C34 is merged). **Foreman:** Claude.

## Non-negotiable constraints
1. NO `npm install`, NO `npm run build`. Verify with `npx tsc --noEmit` and (for the init script) `npx tsx scripts/init-db.ts` only.
2. No `drizzle/**` migrations. DB indexes are added as `CREATE INDEX IF NOT EXISTS` in `scripts/init-db.ts` (runs on `predev`), NOT via a drizzle migration.
3. Don't break streaming, thinking split, auto-scroll, agent profiles, voice, search, artifacts, either theme.
4. Do NOT git commit (foreman commits). End with changed files + deviations.

## Part A — Tool-activity feed (C2)
Goal: while an agent is using tools, show a subtle live "working" strip so students can watch it act. Hermes emits tool traces as lines beginning with `┊` in stdout.
1. In `lib/hermes/query-output.ts` add `extractToolActivity(text): string[]` — returns the trimmed text of each `┊`-prefixed line (marker stripped), in order, deduped consecutively. Keep it pure + unit-testable.
2. Add a couple of unit tests to `tests/hermes-query-output.test.ts` for `extractToolActivity` (a buffer with two `┊` lines → two activities; no `┊` → []).
3. In `app/sessions/[sessionId]/chat-page-client.tsx`, during `message.delta`, compute tool activity from the raw buffer and keep the LATEST activity line in a piece of state (`toolActivity: string | null`); clear it on `message.completed` and `message.started`. The bubble content should already exclude `┊` lines — extend `denoiseAssistantStream` (query-output.ts) to also drop `┊` lines from the streamed bubble text (they belong in the activity strip, not the prose). Confirm `splitAssistantSegments` still routes them to thinking on the final message (unchanged).
4. Render the activity under the typing indicator: extend `components/chat/typing-stream.tsx` (or add a sibling in `chat-shell.tsx`) to show `⚙ {agentName} is working — {toolActivity}` when present. Subtle, themed both. Thread `toolActivity` + agent name from chat-page-client → ChatShell.

## Part B — Hardening (D, high-value subset)
1. **Escape closes the mobile drawer** — in `components/chat/chat-shell.tsx`, the existing keydown effect handles ⌘K/Escape for the palette; also close the sidebar drawer on Escape (`setSidebarOpen(false)`).
2. **DB indexes** — in `scripts/init-db.ts`, after table creation, run:
   `CREATE INDEX IF NOT EXISTS idx_messages_session_seq ON chat_messages(session_id, sequence);`
   `CREATE INDEX IF NOT EXISTS idx_messages_session_created ON chat_messages(session_id, created_at);`
   `CREATE INDEX IF NOT EXISTS idx_events_session ON session_events(session_id);`
   (Match the ACTUAL column names in `lib/db/schema.ts` — verify before writing. Use IF NOT EXISTS so it's idempotent.)
3. **exFAT helper script** — `scripts/fix-native.sh` (documented, executable): re-clears `.next` and reinstalls the correct `better-sqlite3` prebuilt for the running Node ABI (the dance from CHECKPOINT.md). Include a short comment block. Also add an npm script `"fix:native": "bash scripts/fix-native.sh"` to package.json scripts (scripts block only — do NOT touch dependencies).
4. **Process-registry cleanup** — in `lib/hermes/hermes-registry.ts`, when an adapter emits `exit` or `error`, ensure `sessionStderrTail`, `sessionLastActivity` entries for that session are cleared if no adapter remains (avoid unbounded growth). Keep changes minimal and preserve existing finalize behavior.

## Verification (builder)
1. `npx tsc --noEmit` clean.
2. `npx tsx scripts/init-db.ts` runs without error (indexes created idempotently).
3. `npx tsx --test tests/hermes-query-output.test.ts` passes (existing + new tool-activity tests).
4. List changed/new files + deviations.

## Out of scope
- Rate limiting, full API integration test suite, the reasoning-only truncation root-cause fix (needs a separate streaming-finalize investigation — leave a note, don't attempt here).
