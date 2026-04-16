# Hermes Web Wrapper Build Plan

## 1. Goal

Build a web application that replaces the raw terminal experience of `hermes chat` with a modern chat interface. The app should:

- Use **Next.js App Router** with **TypeScript**
- Use **Tailwind CSS** for styling
- Run the **Hermes CLI** as a managed subprocess on the server
- Stream Hermes responses into a chat UI
- Persist chat sessions locally across browser reloads and restarts
- Default to **dark mode** with a **light mode toggle**
- Be structured so **text-to-speech (TTS)** and **speech-to-text (STT)** can be added later without major rewrites

This document is the implementation blueprint for the full application.

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

The application should be split into four main layers:

1. **Presentation Layer**
   - Next.js App Router pages and client components
   - Chat UI, layout, theme toggle, connection status, session list
   - Markdown rendering and code highlighting for assistant output

2. **Application Layer**
   - Server-side orchestration for sessions, messages, streaming, and Hermes lifecycle
   - Route handlers under `app/api/...`
   - Session manager responsible for coordinating active subprocesses

3. **Integration Layer**
   - Hermes adapter around `child_process.spawn`
   - Output parsing and stream event emission
   - Future extension points for TTS and STT providers

4. **Persistence Layer**
   - Local SQLite database for sessions, messages, connection history, and metadata
   - Lightweight data access layer for reads/writes from route handlers and server services

### 2.2 Recommended System Design

Use a **server-managed process-per-chat-session** model:

- Each chat session in the UI maps to one persisted conversation record
- A conversation may have an associated live Hermes subprocess while connected
- When disconnected, the session remains stored in SQLite and can later reconnect
- Messages are always persisted, regardless of whether the process is currently running

This keeps the architecture simple and aligns with the user expectation that a “chat session” has its own history and state.

### 2.3 Recommended Streaming Strategy

Use **SSE (Server-Sent Events)** from browser to server for receiving Hermes output.

Why SSE instead of WebSockets for v1:

- Simpler to implement in Next.js route handlers
- Good fit for one-way streaming from server to browser
- Easier to debug than WebSockets
- Works well with token/event-style output

Use standard HTTP `POST` requests for client-to-server actions:

- Send user message
- Start Hermes session
- Stop Hermes session
- Create/list sessions

### 2.4 Runtime Requirements

All Hermes-related server routes must run on the **Node.js runtime**, not Edge.

Reason:

- `child_process.spawn` is Node-only
- SQLite drivers such as `better-sqlite3` are Node-only
- Process lifecycle management requires long-lived in-memory state on the server

Every route or module involved in Hermes execution should explicitly avoid Edge runtime assumptions.

### 2.5 Recommended Persistence Choice

Use **SQLite** as the default persistence layer.

Rationale:

- Local-first and simple to ship
- Safer and more queryable than ad hoc JSON files
- Supports multiple sessions and message indexing cleanly
- Easier to extend later for search, metadata, summaries, and usage analytics

Recommended stack:

- `better-sqlite3` for direct local access
- `drizzle-orm` plus `drizzle-kit` for schema definition and migrations

If build simplicity becomes more important than schema discipline, a thin repository layer can initially use raw `better-sqlite3` and add Drizzle later. The preferred blueprint is Drizzle from the start.

---

## 3. Core Technical Decisions

### 3.1 Process Model

Use a singleton **HermesProcessRegistry** on the server that stores active subprocesses in memory:

- Key: `sessionId`
- Value: live process state and event emitter references

Each entry should track:

- Child process handle
- Current connection state
- Buffered stdout/stderr state
- In-flight assistant message accumulator
- Subscribers for SSE connections
- Last activity timestamp

This registry should only represent **active runtime state**. Durable chat history belongs in SQLite.

### 3.2 Message Model

Use normalized persisted messages with immutable rows:

- `user` messages
- `assistant` messages
- `system` messages
- `status` events if needed for debugging and UI audit trail

Assistant output should be built incrementally during streaming:

- Create a draft assistant message when Hermes begins responding
- Append streamed chunks in memory
- Periodically persist updates or persist once the response completes

For v1, the cleanest option is:

- Persist the user message immediately
- Stream assistant content in memory
- Persist the final assistant message when Hermes response boundary is detected

If response boundary detection is unreliable, persist chunk updates to a draft record.

