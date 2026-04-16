# Phase 2 — Composer 2 Prompt: True Streaming

Read AGENTS.md and V2-PLAN.md before doing anything.

PROJECT: /Volumes/Expansion/AI Tools/super-hank-chat

---

## YOUR TASK

Rewrite the Hermes process architecture from per-message one-shot spawning to a long-running process per session with real-time SSE streaming.

**Current (bad):** For every message, spawn `hermes chat -Q -q "text"`, buffer all stdout until process exits, send one big `message.completed` event. User sees nothing until Hermes is done thinking.

**Target (good):** One `hermes chat -Q` process lives for the entire session. Each message is written to stdin. Stdout chunks stream as `message.delta` SSE events in real-time. Response ends when `session_id: xxx` line appears in stdout.

---

## FILES TO CHANGE

### 1. lib/hermes/hermes-registry.ts — FULL REWRITE

Replace the current `activeRuns` per-message architecture with `sessionProcesses` per-session.

**New module-level state:**
```typescript
const sessionProcesses = new Map<string, HermesAdapter>();
```

**`connectSession(sessionId)`:**
- Look up session in DB (error if not found)
- If adapter already exists for this session, return `{ ok: true }` (idempotent)
- Create `new HermesAdapter()`
- Call `adapter.start({ args: ['chat', '-Q'] })`
- Wire adapter events:
  - `stdout`: call `handleStdoutDelta(sessionId, delta)`
  - `stderr`: sanitize with `sanitizeHermesDiagnosticDelta`, emit `stderr.delta` SSE, log to DB
  - `exit`: call `handleProcessExit(sessionId, code, signal)`
  - `error`: call `handleProcessError(sessionId, err)`
- Store in `sessionProcesses`
- Update DB: `status: 'connected'`, `lastConnectedAt`
- Append session event
- Emit `session.connected` SSE
- Return `{ ok: true }`

**`disconnectSession(sessionId)`:**
- Get adapter from map, delete from map
- If adapter: call `adapter.stop()`
- Update DB: `status: 'disconnected'`, `lastDisconnectedAt`
- If there's an active streaming message for this session (tracked in `activeMessageIds` map below), call `failAssistantMessage`
- Emit `session.disconnected` SSE

**`sendToHermes(sessionId, text)`:**
- Get adapter from map — if not found return `{ ok: false, error: 'Not connected' }`
- Check session status in DB — if not 'connected' return error
- Check `activeMessageIds` — if message in progress, return `{ ok: false, error: 'Still responding' }`
- Call `beginAssistantMessage(sessionId)` → get messageId
- Store in `activeMessageIds.set(sessionId, { messageId, buffer: '' })`
- Call `adapter.sendMessage(text)`
- Return `{ ok: true }`

**`handleStdoutDelta(sessionId, delta)`:**
- Get active from `activeMessageIds`
- If no active, ignore (preamble before first message)
- Append delta to `active.buffer`
- Check if delta contains `session_id:` line:
  - Use `HERMES_SESSION_ID_RE` from query-output.ts to detect
  - If found: extract sessionId, call `finalizeAssistantMessage(sessionId)`
  - If NOT found: emit `message.delta` SSE with the cleaned delta

**`finalizeAssistantMessage(sessionId)`:**
- Get active from `activeMessageIds`, delete it
- Extract final content from `active.buffer` using `extractHermesQueryResult`
- If content: call `completeAssistantMessage(sessionId, messageId, content)`
- Else: call `failAssistantMessage(sessionId, messageId)`

**`handleProcessExit(sessionId, code, signal)`:**
- Delete adapter from `sessionProcesses`
- If `activeMessageIds` has an entry: finalize it (process ended mid-response)
- Update DB status to 'disconnected'
- Emit `session.disconnected` SSE

**`handleProcessError(sessionId, err)`:**
- Same as exit but emit `session.error` SSE

**`getRuntimeStatus(sessionId)`:**
- Check `sessionProcesses` has adapter
- Check `activeMessageIds` has active message
- Return status object

---

### 2. lib/hermes/hermes-adapter.ts — KEEP AS-IS
Already correct. Promote from dead code. No changes needed.

### 3. lib/hermes/hermes-parser.ts — KEEP AS-IS
Already correct. Used by HermesAdapter internally.

### 4. lib/hermes/query-output.ts — KEEP (used for final extraction)
`extractHermesQueryResult` still used in `finalizeAssistantMessage`.
`buildHermesQueryArgs` is now UNUSED — delete it.

---

## IMPORTANT IMPLEMENTATION NOTES

1. **Response boundary:** The `session_id: xxx` line appears at the END of each Hermes response in quiet mode. It signals "response complete." Everything before it in the buffer is the actual content.

2. **Idle timeout:** Add a 90-second idle timeout per active message. If no stdout for 90 seconds after a message is sent, call `finalizeAssistantMessage` with whatever is in the buffer (may be partial). Use `setTimeout` stored on the active message entry, cleared/reset on each delta.

3. **Startup timing:** The adapter takes a moment to start. `connectSession` should not fail if the process starts slowly — it returns success as soon as the process spawns.

4. **The `activeMessageIds` map:** 
```typescript
type ActiveMessage = {
  messageId: string;
  buffer: string;
  idleTimer: ReturnType<typeof setTimeout> | null;
};
const activeMessageIds = new Map<string, ActiveMessage>();
```

5. **Do NOT emit message.delta for the session_id line itself** — strip it before emitting.

---

## SUCCESS CRITERIA

- Connect a session, send a message, watch `GET /api/sessions/:id/stream` — you should see multiple `message.delta` events fire before `message.completed`
- Disconnect while a message is in progress — no double-call errors
- Send two messages sequentially — second message works correctly
- npm run build --no-lint completes

---

## CHECKPOINT PROTOCOL
If stuck, write to CHECKPOINT.md and stop.
