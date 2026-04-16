# Super Hank Chat — Agent Reference

**Read this before touching any file.**

---

## What This Project Is

Super Hank Chat is a browser-based chat interface for the Hermes AI agent. It wraps
`hermes` (a CLI AI agent) in a Next.js 15 app with:

- Real-time SSE streaming of Hermes responses
- SQLite persistence via Drizzle ORM
- A sandboxed artifact panel for rendering live HTML/SVG/Canvas output from Hank
- Rich markdown rendering with syntax-highlighted code blocks

**Tech stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Drizzle ORM · better-sqlite3 · SSE

---

## Key Directories

```
app/                    Next.js App Router pages and API routes
  api/sessions/         REST + SSE endpoints for session management
  sessions/[sessionId]/ Chat page
components/
  chat/                 All chat UI components
  artifact/             Artifact panel components (NEW in 2.0)
  layout/               App shell, theme toggle
lib/
  db/                   Database client + Drizzle schema + repositories
  hermes/               Hermes process adapter, event streaming, output parsing
  artifacts/            Artifact protocol schema + parser (NEW in 2.0)
  services/             Business logic layer
hooks/                  React hooks (SSE stream, session list, auto-scroll)
types/                  Shared TypeScript types
scripts/                DB init, smoke tests
drizzle/                SQL migrations
```

---

## Critical Rules

1. **Never edit `.env.local`** — it contains secrets. Use `.env.local.example` as reference.
2. **Never delete `drizzle/0000_init.sql`** — it's the DB migration.
3. **`lib/db/client.ts` is the DB singleton** — all DB access goes through `getDb()`.
4. **API routes must call `await initDbSingleton()` at the top** — DB is not initialized until this runs.
5. **SSE stream endpoint is `app/api/sessions/[sessionId]/stream/route.ts`** — SSE events flow through `lib/services/streaming-service.ts`.
6. **The artifact sandbox iframe must use `sandbox="allow-scripts"` without `allow-same-origin`** — security requirement, never relax this.

---

## CHECKPOINT Protocol

If you are stuck, hit an ambiguous design decision, or need a decision from the orchestrator:

1. Write your question to `CHECKPOINT.md` at the project root
2. Stop working
3. Do not guess past the ambiguity
4. The orchestrator (Claude Code) will read and respond

---

## Hermes Binary

- Binary: `hermes` (in PATH)
- One-shot query: `hermes chat -Q -q "your message"`
- The app spawns Hermes as a subprocess — it is NOT called via API

---

## Dev Server

```bash
cd "/Volumes/Expansion/AI Tools/super-hank-chat"
npm run dev
# runs on http://localhost:3099
```

Health check: `GET /api/health` → `{"ok":true,"database":"ok","hermesBinary":"ok"}`