### 3.3 Output Transport

Model Hermes output as server-side typed events:

- `session.connected`
- `session.disconnected`
- `session.error`
- `message.started`
- `message.delta`
- `message.completed`
- `stderr.delta`
- `heartbeat`

The frontend should consume these as a single event stream and update optimistic UI state accordingly.

### 3.4 Response Boundary Detection

The largest unknown is how `hermes chat` formats output when piped rather than run interactively.

Plan for an adapter layer:

- First attempt: standard `spawn("hermes", ["chat"])` with piped stdin/stdout/stderr
- Normalize ANSI escape sequences out of stdout
- Detect message completion using CLI-specific markers if available
- If Hermes requires a TTY, add a fallback adapter using `node-pty`

Do not hardwire parsing logic directly into API routes. Keep it isolated in a dedicated parser/adapter module.

### 3.5 TTS/STT Future Readiness

Introduce interfaces now, with no implementation:

- `TextToSpeechProvider`
- `SpeechToTextProvider`
- `AudioOutputController`
- `VoiceInputController`

The UI should reserve optional control slots for:

- “Speak response” action
- “Voice input” action

These controls can be hidden or disabled in v1, but the surrounding component contracts should allow them to be added without reorganizing the chat tree.

### 3.6 Theme Strategy

Use class-based dark mode with `next-themes`.

Defaults:

- Initial theme: `dark`
- User can toggle to `light`
- Theme stored in browser local storage

This is simpler than inventing a custom theme manager and works cleanly with Tailwind.

---

## 4. Proposed File and Folder Structure

```text
.
├── app
│   ├── api
│   │   ├── health
│   │   │   └── route.ts
│   │   ├── sessions
│   │   │   ├── route.ts
│   │   │   └── [sessionId]
│   │   │       ├── route.ts
│   │   │       ├── connect
│   │   │       │   └── route.ts
│   │   │       ├── disconnect
│   │   │       │   └── route.ts
│   │   │       ├── messages
│   │   │       │   └── route.ts
│   │   │       ├── stream
│   │   │       │   └── route.ts
│   │   │       └── status
│   │   │           └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── sessions
│       └── [sessionId]
│           └── page.tsx
├── components
│   ├── chat
│   │   ├── chat-shell.tsx
│   │   ├── chat-header.tsx
│   │   ├── message-list.tsx
│   │   ├── message-bubble.tsx
│   │   ├── message-markdown.tsx
│   │   ├── composer.tsx
│   │   ├── connection-pill.tsx
│   │   ├── session-sidebar.tsx
│   │   ├── empty-state.tsx
│   │   ├── typing-stream.tsx
│   │   ├── tts-slot.tsx
│   │   └── stt-slot.tsx
│   ├── layout
│   │   ├── app-frame.tsx
│   │   └── theme-toggle.tsx
│   └── ui
│       ├── button.tsx
│       ├── textarea.tsx
│       ├── scroll-area.tsx
│       ├── separator.tsx
│       └── badge.tsx
├── lib
│   ├── api
│   │   ├── dto.ts
│   │   └── validators.ts
│   ├── db
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   ├── migrations
│   │   └── repositories
│   │       ├── sessions-repository.ts
│   │       ├── messages-repository.ts
│   │       └── events-repository.ts
│   ├── hermes
│   │   ├── hermes-adapter.ts
│   │   ├── hermes-parser.ts
│   │   ├── hermes-process.ts
│   │   ├── hermes-registry.ts
│   │   ├── hermes-events.ts
│   │   └── strip-ansi.ts
│   ├── services
│   │   ├── session-service.ts
│   │   ├── message-service.ts
│   │   ├── streaming-service.ts
│   │   └── connection-service.ts
│   ├── audio
│   │   ├── contracts.ts
│   │   ├── tts-placeholder.ts
│   │   └── stt-placeholder.ts
│   ├── utils
│   │   ├── cn.ts
│   │   ├── time.ts
│   │   ├── ids.ts
│   │   └── markdown.ts
│   └── constants.ts
├── hooks
│   ├── use-session-stream.ts
│   ├── use-auto-scroll.ts
│   ├── use-theme-preference.ts
│   └── use-session-list.ts
├── types
│   ├── api.ts
│   ├── chat.ts
│   ├── hermes.ts
│   └── audio.ts
├── public
│   └── ...
├── scripts
│   ├── init-db.ts
│   └── smoke-hermes.ts
├── drizzle.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── package.json
├── .env.local
└── BUILD-PLAN.md
```

