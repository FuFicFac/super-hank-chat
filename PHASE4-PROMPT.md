# Phase 4 — Composer 2 Prompt: Wire Artifact Panel into Chat

Read AGENTS.md and V2-PLAN.md before doing anything.

PROJECT: /Volumes/Expansion/AI Tools/super-hank-chat

The artifact protocol and panel components are already built:
- `lib/artifacts/schema.ts` — types
- `lib/artifacts/parser.ts` — `parseMessageForArtifact()`
- `lib/artifacts/renderer.ts` — iframe srcdoc builder
- `components/artifact/artifact-iframe.tsx` — sandboxed iframe
- `components/artifact/artifact-panel.tsx` — full panel with toolbar

YOUR TASK: Wire the artifact panel into the chat layout.

---

## CHANGES NEEDED

### 1. lib/services/message-service.ts

In `listMessagesService()`, after getting the content string, parse it for artifacts:

```typescript
import { parseMessageForArtifact } from "@/lib/artifacts/parser";

// In listMessagesService(), for assistant messages:
const { prose, artifact } = parseMessageForArtifact(content);
return [{
  id: m.id,
  role: m.role,
  content: prose,          // prose only, artifact stripped
  status: m.status,
  createdAt: m.createdAt,
  artifact: artifact ?? null,
}];
```

Also update the `ApiMessage` type in `types/api.ts` to include `artifact?: Artifact | null`.

### 2. app/sessions/[sessionId]/chat-page-client.tsx

Add `currentArtifact` state:
```typescript
const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);
```

Import `Artifact` type from `@/lib/artifacts/schema`.
Import `parseMessageForArtifact` from `@/lib/artifacts/parser`.

In `toUiMessage()`, pass through the artifact field:
```typescript
artifact: m.artifact ?? null,
```

In the `message.completed` SSE handler: after the message is finalized, parse the content for an artifact and if found, `setCurrentArtifact(artifact)`.

In the `message.delta` SSE handler: also parse accumulating content for artifact (so panel can start showing while streaming). If artifact detected mid-stream, set it.

Pass `currentArtifact` and `onCloseArtifact={() => setCurrentArtifact(null)}` down to `ChatShell`.

### 3. components/chat/chat-shell.tsx

Add `currentArtifact`, `onCloseArtifact` to Props type.

Change layout: when `currentArtifact` is present, split into two columns:

```tsx
<div className="flex min-h-dvh flex-col md:flex-row">
  {/* Left: existing chat column */}
  <div className={currentArtifact ? "hidden md:flex" : "hidden md:flex"}>
    <SessionSidebar ... />
  </div>
  <div className={`flex min-h-0 min-w-0 flex-col ${currentArtifact ? 'md:w-[55%]' : 'flex-1'}`}>
    ... existing chat content ...
  </div>

  {/* Right: artifact panel — only when artifact present */}
  {currentArtifact && (
    <div className="hidden md:flex md:w-[45%] border-l border-zinc-200 dark:border-zinc-700">
      <ArtifactPanel artifact={currentArtifact} onClose={onCloseArtifact} />
    </div>
  )}
</div>
```

Import `ArtifactPanel` from `@/components/artifact/artifact-panel`.

### 4. components/chat/message-bubble.tsx

For assistant messages that have an artifact (`message.artifact != null`), show a subtle pill below the bubble:

```tsx
{message.artifact && (
  <button
    className="mt-1.5 ml-1 text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
    onClick={() => {/* need onViewArtifact callback */}}
  >
    <ExternalLink size={11} />
    View {message.artifact.title ?? message.artifact.type}
  </button>
)}
```

Add `onViewArtifact?: (artifact: Artifact) => void` to the MessageBubble props.
Wire it up through MessageList → ChatShell → chat-page-client.

---

## SUCCESS CRITERIA

- Send a message that contains an artifact tag — the panel appears on the right
- Close button collapses the panel
- Prose portion renders in chat bubble, artifact renders in panel
- No TypeScript errors

---

## CHECKPOINT PROTOCOL
If stuck, write to CHECKPOINT.md and stop.
