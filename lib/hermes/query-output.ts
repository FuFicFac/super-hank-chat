const HERMES_HEADER_RE = /^╭─\s*⚕\s*Hermes\b.*$/u;
const HERMES_SESSION_ID_RE = /^session_id:\s*(\S+)\s*$/i;
const HERMES_RESUME_RE = /^↻\s+Resumed session\b.*$/u;
const BENIGN_STDERR_LINE_RES = [/^MemPalace MCP Server starting\.\.\.\s*$/i];
const STDOUT_ERROR_LINE_RES = [/^API call failed after \d+ retries:/i];

export type HermesQueryResult = {
  content: string;
  error: string | null;
  sessionId: string | null;
};

function normalizeNewlines(raw: string): string {
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

export function buildHermesQueryArgs(text: string, sessionId?: string | null): string[] {
  return sessionId
    ? ["--continue", sessionId, "chat", "-Q", "-q", text]
    : ["chat", "-Q", "-q", text];
}