### Structure Notes

- `app/api/...` contains all server route handlers
- `lib/hermes/...` isolates subprocess and parsing logic from HTTP details
- `lib/services/...` holds application rules and orchestration
- `lib/audio/...` reserves TTS/STT integration seams
- `components/chat/...` contains all chat-specific UI pieces
- `hooks/...` keeps client streaming and scroll logic out of large components
- `scripts/smoke-hermes.ts` should be used early to validate whether Hermes behaves correctly in non-interactive mode

---

## 5. Component Breakdown

### 5.1 App-Level Pages

#### `app/page.tsx`

Landing entry point.

Responsibilities:

- Redirect to the latest session if one exists
- Otherwise create a new session or show a welcome shell
- Present a minimal boot/loading experience

#### `app/sessions/[sessionId]/page.tsx`

Primary chat screen.

Responsibilities:

- Fetch initial session metadata and existing messages
- Render the chat shell and sidebar
- Start the SSE subscription for live updates
- Manage client-side optimistic state for outgoing/incoming messages

### 5.2 Layout Components

#### `components/layout/app-frame.tsx`

Shared responsive page container.

Responsibilities:

- Desktop/tablet framing
- Sidebar/content layout
- Theme-aware background and panel styling

#### `components/layout/theme-toggle.tsx`

Simple light/dark toggle.

Responsibilities:

- Toggle theme via `next-themes`
- Reflect current mode accessibly

### 5.3 Chat Components

#### `components/chat/chat-shell.tsx`

Top-level chat composition component.

Responsibilities:

- Compose sidebar, header, message list, and composer
- Own high-level local UI state
- Receive data from route-fetching and stream hooks

#### `components/chat/chat-header.tsx`

Session title and controls row.

Responsibilities:

- Display session title
- Show connection status
- Provide start/stop buttons
- Reserve UI slot for future audio controls

#### `components/chat/session-sidebar.tsx`

Session navigation panel.

Responsibilities:

- List stored sessions
- Create new sessions
- Switch active session
- Show recent timestamps and connection state

#### `components/chat/message-list.tsx`

Scrollable message container.

Responsibilities:

- Render all persisted and optimistic messages
- Trigger auto-scroll when appropriate
- Avoid scroll jumps when older content is loaded

#### `components/chat/message-bubble.tsx`

Message wrapper with role-specific styling.

Responsibilities:

- Right-align user messages
- Left-align assistant messages
- Render system/status rows differently from normal chat bubbles

#### `components/chat/message-markdown.tsx`

Markdown rendering for assistant messages.

Responsibilities:

- Render CommonMark/GFM safely
- Apply syntax highlighting for fenced code blocks
- Style inline code, links, lists, tables, blockquotes

Recommended packages:

- `react-markdown`
- `remark-gfm`
- `rehype-highlight` or `shiki`-based server rendering

For v1, `react-markdown + remark-gfm + rehype-highlight` is acceptable. If design quality is a priority, `shiki` often produces more consistent code output.

#### `components/chat/composer.tsx`

Message input control area.

Responsibilities:

- Multi-line text input
- Submit on Enter, newline on Shift+Enter
- Disable while disconnected or while awaiting model turn if required
- Reserve voice input control slot

#### `components/chat/connection-pill.tsx`

Status indicator.

States:

- Connected
- Disconnected
- Connecting
- Error

#### `components/chat/typing-stream.tsx`

Optional streaming indicator.

Responsibilities:

- Show incremental assistant output before final persistence
- Give the UI a sense of live response generation

#### `components/chat/tts-slot.tsx`

Placeholder only.

Responsibilities:

- Export a stable component contract where TTS buttons/actions can later be added
- Render nothing or a disabled placeholder in v1

#### `components/chat/stt-slot.tsx`

Placeholder only.

Responsibilities:

- Reserve a stable place for future microphone input control
- Render nothing or disabled state in v1

### 5.4 Hooks

#### `use-session-stream.ts`

Responsibilities:

- Open and manage the SSE stream
- Parse event payloads
- Update client state for deltas, statuses, errors, and completion
- Handle reconnect logic if the browser reconnects

#### `use-auto-scroll.ts`

