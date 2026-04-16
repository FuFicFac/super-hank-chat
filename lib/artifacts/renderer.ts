import type { ArtifactType } from "./schema";

/**
 * Converts artifact content into a full srcdoc string ready for a sandboxed iframe.
 *
 * - html: returned as-is (must be a complete self-contained HTML document)
 * - svg: wrapped in a minimal HTML shell that centers the SVG
 * - code: wrapped in a styled HTML shell with pre/code tags
 * - markdown: not rendered in iframe — handled by the prose renderer in the panel
 */
export function buildArtifactSrcdoc(type: ArtifactType, content: string): string {
  switch (type) {
    case "html":
      return content;

    case "svg":
      return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #fff; }
  svg { max-width: 100%; max-height: 100%; }
</style>
</head>
<body>${content}</body>
</html>`;

    case "code":
      return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: monospace; font-size: 13px; background: #f6f8fa; padding: 16px; }
  pre { white-space: pre-wrap; word-break: break-word; }
</style>
</head>
<body>
<pre><code>${escapeHtml(content)}</code></pre>
<script>hljs.highlightAll();</script>
</body>
</html>`;

    default:
      return `<!DOCTYPE html><html><body><pre>${escapeHtml(content)}</pre></body></html>`;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
