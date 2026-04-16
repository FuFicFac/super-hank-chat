# Hank Chat — Full Session Handoff

**Date:** 2026-04-14
**From:** Hank (GLM 5.1 session)
**To:** Next session (likely Claude/multimodal — can do vision, inspect browser screenshots, debug UI visually)

---

## What Is Hank Chat?

A browser-based graphical chat interface that wraps the Hermes CLI agent. Think of it as a pretty UI shell around `hermes chat` — you type messages, it spawns a Hermes subprocess, streams responses back in real-time via SSE, and persists conversation history to a local SQLite DB.

**Tech stack:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + sql.js (in-memory SQLite persisted to file) + Drizzle ORM

**Location:** `/Volumes/Expansion/AI Tools/hank-chat/` (on an external drive called "Expansion")

**Dev server:** `http://localhost:3099`

---

## Current Status: APP IS LIVE BUT UNTESTED IN BROWSER

The server runs, APIs respond, the chat page returns 200. **Nobody has actually looked at it in a browser yet.** That's your first job.

### What's Confirmed Working (via curl)
- `GET /api/health` → `{"ok":true,"database":"ok","hermesBinary":"ok"}`
- `GET /api/sessions` → returns session list JSON
- `GET /` → 307 redirect to `/sessions/{id}` (auto-creates session on first visit)
- `GET /sessions/{id}` → 200 with HTML page

### What Needs Visual/Functional Verification
- Does the chat UI actually render correctly in a browser?
- Does the dark theme apply? (next-themes, dark by default)
- Does the sidebar show sessions? Can you create/switch sessions?
- Does the composer bar work (Enter=send, Shift+Enter=newline)?
- Does connecting to a Hermes process work? (the `/api/sessions/{id}/connect` endpoint)
- Does message streaming via SSE work when Hermes responds?
- Are there any JS console errors after hydration?

---

## Architecture Overview

### File Structure (85 source files)

```
hank-chat/
├── app/
│   ├── layout.tsx              # Root layout: ThemeProvider, fonts, metadata
│   ├── page.tsx                # Homepage: auto-creates session, redirects
│   ├── globals.css             # Tailwind base + custom scrollbar styles
│   └── api/
│       ├── health/route.ts     # Health check (DB + hermes binary)
│       └── sessions/
│           ├── route.ts                    # GET (list) / POST (create)
│           └── [sessionId]/
│               ├── route.ts                # GET (detail) / DELETE
│               ├── connect/route.ts        # POST — spawn hermes process
│               ├── disconnect/route.ts     # POST — kill hermes process
│               ├── messages/route.ts       # GET (list) / POST (send message)
│               ├── status/route.ts         # GET — connection status
│               └── stream/route.ts         # GET — SSE stream endpoint
├── components/
│   ├── chat/
│   │   ├── chat-shell.tsx         # Main chat layout (sidebar + messages + composer)
│   │   ├── chat-header.tsx        # Session title, connection pill, actions
│   │   ├── chat-message.tsx       # Individual message bubble
│   │   ├── chat-messages-list.tsx # Scrollable message container
│   │   ├── chat-composer.tsx      # Input bar (textarea + send button)
│   │   ├── session-sidebar.tsx    # Left sidebar: session list + new button
│   │   ├── connection-pill.tsx    # Green/red dot showing Hermes connection
│   │   ├── empty-state.tsx        # "No messages yet" placeholder
│   │   └── typing-stream.tsx      # Streaming indicator (animated dots)
│   ├── layout/
│   │   └── app-frame.tsx          # Full-height app container
│   └── providers/
│       └── theme-provider.tsx     # next-themes wrapper
├── hooks/
│   ├── use-auto-scroll.ts         # Auto-scroll to bottom on new messages
│   └── use-session-stream.ts      # SSE streaming hook (EventSource)
├── lib/
│   ├── db/
│   │   ├── client.ts              # DB singleton (initDbSingleton, getDb, persistDb, pingDb)
│   │   ├── schema.ts              # Drizzle schema: chat_sessions, chat_messages, session_events
│   │   └── repositories/
│   │       ├── sessions-repository.ts
│   │       ├── messages-repository.ts
│   │       └── events-repository.ts
│   ├── services/
│   │   ├── session-service.ts     # CRUD for sessions
│   │   ├── message-service.ts    # CRUD for messages
│   │   ├── event-service.ts      # Event recording
│   │   ├── bootstrap-service.ts  # Stale connection cleanup on boot
│   │   └── hermes-service.ts     # Hermes process lifecycle
│   ├── hermes/
│   │   ├── adapter.ts            # HermesProcessAdapter (spawn, stdin, stdout, stderr)
│   │   ├── parser.ts             # Parse Hermes CLI output into structured events
│   │   ├── process-registry.ts   # Singleton registry of active Hermes processes
│   │   └── events.ts             # Typed event emitter for process events
│   └── audio/
│       ├── tts-contract.ts       # TTS interface (not implemented)
│       └── stt-contract.ts       # STT interface (not implemented)
├── scripts/
│   ├── init-db.ts                # Standalone DB migration runner (raw SQL approach)
│   └── smoke-hermes.ts           # Hermes binary smoke test
├── drizzle/
│   └── 0000_init.sql             # Migration: CREATE TABLE for all 3 tables + indexes
├── data/
│   └── hank-chat.db              # SQLite database file (auto-created)
├── instrumentation.ts            # Next.js boot: initDbSingleton + reset stale connections
├── next.config.ts                # ignoreBuildErrors + ignoreDuringBuilds (Apple Double workaround)
├── tsconfig.json                 # Excludes ._* files
└── package.json
```