Responsibilities:

- Scroll to bottom on new messages when the user is already near the bottom
- Avoid yanking scroll if the user is reading prior content

#### `use-session-list.ts`

Responsibilities:

- Fetch and refresh session sidebar data
- Hide route-fetching complexity from UI components

---

## 6. Data Model

### 6.1 Recommended Tables

#### `chat_sessions`

Fields:

- `id` TEXT PRIMARY KEY
- `title` TEXT NOT NULL
- `status` TEXT NOT NULL
- `created_at` INTEGER NOT NULL
- `updated_at` INTEGER NOT NULL
- `last_connected_at` INTEGER NULL
- `last_disconnected_at` INTEGER NULL
- `metadata_json` TEXT NULL

Notes:

- `status` is persisted as the latest known durable state, not the sole source of runtime truth
- `metadata_json` can later store provider settings, audio flags, or model hints

#### `chat_messages`

Fields:

- `id` TEXT PRIMARY KEY
- `session_id` TEXT NOT NULL
- `role` TEXT NOT NULL
- `content` TEXT NOT NULL
- `sequence` INTEGER NOT NULL
- `created_at` INTEGER NOT NULL
- `updated_at` INTEGER NOT NULL
- `status` TEXT NOT NULL
- `stderr` INTEGER NOT NULL DEFAULT 0
- `metadata_json` TEXT NULL

Notes:

- `role` should support `user`, `assistant`, `system`, `status`
- `status` can support `complete`, `streaming`, `error`
- `sequence` simplifies ordered rendering without relying only on timestamps

#### `session_events` (optional but recommended)

Fields:

- `id` TEXT PRIMARY KEY
- `session_id` TEXT NOT NULL
- `type` TEXT NOT NULL
- `payload_json` TEXT NULL
- `created_at` INTEGER NOT NULL

Purpose:

- Audit trail for connection lifecycle and hard-to-debug subprocess behavior
- Useful during development and when diagnosing parser issues

### 6.2 In-Memory Runtime State

Each active session in memory should track:

- `sessionId`
- `process`
- `status`
- `subscribers`
- `currentAssistantDraft`
- `stdoutBuffer`
- `stderrBuffer`
- `startedAt`
- `lastActivityAt`

Do not attempt to persist the entire process object or live event emitter state.

---

## 7. Data Flow Diagram

```text
[Browser UI]
   |
   | 1. User types a message
   v
[POST /api/sessions/:sessionId/messages]
   |
   | 2. Validate request
   | 3. Persist user message to SQLite
   | 4. Forward text to Hermes stdin
   v
[HermesProcessRegistry]
   |
   | 5. Session lookup
   | 6. Write message + newline to child stdin
   v
[Hermes CLI subprocess: `hermes chat`]
   |
   | 7. Streams stdout/stderr
   v
[Hermes Adapter / Parser]
   |
   | 8. Strip ANSI / normalize chunks
   | 9. Detect assistant message boundaries
   | 10. Emit typed events
   v
[Streaming Service]
   |
   | 11. Broadcast SSE events to subscribed browsers
   | 12. Persist final assistant message to SQLite
   v
[GET /api/sessions/:sessionId/stream (SSE)]
   |
   | 13. Browser receives delta/completed/status events
   v
[React state]
   |
   | 14. Message list updates
   | 15. Auto-scroll if user is near bottom
   v
[User sees live Hermes response]
```

### Connection Lifecycle Flow

```text
[User clicks Connect]
   -> [POST /api/sessions/:sessionId/connect]
   -> [Session Service validates session]
   -> [Hermes registry spawns `hermes chat`]
   -> [Process event hooks attach]
   -> [SSE emits session.connected]
   -> [UI shows Connected]

[User clicks Disconnect]
   -> [POST /api/sessions/:sessionId/disconnect]
   -> [Registry stops child process]
   -> [Durable status updated]
   -> [SSE emits session.disconnected]
   -> [UI shows Disconnected]
```

---

## 8. API Route Specifications

All API routes should return typed JSON except the SSE endpoint.

### 8.1 `GET /api/health`

Purpose:

- Basic app health check
- Verify DB connectivity and optionally whether Hermes binary is discoverable

Response example:

```json
{
  "ok": true,
  "database": "ok",
  "hermesBinary": "unknown"
}
```

### 8.2 `GET /api/sessions`

