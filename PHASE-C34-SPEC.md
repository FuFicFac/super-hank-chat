# PHASE C3+C4 — Cross-session search + Command palette/export

**Builder:** Codex CLI. **Branch:** `phase-a-classroom` (stacking). **Foreman:** Claude.

## Non-negotiable constraints
1. NO `npm install`, NO `npm run build` (both break the exFAT dev setup). Verify with `npx tsc --noEmit` only.
2. No DB migrations / no `drizzle/**` changes. Use plain SQL via the existing drizzle db handle for search (parameterized LIKE — no FTS virtual table).
3. Don't break streaming, thinking dropdown, auto-scroll, agent profiles, voice, artifacts, either theme.
4. Do NOT git commit (foreman commits). End with changed files + deviations.

## Part A — Cross-session search (C3)
1. **Repo** — `lib/db/repositories/messages-repository.ts`: add
   `searchMessages(db, query: string, limit = 30): { sessionId, title, agentId, snippet, createdAt }[]`.
   - Parameterized `LIKE '%'||?||'%'` over `chat_messages.content`, joined to `chat_sessions` for title + metadata_json (parse agentId with the same helper the sessions repo uses — reuse, don't duplicate the parser; export it if needed).
   - One row per session (best/most-recent match). `snippet` = ~120 chars of content around the match, whitespace-collapsed, assistant content run through the existing answer extraction is NOT required — a raw substring is fine. Skip empty/whitespace queries (return []).
2. **Service + API** — `lib/services/search-service.ts` `searchService(query)`; new route `app/api/search/route.ts` `GET ?q=` → `{ results }`. `runtime = "nodejs"`, `await initDbSingleton()` first.
3. **UI** — search input at the top of `components/chat/session-sidebar.tsx` (above the list, below the New-chat button). Debounce ~200ms; while a non-empty query is active, replace the session list with results (agent dot + title + snippet + code); clicking a result navigates (`router.push('/sessions/'+id)`) and clears the query; empty query restores the normal list. A small "✕ clear" affordance. Themed for Classroom + Dispatch (reuse existing sidebar item classes where possible). Show "No matches" when a query returns nothing.

## Part B — Command palette + markdown export (C4)
Current state: `components/chat/chat-shell.tsx` has `PALETTE_COMMANDS` (new/mic/reconnect/artifact/export) but `handlePaletteAction` only implements `new` and `reconnect`, and the palette input is decorative (no filtering).
1. **Filter the palette input:** typing filters the command list by label, AND matches sessions by code (HNK-XXXX) or title — matching sessions appear as selectable rows below commands; Enter on a session row navigates to it. (Session list is available via `props.sessions`; compute the code with the existing `sessionCode()` in the same file.)
2. **Wire the remaining actions** in `handlePaletteAction`:
   - `mic` → call a new `onToggleVoice` prop (thread from chat-page-client's `voice.toggle`).
   - `artifact` → if an artifact is currently open, focus/keep it; if none, do nothing (don't crash). Acceptable to no-op when none.
   - `export` → call a new `onExportMarkdown` prop.
3. **Markdown export** — in `app/sessions/[sessionId]/chat-page-client.tsx` add `onExportMarkdown()` that builds a Markdown transcript from `messages` (`## {AgentName or "Ekello"} · {time}` then the content; skip streaming/empty) and triggers a browser download (`Blob` + `a.download = '<session-title-or-code>.md'`). Resolve the agent name via `getAgentProfile`. Thread `onExportMarkdown` + `onToggleVoice` through `ChatShell` props.
4. Keep ⌘K open/close behavior; add Enter-to-run-first-result and arrow handling only if trivial (not required).

## Verification (builder)
1. `npx tsc --noEmit` clean.
2. Search: hitting `/api/search?q=France` returns JSON results (there is existing message history mentioning "France"/"Paris").
3. Export produces a `.md` string with role/agent headers.
4. List changed/new files + deviations.

## Out of scope (later)
- FTS5 virtual table (LIKE is fine for v1; note it).
- Slash-command completions in the composer.
- Tool-activity feed (separate slice).