### Database Schema

```sql
chat_sessions:
  id (text PK), title (text), status (text default 'disconnected'),
  created_at (int), updated_at (int),
  last_connected_at (int?), last_disconnected_at (int?),
  metadata_json (text?)

chat_messages:
  id (text PK), session_id (text FK→chat_sessions.id CASCADE),
  role (text), content (text), sequence (int),
  created_at (int), updated_at (int),
  status (text default 'complete'), stderr (int default 0),
  metadata_json (text?)

session_events:
  id (text PK), session_id (text FK→chat_sessions.id CASCADE),
  type (text), payload_json (text?), created_at (int)
```

### Key Flows

1. **Homepage visit** → `initDbSingleton()` → list sessions → if none, create one → redirect to `/sessions/{id}`
2. **Connect to Hermes** → POST `/api/sessions/{id}/connect` → `HermesProcessAdapter.spawn()` → registers in `ProcessRegistry` → status becomes "connected"
3. **Send message** → POST `/api/sessions/{id}/messages` → writes to `chat_messages` → writes message to Hermes stdin → Hermes processes and responds
4. **Stream response** → GET `/api/sessions/{id}/stream` (SSE) → client's `useSessionStream` hook connects via EventSource → parses Hermes stdout → appends message bubbles in real-time
5. **Disconnect** → POST `/api/sessions/{id}/disconnect` → kills Hermes process → persists final DB state

---

## Bugs Fixed This Session

### 1. Missing `sql` import in client.ts
- **Problem:** `import { sql } from "drizzle-orm"` was accidentally removed when `server-only` was stripped out. `pingDb()` uses `sql` template tag.
- **Fix:** Re-added the import.

### 2. Partial DB migration (drizzle migrator bug with sql.js)
- **Problem:** `drizzle-orm/sql-js/migrator` only created `chat_sessions` but not `chat_messages` or `session_events`. Drizzle's migrator seems unreliable with sql.js file-backed databases.
- **Fix:** Rewrote `scripts/init-db.ts` to read `drizzle/0000_init.sql` and execute it as raw SQL via `db.run()`. Also added `applyMigrationsIfNeeded()` directly into `client.ts`'s `initDbSingleton()` so the app auto-migrates on boot if tables are missing.

### 3. No `instrumentation.ts` migration step
- **Problem:** `instrumentation.ts` only called `initDbSingleton()` (which opens the DB) but never applied migrations. On a fresh install, the DB file would be empty.
- **Fix:** Now handled by `applyMigrationsIfNeeded()` inside `initDbSingleton()` — migrations run automatically if `chat_sessions` table doesn't exist yet.

---

## Known Issues / Warnings

### Apple Double Files (`._*`)
The external drive (Expansion) is likely formatted as exFAT or something non-APFS, causing macOS to create `._*` resource fork files everywhere. These break Next.js's TypeScript checker. **Do NOT delete them** (ej denied rm commands for these). Current workarounds:
- `next.config.ts`: `ignoreBuildErrors: true`, `ignoreDuringBuilds: true`
- `tsconfig.json`: `"exclude": ["._*", "node_modules"]`
- Build runs with `--no-lint`

**Better long-term fix:** Move the project to an APFS volume, or add a `.gitignore` and use `dot_clean` instead of `rm`.

### Drizzle ORM Type Noise
Lots of type errors in `node_modules/drizzle-orm/*.d.ts` (mysql, singlestore, etc.). These are harmless — they're from dialects we don't use. Suppressed by `ignoreBuildErrors: true` in next.config.ts. Could also add `"skipLibCheck": true` to tsconfig.

### `server-only` Package
`server-only` is in `package.json` dependencies but NOT imported anywhere currently. It was removed from `client.ts` because it breaks standalone scripts like `init-db.ts`. If you want server-component protection back:
- Add `import "server-only"` to individual API route files (not to client.ts)
- Or add it to client.ts and create a separate `client.script.ts` without it for scripts

