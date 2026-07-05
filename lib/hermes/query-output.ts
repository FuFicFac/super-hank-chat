const HERMES_HEADER_RE = /^╭─\s*⚕\s*Hermes\b.*$/u;
/** Exported for streaming: detect end-of-response line in Hermes quiet mode. */
export const HERMES_SESSION_ID_RE = /^session_id:\s*(\S+)\s*$/i;
const HERMES_RESUME_RE = /^↻\s+Resumed session\b.*$/u;
const BENIGN_STDERR_LINE_RES = [
  /^MemPalace MCP Server starting\.\.\.\s*$/i,
  /^session_id:\s*\S+\s*$/i,
];
const STDOUT_ERROR_LINE_RES = [/^API call failed after \d+ retries:/i];

export type HermesQueryResult = {
  content: string;
  error: string | null;
  sessionId: string | null;
};

export function normalizeNewlines(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function collapseDuplicateParagraphs(text: string): string {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  const deduped: string[] = [];
  for (const paragraph of paragraphs) {
    if (deduped[deduped.length - 1] === paragraph) continue;
    deduped.push(paragraph);
  }

  return deduped.join("\n\n");
}

function collapseOverlappingRepeatedPrefix(text: string): string {
  const normalized = text.trim();
  const minOverlap = 32;

  for (let pos = 1; pos < normalized.length; pos += 1) {
    if (normalized[pos - 1] !== "\n") continue;
    let overlap = 0;
    while (
      pos + overlap < normalized.length &&
      normalized[overlap] === normalized[pos + overlap]
    ) {
      overlap += 1;
    }

    if (overlap >= minOverlap) {
      return normalized.slice(pos).trim();
    }
  }

  return normalized;
}

export function normalizeHermesAssistantContent(text: string): string {
  return collapseOverlappingRepeatedPrefix(collapseDuplicateParagraphs(text.trim()));
}

export function toVisibleHermesAssistantContent(text: string): string {
  return classifyStdoutContent(normalizeHermesAssistantContent(text)).content;
}

// ─── Reasoning / thinking segmentation ──────────────────────────────────────
// Hermes (with display.show_reasoning: true, reasoning_style: code) prepends a
// "┌─ Reasoning ─┐" box and a "Warning: Unknown toolsets: …" line before Hank's
// actual answer. In quiet (-Q) piped mode the box's bottom border ("└──┘") is
// NOT emitted, so there is no reliable reasoning-end marker. These helpers strip
// the noise and best-effort separate the answer from the thinking WITHOUT ever
// discarding the answer (thinking is shown collapsibly, so an imperfect split
// is recoverable — an empty answer is not, hence the fail-safes).

const REASONING_TOP_RE = /^┌─+\s*Reasoning\s*─*┐?$/u;
const REASONING_BOTTOM_RE = /^└─*┘?$/u;
const TOOL_TRACE_RE = /^┊/u;
const NOISE_LINE_RES = [
  /^Warning:\s*Unknown toolsets:.*$/i,
  /^MemPalace MCP Server starting\.\.\.\s*$/i,
];

function isNoiseLine(line: string): boolean {
  const t = line.trim();
  return NOISE_LINE_RES.some((re) => re.test(t));
}

function isBorderLine(line: string): boolean {
  const t = line.trim();
  return REASONING_TOP_RE.test(t) || REASONING_BOTTOM_RE.test(t);
}

export function extractToolActivity(text: string): string[] {
  const activities: string[] = [];
  for (const line of normalizeNewlines(text).split("\n")) {
    if (!TOOL_TRACE_RE.test(line.trim())) continue;
    const activity = line.trim().replace(TOOL_TRACE_RE, "").trim();
    if (!activity) continue;
    if (activities[activities.length - 1] === activity) continue;
    activities.push(activity);
  }
  return activities;
}

/** Strip warning/border noise from a streaming buffer while keeping text flowing. */
export function denoiseAssistantStream(text: string): string {
  return normalizeNewlines(text)
    .split("\n")
    .filter((line) => !isNoiseLine(line) && !isBorderLine(line) && !TOOL_TRACE_RE.test(line.trim()))
    .join("\n")
    .replace(/^\n+/, "");
}

export type AssistantView = { answer: string; thinking: string | null };

/** Split visible assistant content into the final answer and its thinking. */
export function splitAssistantSegments(text: string): AssistantView {
  const lines = normalizeNewlines(text ?? "").split("\n").filter((l) => !isNoiseLine(l));

  const startIdx = lines.findIndex(
    (l) => REASONING_TOP_RE.test(l.trim()) || TOOL_TRACE_RE.test(l.trim()),
  );
  if (startIdx === -1) {
    return { answer: lines.join("\n").trim(), thinking: null };
  }

  const pre = lines.slice(0, startIdx).join("\n").trim();
  const region = lines.slice(startIdx);
  const botIdx = region.findIndex((l) => REASONING_BOTTOM_RE.test(l.trim()));

  let answer: string;
  let thinking: string;

  if (botIdx >= 0) {
    // Explicit close border present: clean split.
    thinking = region.slice(0, botIdx).filter((l) => !isBorderLine(l)).join("\n").trim();
    const after = region.slice(botIdx + 1).filter((l) => !isBorderLine(l)).join("\n").trim();
    answer = [pre, after].filter(Boolean).join("\n\n").trim();
  } else {
    // No close border (common in -Q mode). Fall back to block/line heuristics.
    const regionText = region.filter((l) => !isBorderLine(l)).join("\n").trim();
    const blocks = regionText.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    if (blocks.length >= 2) {
      answer = blocks[blocks.length - 1];
      thinking = blocks.slice(0, -1).join("\n\n");
    } else {
      // Single block: reasoning glued to the answer by single newlines.
      const blockLines = regionText.split("\n").map((l) => l.trim()).filter(Boolean);
      if (blockLines.length >= 2) {
        answer = blockLines[blockLines.length - 1];
        thinking = blockLines.slice(0, -1).join("\n");
      } else {
        answer = regionText;
        thinking = "";
      }
    }
    if (pre) answer = [pre, answer].filter(Boolean).join("\n\n").trim();
  }

  thinking = normalizeHermesAssistantContent(thinking);

  // Fail-safe: never surface an empty answer while there is content to show.
  if (!answer.trim()) {
    const fallback = region.filter((l) => !isBorderLine(l)).join("\n").trim() || lines.join("\n").trim();
    return { answer: fallback, thinking: null };
  }

  return { answer: answer.trim(), thinking: thinking.trim() || null };
}

/** Full pipeline: raw persisted/streamed content → { answer, thinking }. */
export function toAssistantView(text: string): AssistantView {
  return splitAssistantSegments(toVisibleHermesAssistantContent(text));
}

function classifyStdoutContent(content: string): { content: string; error: string | null } {
  if (!content) return { content: "", error: null };

  if (STDOUT_ERROR_LINE_RES.some((re) => re.test(content))) {
    return { content: "", error: content };
  }

  return { content, error: null };
}

export function sanitizeHermesDiagnosticDelta(delta: string): string {
  const lines = normalizeNewlines(delta).split("\n");
  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return !BENIGN_STDERR_LINE_RES.some((re) => re.test(trimmed));
  });

  return kept.length > 0 ? `${kept.join("\n")}\n` : "";
}

export function extractHermesQueryResult(raw: string): HermesQueryResult {
  const lines = normalizeNewlines(raw).split("\n");
  const kept: string[] = [];
  let sessionId: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      kept.push("");
      continue;
    }

    const sessionIdMatch = trimmed.match(HERMES_SESSION_ID_RE);
    if (sessionIdMatch) {
      sessionId = sessionIdMatch[1] ?? null;
      continue;
    }

    if (HERMES_HEADER_RE.test(trimmed)) continue;
    if (HERMES_RESUME_RE.test(trimmed)) continue;

    kept.push(line);
  }

  const normalized = normalizeHermesAssistantContent(kept.join("\n").trim());
  const classified = classifyStdoutContent(normalized);
  return { ...classified, sessionId };
}
