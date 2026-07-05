# PHASE C1 — Agent Profiles (multi-persona) Spec

**Builder:** Codex CLI. **Branch:** `phase-a-classroom` (stacking). **Foreman:** Claude.
**Goal:** Let EJ pick an agent when starting a new chat window. Each session is bound to a named agent profile with its own name, avatar, and persona; the chosen agent's persona is injected into Hermes so it actually behaves like that agent. One agent per session window (no multi-party in one window).

## Non-negotiable constraints
1. **Do NOT run `npm install`** (exFAT breaks native modules). **Do NOT run `npm run build`** (it clobbers the running dev server's `.next`). Verify with `npx tsc --noEmit` only.
2. Do not touch `drizzle/**` or add DB migrations — store the agent binding in the EXISTING `chat_sessions.metadata_json` column. No schema changes.
3. Do not break existing behavior: streaming, thinking dropdown, auto-scroll, artifact panel, both themes, voice slots.
4. Do NOT commit (sandbox blocks `.git`; the foreman commits). End with the list of changed files + deviations.
5. Keep the artifact iframe sandbox and all Hermes parsing untouched.

## 1. Profile registry — `lib/agents/profiles.ts` (new)
```ts
export type AgentProfile = {
  id: string;          // stable slug, e.g. "hank"
  name: string;        // display name, e.g. "Hank"
  tagline: string;     // one line for the picker card
  avatar: string | null; // /avatar/<id>.png if a portrait exists, else null → SVG fallback
  color: string;       // hex accent for the fallback avatar + name
  persona: string;     // system-prompt preamble injected into Hermes
  model?: string;      // optional -m override (leave undefined for now)
};
```
Seed these built-in profiles (EJ's org; personas derived from his workspace roles):
- **hank** — "Hank", tagline "Your everyday Hermes agent — code, projects, research.", avatar `/avatar/hank.png` (exists), color `#7BC950`, persona: a friendly, capable general assistant who keeps EJ moving; concise, warm, practical.
- **alice** — "Alice", tagline "CEO / operations — delegation and follow-through.", avatar `null`, color `#3A8FE0`, persona: an operations-minded executive who turns asks into tracked action, crisp and decisive.
- **butch** — "Butch", tagline "Strategic operator — turns confusion into next steps.", avatar `null`, color `#FF7A59`, persona: a strategist/editor/operator hybrid; pressure-tests plans, finds leverage, plain-spoken.
- **doctor-little** — "Doctor Little", tagline "Household & family logistics, research, admin.", avatar `null`, color `#B084E9`, persona: a calm, thorough household operator handling logistics and research.
- **janice** — "Janice", tagline "House spirit — systems, reconciliation, tidiness.", avatar `null`, color `#F2A03D`, persona: meticulous keeper of systems and nightly reconciliation; orderly and quietly witty.

Export `AGENT_PROFILES: AgentProfile[]`, `DEFAULT_AGENT_ID = "hank"`, and helpers `getAgentProfile(id?: string | null): AgentProfile` (falls back to hank) and `getAgentPersona(id?: string | null): string`.

## 2. Session ↔ agent binding (metadata, no migration)
- `lib/api/validators.ts`: add `agentId: z.string().trim().min(1).max(64).optional()` to `createSessionBodySchema`.
- `lib/services/session-service.ts` `createSessionService`: accept `{ title?, agentId? }`; pass through.
- `lib/db/repositories/sessions-repository.ts` `createSession`: accept `agentId?`; when present set `metadataJson: JSON.stringify({ agentId })` instead of null.
- Expose the agent on reads:
  - `SessionListItem` (repo) + `toSessionSummary` (dto) + `ApiSessionSummary` (types/api): add `agentId: string | null` parsed from `metadataJson`.
  - `ApiSessionDetail` + `toSessionDetail` + `getSessionDetail`: add `agentId: string | null`.
  - Parse metadata defensively (try/catch, may be null or contain `hermesSessionId` too — preserve both).

## 3. Persona injection into Hermes — `lib/hermes/hermes-registry.ts`
- Extend `SessionMetadata` type to `{ hermesSessionId?: string; agentId?: string }`. `writeSessionMetadata` already merges — keep `agentId` intact when writing `hermesSessionId`.
- In `sendToHermes`, when this is the **first turn of the session** (no `metadata.hermesSessionId` yet), prepend the agent persona to the query:
  `const persona = getAgentPersona(metadata.agentId); const q = persona ? \`${persona}\n\n---\nUser: ${text}\` : text;`
  Use `q` in the `-q` arg. On resumed turns (hermesSessionId present) send `text` unchanged — the persona is already established in the Hermes session.
- This is the only functional-behavior change; keep it minimal and clearly commented.

## 4. Generalize the avatar — `components/chat/hank-avatar.tsx`
- Add optional props: `src?: string | null` (portrait path; default `/avatar/hank.png`), `name?: string` (for initial fallback), `color?: string` (fallback circle color; default `--c-hank`).
- If `src` is null/missing or errors → render the friendly SVG fallback using `color`, and show the agent's first initial. Keep existing idle/thinking/speaking states. Existing callers (no new props) must behave exactly as before.

## 5. Agent picker — `components/chat/agent-picker.tsx` (new)
- A modal/overlay opened by "＋ New chat". Grid of cards, one per `AGENT_PROFILES`: avatar (md), name, tagline, accent border in the agent's color. Keyboard accessible (focusable cards, Enter selects, Esc closes). Themed for Classroom + Dispatch.
- Props: `open`, `onClose`, `onPick(agentId: string)`.
- Wire in `chat-page-client.tsx`: `onCreateSession` opens the picker instead of immediately creating; picking calls `POST /api/sessions` with `{ agentId }`, then `refresh()` + navigate to the new session (same as today's create flow, plus agentId).
- Keep a fast path: an explicit "Just use Hank" / default card is fine, but every card should work.

## 6. Show the bound agent in the UI
- `chat-page-client.tsx`: resolve `const agent = getAgentProfile(currentSession?.agentId ?? sessionDetail agentId)`. Thread `agent` (or its fields) into `ChatShell` → `ChatHeader` and `MessageList` → `MessageBubble`.
- `ChatHeader`: replace hardcoded avatar + implicit Hank with `agent.name` and `<HankAvatar src={agent.avatar} name={agent.name} color={agent.color} .../>`.
- `MessageBubble` (assistant): replace the hardcoded `"Hank · "` label and default avatar with `agent.name` + agent avatar. Pass agent via props from MessageList (which gets it from ChatShell). User bubbles unchanged ("Ekello").
- `session-sidebar.tsx`: show each session's agent — small avatar dot in the agent's color + name/initial next to the title (read `session.agentId`). Keep it subtle.

## 7. Verification (builder must do)
1. `npx tsc --noEmit` clean.
2. Grep to confirm no remaining hardcoded `"Hank"` assistant label in message-bubble/header (should come from the profile).
3. Confirm existing callers of `HankAvatar` with no new props still compile and default to Hank.
4. List every changed/new file + any deviations.

## Out of scope (later phases)
- Writing profiles into `~/.hermes/config.yaml` personalities (we inject per-query instead — safer, no shared-config edits).
- Per-agent model/toolset switching (field exists, unused for now).
- True multi-agent group chat in one window.
- Editable/user-created profiles UI (built-in set only for v1).
