import { artifactSchema, type ParsedMessage } from "./schema";

/**
 * Matches an <artifact ...>...</artifact> block in a response string.
 *
 * Hank wraps generated artifacts in XML fencing:
 *   <artifact type="html" title="Snake Game" id="snake-v1">
 *     ...self-contained HTML/SVG/code...
 *   </artifact>
 *
 * Rules:
 * - Zero or one artifact per message (first match wins)
 * - Everything outside the tags is prose
 * - Malformed or invalid artifacts fall back to prose-only
 */
const ARTIFACT_TAG_RE =
  /<artifact\s([^>]*)>([\s\S]*?)<\/artifact>/i;

const ATTR_RE = /(\w+)="([^"]*)"/g;

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let match: RegExpExecArray | null;
  while ((match = ATTR_RE.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

export function parseMessageForArtifact(raw: string): ParsedMessage {
  const match = ARTIFACT_TAG_RE.exec(raw);

  if (!match) {
    return { prose: raw.trim(), artifact: null };
  }

  const attrString = match[1];
  const content = match[2];
  const attrs = parseAttributes(attrString);

  const parsed = artifactSchema.safeParse({
    type: attrs.type,
    title: attrs.title,
    id: attrs.id,
    language: attrs.language,
    content: content.trim(),
  });

  if (!parsed.success) {
    // Malformed artifact — treat entire message as prose
    return { prose: raw.trim(), artifact: null };
  }

  // Strip the artifact tag from the prose
  const prose = raw.replace(match[0], "").trim();

  return { prose, artifact: parsed.data };
}