Purpose:

- List all chat sessions for the sidebar

Response shape:

```json
{
  "sessions": [
    {
      "id": "sess_123",
      "title": "New Session",
      "status": "disconnected",
      "updatedAt": 1710000000,
      "messageCount": 12
    }
  ]
}
```

### 8.3 `POST /api/sessions`

Purpose:

- Create a new chat session

Request body:

```json
{
  "title": "Optional custom title"
}
```

Response:

```json
{
  "session": {
    "id": "sess_123",
    "title": "New Session",
    "status": "disconnected"
  }
}
```

### 8.4 `GET /api/sessions/[sessionId]`

Purpose:

- Fetch session metadata and optionally recent messages

Response:

```json
{
  "session": {
    "id": "sess_123",
    "title": "CLI Planning",
    "status": "connected"
  }
}
```

### 8.5 `GET /api/sessions/[sessionId]/messages`

Purpose:

- Fetch the full persisted message history for a session

Response:

```json
{
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "Hello",
      "status": "complete",
      "createdAt": 1710000000
    },
    {
      "id": "msg_2",
      "role": "assistant",
      "content": "Hi there",
      "status": "complete",
      "createdAt": 1710000001
    }
  ]
}
```

### 8.6 `POST /api/sessions/[sessionId]/connect`

Purpose:

- Start a Hermes subprocess for the session

Behavior:

- If a process already exists and is healthy, return idempotent success
- If not running, spawn `hermes chat`
- Attach stdout/stderr/exit listeners
- Update durable session status

Request body:

```json
{}
```

Response:

```json
{
  "status": "connected"
}
```

### 8.7 `POST /api/sessions/[sessionId]/disconnect`

Purpose:

- Gracefully stop the Hermes subprocess for a session

Behavior:

- Close stdin if graceful shutdown is supported
- Otherwise send `SIGTERM`
- Escalate to `SIGKILL` only after timeout during shutdown logic in service layer

Response:

```json
{
  "status": "disconnected"
}
```

### 8.8 `GET /api/sessions/[sessionId]/status`

Purpose:

- Return the current runtime status for UI polling or route-load bootstrap

Response:

```json
{
  "status": "connected",
  "hasActiveProcess": true,
  "lastActivityAt": 1710000002
}
```

### 8.9 `POST /api/sessions/[sessionId]/messages`

Purpose:

- Accept user message, persist it, and forward it to Hermes

Request body:

```json
{
  "content": "Explain this error"
}
```

Behavior:

- Validate non-empty input
- Confirm session exists
- Confirm Hermes session is connected, or optionally auto-connect
- Persist user message
- Forward content to stdin
- Return accepted response immediately

Recommended response:

```json
{
  "accepted": true,
  "messageId": "msg_user_123"
}
```

### 8.10 `GET /api/sessions/[sessionId]/stream`

Purpose:

- SSE endpoint for live events

Headers:

- `Content-Type: text/event-stream`
- `Cache-Control: no-cache, no-transform`
- `Connection: keep-alive`

Event types:

- `session.connected`
- `session.disconnected`
- `session.error`
- `message.started`
- `message.delta`
- `message.completed`
- `stderr.delta`
- `heartbeat`

Example SSE payload:

```text
event: message.delta
data: {"sessionId":"sess_123","messageId":"msg_ai_456","delta":"Hello"}
```

### 8.11 Optional Future Route: `POST /api/sessions/[sessionId]/rename`

Not required for v1, but likely useful soon.

---

## 9. Hermes Integration Design

### 9.1 Spawn Strategy

Base command:

```bash
hermes chat
```

Recommended `spawn` settings:

- `stdio: ["pipe", "pipe", "pipe"]`
- `shell: false`
- Explicit environment pass-through
- Consider `TERM=dumb`
- Consider `NO_COLOR=1`

This reduces ANSI noise and makes parsing easier if Hermes respects those environment hints.

### 9.2 Hermes Adapter Responsibilities

`lib/hermes/hermes-adapter.ts` should:

- Spawn the process
- Expose `sendMessage(text: string)`
- Expose `stop()`
- Attach listeners
- Normalize output chunks
- Emit typed internal events

Do not mix database persistence into the adapter. Keep it pure to process integration.

### 9.3 Parser Responsibilities

`lib/hermes/hermes-parser.ts` should:

