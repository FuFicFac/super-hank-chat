import test from "node:test";
import assert from "node:assert/strict";
import {
  extractHermesQueryResult,
  normalizeHermesAssistantContent,
  sanitizeHermesDiagnosticDelta,
  toVisibleHermesAssistantContent,
} from "../lib/hermes/query-output";

test("extractHermesQueryResult strips quiet-mode chrome and returns the assistant reply", () => {
  const raw = `
╭─ ⚕ Hermes ───────────────────────────────────────────────────────────────────╮
Hey ej, good to see you.

session_id: 20260414_165215_6226b5
`;

  const result = extractHermesQueryResult(raw);

  assert.equal(result.content, "Hey ej, good to see you.");
  assert.equal(result.error, null);
  assert.equal(result.sessionId, "20260414_165215_6226b5");
});

test("extractHermesQueryResult drops resume banners and preserves multiline replies", () => {
  const raw = `↻ Resumed session 20260414_165244_be17ee (1 user message, 2 total messages)

╭─ ⚕ Hermes ───────────────────────────────────────────────────────────────────╮
First line.
Second line.

session_id: 20260414_165244_be17ee
`;

  const result = extractHermesQueryResult(raw);

  assert.equal(result.content, "First line.\nSecond line.");
  assert.equal(result.error, null);
  assert.equal(result.sessionId, "20260414_165244_be17ee");
});

test("extractHermesQueryResult collapses duplicated opening paragraphs caused by Hermes quiet-mode redraws", () => {
  const raw = `↻ Resumed session 20260414_170152_e5d64d (6 user messages, 12 total messages)

╭─ ⚕ Hermes ───────────────────────────────────────────────────────────────────╮
Yeah, a bit.

Yeah, a bit.

Not broken, just a touch draggy on response timing right now. If it keeps happening, I’d suspect platform/model latency before anything smarter.

session_id: 20260414_170152_e5d64d
`;

  const result = extractHermesQueryResult(raw);

  assert.equal(
    result.content,
    "Yeah, a bit.\n\nNot broken, just a touch draggy on response timing right now. If it keeps happening, I’d suspect platform/model latency before anything smarter.",
  );
  assert.equal(result.error, null);
});

test("extractHermesQueryResult collapses overlapping duplicated prefixes when Hermes redraw output repeats then extends the same response", () => {
  const raw = `↻ Resumed session 20260414_170152_e5d64d (6 user messages, 12 total messages)

╭─ ⚕ Hermes ───────────────────────────────────────────────────────────────────╮
A little, yeah.

I’m here and working, but that last turn did feel slower than ideal. If you want, I can help figure out whether it’s:
1. model latency,
2. tool/runtime lag,
3. browser/session drag,
A little, yeah.

I’m here and working, but that last turn did feel slower than ideal. If you want, I can help figure out whether it’s:
1. model latency,
2. tool/runtime lag,
3. browser/session drag,
4. or just transient platform hiccups.

session_id: 20260414_170152_e5d64d
`;

  const result = extractHermesQueryResult(raw);

  assert.equal(
    result.content,
    "A little, yeah.\n\nI’m here and working, but that last turn did feel slower than ideal. If you want, I can help figure out whether it’s:\n1. model latency,\n2. tool/runtime lag,\n3. browser/session drag,\n4. or just transient platform hiccups.",
  );
  assert.equal(result.error, null);
});

test("extractHermesQueryResult treats known API failure output as an error, not an assistant message", () => {
  const raw = `↻ Resumed session 20260414_170152_e5d64d (8 user messages, 16 total messages)
API call failed after 3 retries: HTTP 429: The usage limit has been reached

session_id: 20260414_170152_e5d64d
`;

  const result = extractHermesQueryResult(raw);

  assert.equal(result.content, "");
  assert.equal(result.error, "API call failed after 3 retries: HTTP 429: The usage limit has been reached");
});

test("normalizeHermesAssistantContent cleans overlapping duplicated stored assistant content", () => {
  const content = `A little, yeah.

I’m here and working, but that last turn did feel slower than ideal. If you want, I can help figure out whether it’s:
1. model latency,
2. tool/runtime lag,
3. browser/session drag,
A little, yeah.

I’m here and working, but that last turn did feel slower than ideal. If you want, I can help figure out whether it’s:
1. model latency,
2. tool/runtime lag,
3. browser/session drag,
4. or just transient platform hiccups.`;

  assert.equal(
    normalizeHermesAssistantContent(content),
    "A little, yeah.\n\nI’m here and working, but that last turn did feel slower than ideal. If you want, I can help figure out whether it’s:\n1. model latency,\n2. tool/runtime lag,\n3. browser/session drag,\n4. or just transient platform hiccups.",
  );
});

test("toVisibleHermesAssistantContent hides stored assistant API failure text from old bad sessions", () => {
  assert.equal(
    toVisibleHermesAssistantContent("API call failed after 3 retries: HTTP 429: The usage limit has been reached"),
    "",
  );
});

test("sanitizeHermesDiagnosticDelta hides known benign startup noise", () => {
  assert.equal(sanitizeHermesDiagnosticDelta("MemPalace MCP Server starting...\n"), "");
  assert.equal(sanitizeHermesDiagnosticDelta("MemPalace MCP Server starting...\nMemPalace MCP Server starting...\n"), "");
});

test("sanitizeHermesDiagnosticDelta preserves real diagnostic errors", () => {
  assert.equal(
    sanitizeHermesDiagnosticDelta("API call failed after 3 retries: HTTP 429: The usage limit has been reached\n"),
    "API call failed after 3 retries: HTTP 429: The usage limit has been reached\n",
  );
});
