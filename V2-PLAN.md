# Super Hank Chat — V2 Build Plan

**Orchestrator:** Claude Code (Sonnet 4.6)  
**Builders:** Cursor Composer 2, Claude Haiku, Hermes  
**Status:** Phase 1 in progress

---

## What We're Building

Super Hank Chat is Hank Chat with three major upgrades:

1. **Database** — `sql.js` (WASM, in-memory) → `better-sqlite3` (native, file-backed)
2. **Streaming** — one-shot per-message spawning → long-running Hermes process with real-time SSE token streaming
3. **Artifact Panel** — sandboxed iframe sidebar where Hank can spawn live HTML games, SVG graphics, interactive tools, and code previews

---

## Architecture

```
Browser
  ↓ SSE  /api/sessions/:id/stream
  ↓ REST /api/sessions/:id/messages

Next.js App Router (Node.js runtime)
  ↓
HermesAdapter (long-running process per session)
  ↓ stdin/stdout
hermes chat -Q (subprocess)
  ↓
Hermes AI Agent (GLM 5.1 or configured model)

SQLite (better-sqlite3, file-backed)
  → /data/super-hank-chat.db
```

### Artifact Protocol

Hank wraps generated artifacts in XML fencing:
```
<artifact type="html" title="Snake Game" id="snake-v1">
  <!DOCTYPE html>
  <html>...self-contained...</html>
</artifact>
```

- Types: `html`, `svg`, `code`, `markdown`
- One artifact per message max
- Parsed by `lib/artifacts/parser.ts`
- Rendered in `components/artifact/artifact-panel.tsx` via sandboxed iframe
- iframe uses `sandbox="allow-scripts"` — NEVER add `allow-same-origin`

---

## Phase Status

### ✅ Phase 0 — Setup
- [x] Repo created: `FuFicFac/super-hank-chat`
- [x] Foundation seeded from hank-chat v1
- [x] `AGENTS.md` written
- [x] `CHECKPOINT.md` written
- [x] Artifact protocol files written:
  - `lib/artifacts/schema.ts`
  - `lib/artifacts/parser.ts`
  - `lib/artifacts/renderer.ts`
- [x] Artifact components scaffolded:
  - `components/artifact/artifact-iframe.tsx`
  - `components/artifact/artifact-panel.tsx`
- [x] Types updated: `types/chat.ts`, `types/api.ts`
- [x] Tests written: `tests/artifact-parser.test.ts`

### 🔄 Phase 1 — Database + Styling (PARALLEL)
- [ ] **Composer 2:** better-sqlite3 migration
  - `lib/db/client.ts` — rewrite, remove sql.js + persistDb
  - `lib/db/repositories/` — remove all persistDb() calls
  - `drizzle.config.ts` — update driver
  - `scripts/init-db.ts` — rewrite for better-sqlite3
- [ ] **Haiku:** Markdown + message styling
  - `tailwind.config.ts` — add typography plugin
  - `app/globals.css` — highlight.js theming
  - `components/chat/message-markdown.tsx` — prose wrapper + copy button
  - `components/chat/message-bubble.tsx` — distinct user/assistant bubbles
  - `components/chat/message-list.tsx` — spacing

### ⏳ Phase 2 — Streaming (Composer 2, after Phase 1)
Resurrect `HermesAdapter`. Switch from per-message one-shot spawning to long-running process per session. Stream stdout deltas as SSE events. Response boundary: `session_id:` line in Hermes output.

Key files:
- `lib/hermes/hermes-registry.ts` — full rewrite
- `lib/hermes/hermes-adapter.ts` — promote from dead code
- `lib/hermes/hermes-parser.ts` — promote from dead code

### ⏳ Phase 3 — Artifact Protocol (Orchestrator, done in Phase 0)
Schema, parser, renderer all written. Tests written.

### ⏳ Phase 4 — Artifact Panel UI (PARALLEL: Composer 2 + Haiku, after Phase 2)

**Composer 2:** Wire artifact panel into chat layout
- `app/sessions/[sessionId]/chat-page-client.tsx` — add `currentArtifact` state, parse messages, pass to layout
- `components/chat/chat-shell.tsx` — split pane layout (55% chat / 45% artifact when panel open)
- `components/chat/message-bubble.tsx` — "View artifact →" pill on assistant messages with artifacts

**Haiku:** Message service artifact parsing
- `lib/services/message-service.ts` — call `parseMessageForArtifact()` when returning messages
- `components/chat/message-markdown.tsx` — strip artifact tags from prose before rendering

### ⏳ Phase 5 — Integration Inspection (Orchestrator)
Full review checklist. See ORCHESTRATOR-CHECKLIST.md.

### ⏳ Phase 6 — Polish + Ship
- Mobile layout pass
- Keyboard shortcuts (Cmd+Enter, Escape)
- Final commit + PR
- Hermes Telegram notification

---

## Dev Commands

```bash
cd "/Volumes/Expansion/AI Tools/super-hank-chat"
npm run dev          # http://localhost:3099
npm run build        # production build (use --no-lint if needed)
curl http://localhost:3099/api/health
npx tsx tests/artifact-parser.test.ts   # run parser tests
```

---

## Key Constraints

- iframe sandbox: `allow-scripts` only, NEVER `allow-same-origin`
- Hermes binary: in PATH as `hermes`
- DB path: `./data/super-hank-chat.db`
- No `.env.local` edits — use `.env.local.example` as reference
- Port: 3099