- Remove ANSI sequences
- Normalize carriage returns and partial-line updates
- Buffer incomplete chunks
- Detect when a response starts
- Detect when a response completes

The parser should be replaceable because the exact Hermes output format may need tuning after real testing.

### 9.4 Important Validation Task Early in the Project

Before building much UI, verify:

1. Does `hermes chat` accept stdin from a non-TTY process?
2. Does it stream stdout incrementally?
3. Does it flush output as tokens/chunks or only on completion?
4. Does stderr include useful warnings or noisy progress lines?
5. Does it need an interactive terminal to function correctly?

If the answer to item 5 is yes, switch to `node-pty` while keeping the same adapter interface.

---

## 10. Frontend UX Plan

### 10.1 Primary Layout

Desktop/tablet-first layout:

- Left sidebar for session list
- Main panel for chat
- Sticky top header with session title, connection pill, connect/disconnect controls, theme toggle
- Scrollable message area
- Sticky bottom composer

### 10.2 Chat Bubble Rules

- User messages on the right
- Assistant messages on the left
- System/status messages centered or muted inline
- Use different bubble backgrounds for user vs assistant
- Preserve whitespace in code blocks and multi-line responses

### 10.3 Streaming UX

As Hermes streams:

- Show a live assistant bubble in-progress
- Append deltas as they arrive
- Mark final response complete on `message.completed`

Avoid rendering a new assistant bubble for every chunk. One logical response should map to one assistant message row.

### 10.4 Auto-Scroll Rules

Auto-scroll only when the user is near the bottom.

Behavior:

- If user is reading the latest content, keep snapping to newest stream output
- If user has scrolled up significantly, do not force-scroll
- Optionally show a “Jump to latest” affordance later

### 10.5 Responsive Behavior

Target:

- Desktop and tablet as primary
- Mobile can degrade gracefully, but is not the primary target

Tablet behavior:

- Sidebar may collapse to drawer
- Chat composer remains anchored
- Message width constrained for readability

### 10.6 Theme Design

Dark mode default.

Recommendations:

- Use neutral dark surfaces, not pure black
- Provide strong contrast for code blocks
- Make connection states highly legible in both themes

---

## 11. Step-by-Step Implementation Order

## Phase 1: Project Bootstrap

1. Initialize Next.js with App Router, TypeScript, Tailwind CSS, ESLint.
2. Install baseline dependencies:
   - `next`
   - `react`
   - `react-dom`
   - `tailwindcss`
   - `next-themes`
   - `react-markdown`
   - `remark-gfm`
   - syntax-highlighting package
   - `better-sqlite3`
   - `drizzle-orm`
   - `drizzle-kit`
   - `zod`
   - optionally `nanoid`
3. Create global layout, CSS tokens, and theme provider.
4. Add base UI primitives and app shell.

Deliverable:

- Running Next.js app with dark mode default and light toggle

## Phase 2: Persistence Foundation

1. Define SQLite schema for sessions, messages, and optional events.
2. Wire `lib/db/client.ts`.
3. Add repositories for session and message CRUD.
4. Add DB initialization/migration scripts.
5. Seed one sample session locally for UI development if useful.

Deliverable:

- Local storage layer working independent of Hermes

## Phase 3: Static Chat UI

1. Build session sidebar.
2. Build chat header.
3. Build message list and message bubble components.
4. Add markdown rendering and code highlighting.
5. Add composer with keyboard submit behavior.
6. Add auto-scroll hook.

Deliverable:

- Fully interactive static chat UI using mocked data

## Phase 4: API and Server Services

1. Implement `GET/POST /api/sessions`.
2. Implement `GET /api/sessions/[sessionId]`.
3. Implement `GET /api/sessions/[sessionId]/messages`.
4. Implement request validation with `zod`.
5. Add service layer between routes and repositories.

Deliverable:

- UI can create sessions and load persisted conversations

## Phase 5: Hermes Process Manager

1. Build `HermesProcessRegistry`.
2. Build `HermesAdapter`.
3. Build initial stdout/stderr parser.
4. Implement `connect`, `disconnect`, and `status` services.
5. Add a standalone smoke script to test Hermes outside the UI.

Deliverable:

- The server can start and stop `hermes chat` reliably

## Phase 6: Live Streaming Pipeline

