# PHASE A — "Classroom" Redesign Spec

**Author:** Claude (foreman). **Builder:** Codex CLI. **Branch:** `phase-a-classroom`.
**Goal:** Transform Super Hank Chat from the brutalist "Dispatch" terminal look into a bright, playful, friendly app for adult students learning AI — WITHOUT losing the existing Dispatch theme (it becomes a toggle) and WITHOUT touching any backend logic.

## Non-negotiable constraints

1. **Write set (only these may change):** `app/globals.css`, `app/layout.tsx`, `tailwind.config.ts`, `components/**`, `hooks/**` (new files allowed), `public/**` (new files allowed), `app/sessions/[sessionId]/chat-page-client.tsx` (minimal prop threading only).
2. **Never touch:** `lib/**`, `app/api/**`, `drizzle/**`, `scripts/**`, `.env.local`, `package.json` dependencies. **Do NOT run `npm install`** (exFAT drive breaks native modules).
3. Artifact iframe keeps `sandbox="allow-scripts"` exactly as-is.
4. All existing functionality must keep working: streaming, artifact panel, session sidebar, connect/disconnect, dark/light mode.
5. `npm run build` must pass at the end. Run `npx tsc --noEmit` as you go.

## 1. Dual-theme system

- Add a UI theme dimension **separate from** next-themes dark/light: `data-ui="classroom"` (new default) or `data-ui="dispatch"` (existing look) on `<html>`.
- New hook `hooks/use-ui-theme.ts`: reads/writes `localStorage("shc-ui-theme")`, sets the attribute, defaults to `classroom`. No hydration flash: inline script in `app/layout.tsx` head (same pattern next-themes uses).
- **All existing Dispatch tokens and styles remain untouched** and apply under `html[data-ui="dispatch"]`.
- Classroom tokens apply under `html[data-ui="classroom"]` (both dark and light variants — cooperate with the existing `html.dark` class).
- Header gets a small theme switcher: a segmented control or icon button cycling Classroom ↔ Dispatch (tooltip: "Switch look"). Keep the existing dark/light toggle working in both.

## 2. Classroom design tokens (`app/globals.css`)

Light (default feel — warm, sunny):
```
--c-bg:        #FAF6EF   (warm cream)
--c-bg-raised: #FFFFFF   (cards)
--c-bg-soft:   #F3ECDF   (sidebar, wells)
--c-ink:       #2D2A26   (warm near-black)
--c-ink-soft:  #6B655C
--c-primary:   #FF7A59   (coral — buttons, user bubble, highlights)
--c-primary-ink: #FFFFFF
--c-secondary: #2BB3A3   (teal — links, active states, connection-ok)
--c-accent:    #FFC94D   (sunny amber — badges, playful touches)
--c-hank:      #7BC950   (fresh green — Hank's identity color, nod to the old olive)
--c-danger:    #E5533C
--c-border:    #E7DFD2
--c-shadow:    0 2px 8px rgba(45,42,38,.08), 0 8px 24px rgba(45,42,38,.06)
--c-radius-lg: 20px  --c-radius: 14px  --c-radius-sm: 10px
```
Dark variant (`html.dark[data-ui="classroom"]`) — cozy, not black:
```
--c-bg: #201E2B  --c-bg-raised: #2A2838  --c-bg-soft: #262433
--c-ink: #F2EEE6  --c-ink-soft: #A9A3B0  --c-border: #3A3749
(same primary/secondary/accent/hank, slightly brightened: coral #FF8A6B, teal #3BC6B5)
```

## 3. Typography

- Load via `next/font/google` in `app/layout.tsx`: **Nunito** (700/800) → `--font-display`; keep existing Inter → body; keep the serif (Newsreader/Georgia) for Hank's message prose — that stays, it's good.
- Classroom sizes: body/UI 15–16px, chat prose 17px/1.65, metadata 12px **normal case** ("Ekello · 2:14 PM", "Hank · 2:15 PM" — kill the ALL-CAPS), headings in Nunito.
- Letter-spacing: normal. No 9px text anywhere in Classroom.

## 4. Component restyle (Classroom only — Dispatch untouched)

Move inline styles in `components/chat/message-bubble.tsx` (and anywhere else) into class-based styles driven by the token system so both themes work.

- **User bubble:** coral fill, white text, radius 20px with one 6px corner (tail feel), max-width ~72ch, right-aligned.
- **Hank bubble:** white/raised card, soft shadow, radius 20px, green 3px left accent border, serif prose. A small circular avatar (see §5) sits to its left, shown for the first bubble of each Hank run.
- **System/status:** centered pill, amber-tinted background, small, friendly ("Hank reconnected ✓").
- **Composer:** floating rounded card (radius 20px, shadow) with 8–12px inset from edges, placeholder "Ask Hank anything…", visible circular coral send button with hover/active scale, mic slot preserved.
- **Header:** app name "Super Hank Chat" in Nunito, Hank avatar at left, friendly connection pill ("Connected" teal dot / "Offline" gray / "Error" coral), theme switcher, dark/light toggle.
- **Sidebar:** roomy list items (12px padding, radius 12px), session title + relative time + message count, hover raise, active item coral-tinted, "＋ New chat" prominent pill button. Keep HNK-XXXX code but as a subtle badge.
- **Artifact panel:** raised card look, toolbar buttons get labels-on-hover, radius on the panel, "View artifact" pill becomes a clear button with an icon and amber accent.
- **Hover/focus states on every interactive element.** Visible focus rings (`--c-secondary`, 2px).

## 5. Hank avatar — `components/chat/hank-avatar.tsx`

- Circular avatar, sizes `sm` (28px, beside bubbles) and `md` (40px, header).
- **Image slot first:** if `/avatar/hank.png` exists in `public/`, render it (art pipeline will drop in "young Keenan Wright in a suit" later — build for a square photo/illustration crop). Detect via a simple `<img onError>` fallback, no fs calls.
- **Fallback:** friendly inline SVG face (rounded green `--c-hank` circle, two eyes, smile) so the app never ships broken.
- **States (CSS classes, animated):** `idle` — slow 3s gentle float + occasional blink (eyelid rect for SVG; subtle scale for image); `thinking` — while a message is streaming: soft pulsing ring in `--c-hank`; `speaking` — reserved class for Phase B TTS: animated ring waves. Header avatar reflects state; wire `thinking` from the existing streaming state in `chat-page-client.tsx`.

## 6. Motion & micro-interactions (Classroom only)

- Message entrance: 180ms fade + 8px slide-up.
- Typing indicator: three bouncing dots in `--c-hank` (replace the harsh `dispatchBlink` in Classroom; Dispatch keeps its blink).
- Streaming caret: soft opacity pulse, not on/off blink.
- Buttons: 120ms transform scale(0.97) on active, shadow lift on hover.
- Respect `prefers-reduced-motion`: disable float/bounce, keep opacity fades.

## 7. Mobile (≤768px) — both themes benefit

- Sidebar becomes an overlay drawer: hamburger button in header, slide-in with scrim, closes on selection.
- Artifact panel becomes a full-screen overlay with a close bar (instead of the 45% split).
- Composer sticky bottom with `env(safe-area-inset-bottom)` padding; 16px font in the textarea (prevents iOS zoom).
- Tap targets ≥44px.

## 8. Verification checklist (builder must run)

1. `npx tsc --noEmit` — clean.
2. `npm run build` — passes.
3. Grep: no remaining hardcoded Dispatch hex values inside Classroom-scoped styles.
4. List every changed file in your final summary.