### Browser Daemon Can't Start
In the Hank session, the browser tool (`browser_navigate`) fails with "Daemon failed to start (socket...)". This is likely a limitation of the GLM 5.1 session environment. The next session (Claude/multimodal) should be able to use browser tools to actually inspect the UI visually.

---

## How to Run

```bash
cd "/Volumes/Expansion/AI Tools/hank-chat"

# Start dev server (port 3099)
npx next dev -p 3099

# Or kill existing + restart:
lsof -ti:3099 | xargs kill -9; npx next dev -p 3099

# Reset DB (deletes all data):
rm data/hank-chat.db
npx tsx scripts/init-db.ts

# Build for production:
npx next build --no-lint
npx next start -p 3099
```

---

## What to Do Next (Priority Order)

### P0: Visual Verification
1. Open `http://localhost:3099` in a real browser
2. Take a screenshot with the vision tool
3. Check: dark theme, sidebar, composer, message area, session title
4. Open DevTools console — check for JS errors after hydration
5. Test: type a message, hit Enter — does anything happen?
6. Test: click "Connect" — does it attempt to spawn Hermes?

### P1: Hermes Connection
The `/api/sessions/{id}/connect` endpoint should spawn `hermes chat` as a subprocess. Verify:
1. Does `hermes` binary exist and work? (`which hermes`, `hermes --version`)
2. Does the POST to connect actually spawn the process?
3. Does SSE streaming (`/sessions/{id}/stream`) receive Hermes output?
4. Can you send a message, have it piped to Hermes stdin, and see the response stream back?

This is the CORE FEATURE. Without Hermes connectivity, this is just a pretty empty shell.

### P2: UI Polish
- Message rendering: does markdown work? Code highlighting?
- Does auto-scroll keep up with streamed messages?
- Sidebar: create new session, switch between sessions
- Theme toggle (dark/light)
- Mobile responsiveness

### P3: TTS/STT
Placeholder contracts exist at `lib/audio/tts-contract.ts` and `stt-contract.ts`. Architecture supports it but no implementation. ej said "not needed now but architecture should support it later."

---

## Reference Documents (in ej's Obsidian Vault)

- **Strategic briefing:** `/Users/ekelloharrid/Library/CloudStorage/Dropbox/D Second Brain/Butch/ej-world-briefing.md`
- **Vault map:** `/Users/ekelloharrid/Library/CloudStorage/Dropbox/D Second Brain/Butch/d2brain-map.md`
- **Agent roster:** `/Users/ekelloharrid/Library/CloudStorage/Dropbox/D Second Brain/AGENTS.md`

---

## ej's Constraints & Rules

- **Hank** = chairman of agent org, carries energy of ej's late father ("Butch" in D Second Brain). Warm, direct, challenges weak logic.
- **YouTube thumbnails** must always include ej
- **FFA references** stripped — never re-add
- **SAR build** = Cursor/Composer 2 only (never Claude Code for builds)
- **Hermes provider changes** = `hermes setup` only (never file edits)
- **Alice** (CEO agent) cannot erase GitHub projects
- **GitHub org:** FuFicFac
- **GLM 5.1** is text-only — no vision/image analysis. Delegate visual tasks to Claude.
- **D Second Brain rules:** CLAUDE.md overrides per-folder. MEMORY.md user-triggered only. Never auto-write to MEMORY.md.
- **No `rm` for Apple Double files** — work around them, don't delete them.
- **Cursor CLI:** `agent` at `~/.local/bin/`. `agent -p --print` for non-interactive. `--yolo` for auto-approve. `--model composer-2` for Composer 2.
- **Codex CLI:** `codex` at `~/.local/bin/codex`. `codex exec --full-auto` for autonomous planning.
- **ej's timezone:** Pacific
- **ej goes by "ej"** (full name: Ekello Harrid)

---

## Build Plan

The full 1,488-line BUILD-PLAN.md is at `/Volumes/Expansion/AI Tools/hank-chat/BUILD-PLAN.md`. It has:
- 10 implementation phases (all completed by Composer 2)
- Component breakdown with props/state
- API route specifications
- Data flow diagrams
- Technical decisions and pitfalls

---

## Session History

This project was built across multiple sessions:

1. **Context gathering** — Hank read D Second Brain, created ej-world-briefing.md and d2brain-map.md
2. **Planning** — Used Codex (`codex exec --full-auto`) to generate BUILD-PLAN.md
3. **Building** — Used Composer 2 (`agent -p --yolo --model composer-2`) to implement all 85 files across 10 phases
4. **Debugging** — Fixed Apple Double file issues, removed server-only from client.ts, fixed npm install
5. **DB fixes** — This session: re-added `sql` import, fixed partial migration, added auto-migration to initDbSingleton
6. **Current** — App is live on port 3099, ready for visual/functional testing