1. Implement SSE endpoint per session.
2. Add subscriber management in the registry or streaming service.
3. Wire Hermes stdout/stderr into typed events.
4. Add client hook for stream consumption.
5. Render live assistant output in the chat.

Deliverable:

- End-to-end live streaming from Hermes to browser

## Phase 7: Message Send Flow

1. Implement `POST /api/sessions/[sessionId]/messages`.
2. Persist user messages immediately.
3. Forward prompt to Hermes stdin.
4. Stream assistant deltas into the client.
5. Persist final assistant message on completion.

Deliverable:

- Real conversation loop works through the web UI

## Phase 8: Connection UX and Error Handling

1. Add connection status pill.
2. Add connect/disconnect controls.
3. Handle missing Hermes binary gracefully.
4. Handle subprocess exit and unexpected crashes.
5. Surface stderr meaningfully without polluting the main transcript.

Deliverable:

- Production-worthy control flow for starting/stopping Hermes

## Phase 9: Quality Pass

1. Improve loading and empty states.
2. Refine dark/light visual polish.
3. Add keyboard and accessibility checks.
4. Test desktop and tablet layouts.
5. Validate session persistence across app restart.

Deliverable:

- Stable v1 quality bar

## Phase 10: Extension Seams

1. Add placeholder audio contracts and non-functional UI slots.
2. Add metadata shape for future per-session audio preferences.
3. Document where TTS/STT providers will plug in.

Deliverable:

- TTS/STT can be added later without major refactor

---

## 12. Suggested Dependency List

Core:

- `next`
- `react`
- `react-dom`
- `typescript`
- `tailwindcss`
- `postcss`
- `autoprefixer`

UI:

- `next-themes`
- `clsx`
- `tailwind-merge`
- optional icon package such as `lucide-react`

Content rendering:

- `react-markdown`
- `remark-gfm`
- `rehype-highlight` or `shiki`
- `highlight.js` if using `rehype-highlight`

Validation and IDs:

- `zod`
- `nanoid`

Persistence:

- `better-sqlite3`
- `drizzle-orm`
- `drizzle-kit`

Optional operational helpers:

- `strip-ansi`
- `eventemitter3`

Possible fallback if Hermes requires TTY:

- `node-pty`

Do not install `node-pty` unless Hermes behavior proves it is necessary.

---

## 13. Key Technical Decisions and Rationale

### Decision: Use SSE instead of WebSockets

Rationale:

- Lower implementation complexity
- Good fit for server-to-client token streaming
- Easier route-level integration in Next.js App Router
- Fewer moving pieces for v1

### Decision: Use SQLite instead of JSON file persistence

Rationale:

- More robust than ad hoc file appends
- Better support for session lists, sorting, counts, and migrations
- Easier future features such as search and export

### Decision: Keep live runtime state in memory, persist durable chat state in SQLite

Rationale:

- Process handles cannot be stored durably
- Active process state is ephemeral by nature
- Separating runtime and persistence keeps failure boundaries clean

### Decision: Introduce an adapter layer between Hermes and routes

Rationale:

- Hermes output behavior is the highest-risk unknown
- Parser logic will likely evolve after real testing
- API handlers should not know about chunk parsing details

### Decision: Default theme to dark and use `next-themes`

Rationale:

- Matches product requirement directly
- Avoids custom theme hydration edge cases
- Tailwind integrates cleanly with class-based theme toggling

### Decision: Reserve audio contracts now, but do not implement providers

Rationale:

- Prevents future UI and service-layer rewrites
- Keeps current scope controlled
- Makes the extension path explicit

---

## 14. Potential Pitfalls to Avoid

### 14.1 Assuming Hermes Works Perfectly Over Pipes

Risk:

- Many CLIs behave differently when not attached to a TTY

Mitigation:

- Validate early with a smoke script
- Keep a clean fallback path to `node-pty`

### 14.2 Parsing ANSI or Partial-Line Output Poorly

Risk:

- The UI shows broken text, duplicate chunks, or terminal junk

Mitigation:

- Strip ANSI sequences
- Normalize carriage returns
- Centralize parsing in one module

### 14.3 Losing Response Boundaries

Risk:

- Multiple assistant turns merge into one message
- One assistant response is split incorrectly

Mitigation:

- Design around explicit parser state
- Log raw output during development
- Keep draft-message handling flexible

### 14.4 Blocking the Event Loop

Risk:

- Poor streaming performance
- Slow UI updates

Mitigation:

- Keep chunk handlers lightweight
- Avoid expensive DB writes on every token unless necessary
- Batch or finalize persistence when possible

### 14.5 Using Edge Runtime Accidentally

Risk:

- `child_process` and SQLite code will fail

Mitigation:

- Keep Hermes/database logic in clearly Node-only modules
- Be explicit about runtime requirements in route files if needed

### 14.6 Not Handling Server Restarts Gracefully

Risk:

- Active in-memory process registry disappears on restart
- UI and DB statuses drift apart

Mitigation:

- On app boot, assume no active Hermes subprocesses exist
- Mark any stale “connected” durable statuses back to “disconnected”
- Treat active process state as non-durable

### 14.7 Over-coupling UI to Backend Event Shapes

Risk:

- Small backend streaming changes cause broad frontend rewrites

Mitigation:

- Define typed event DTOs
- Keep client stream handling centralized in one hook

### 14.8 Auto-Scroll That Fights the User

Risk:

- Poor usability when reviewing earlier messages

Mitigation:

- Auto-scroll only near the bottom
- Preserve manual reading position

### 14.9 Unsafe Markdown Rendering

Risk:

- XSS or broken rendering from model output

Mitigation:

- Use a well-vetted markdown pipeline
- Avoid unsafe HTML rendering by default
- Sanitize or disallow raw HTML unless there is a strong reason

### 14.10 Mixing stderr Into the Main Chat Blindly

Risk:

- Error logs pollute the conversation transcript

Mitigation:

- Treat stderr as operational events
- Surface them as muted diagnostics or toast errors, not normal assistant text

---

## 15. Testing and Verification Plan

### 15.1 Early Smoke Tests

Before UI integration:

1. Confirm the Hermes binary is installed and discoverable
2. Run `hermes chat` manually
3. Run a Node smoke script that spawns Hermes and writes to stdin
4. Confirm stdout arrives incrementally
5. Confirm graceful stop behavior

### 15.2 Backend Tests

Recommended coverage:

- Session creation and retrieval
- Message persistence order
- Idempotent connect behavior
- Disconnect behavior when process is already absent
- Stream subscriber registration and cleanup
- Parser normalization for sample CLI chunks

### 15.3 Frontend Tests

Recommended coverage:

- Message alignment by role
- Markdown and code block rendering
- Theme toggle persistence
- Auto-scroll behavior
- Connection pill state changes

### 15.4 Manual End-to-End Checks

- Create session
- Connect Hermes
- Send prompt
- Watch streaming output
- Refresh browser and confirm history persists
- Disconnect and reconnect
- Switch between sessions
- Toggle dark/light theme
- Verify tablet layout

---

## 16. Suggested Initial MVP Scope

If implementation needs to be scoped tightly at first, the smallest acceptable MVP is:

1. One session list
2. One live Hermes subprocess per selected session
3. Connect/disconnect controls
4. Send message + stream reply
5. Persist messages to SQLite
6. Dark mode default + light toggle
7. Markdown rendering + code highlighting

Defer until after MVP if needed:

- Session renaming
- Search
- Export/import
- Rich diagnostics drawer
- Retry/regenerate controls
- Mobile-specific optimization beyond graceful fallback

---

## 17. Build Notes for the Implementing Agent

1. Validate Hermes CLI behavior before spending time polishing the UI.
2. Keep the Hermes integration behind a narrow adapter interface from day one.
3. Treat SSE as the canonical live-update channel.
4. Persist the user message immediately, but be thoughtful about when to persist assistant output.
5. Do not let TTS/STT placeholders introduce implementation scope creep.
6. Favor robust operational behavior over flashy UI extras in the first pass.

---

## 18. Final Recommendation

The most pragmatic v1 architecture is:

- **Next.js App Router + TypeScript**
- **Tailwind CSS + `next-themes`**
- **SQLite with `better-sqlite3` and preferably Drizzle**
- **Node runtime route handlers**
- **A singleton in-memory Hermes process registry**
- **SSE for server-to-client response streaming**
- **A dedicated Hermes adapter/parser layer**
- **Stubbed audio extension contracts for future TTS/STT**

This approach satisfies the current requirements while keeping the highest-risk area, Hermes subprocess integration, isolated and replaceable.
