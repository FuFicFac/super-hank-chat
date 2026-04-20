import { getDb, initDbSingleton } from "@/lib/db/client";
import { listMessagesForSession } from "@/lib/db/repositories/messages-repository";
import { getSessionById } from "@/lib/db/repositories/sessions-repository";
import { parseMessageForArtifact } from "@/lib/artifacts/parser";
import { buildArtifactSrcdoc } from "@/lib/artifacts/renderer";
import { toVisibleHermesAssistantContent } from "@/lib/hermes/query-output";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  await initDbSingleton();
  const { sessionId } = await context.params;
  const db = getDb();

  if (!getSessionById(db, sessionId)) {
    return new Response("Session not found", { status: 404 });
  }

  // Walk messages newest-first to find the latest artifact
  const rows = listMessagesForSession(db, sessionId);
  let html: string | null = null;
  let artifactTitle = "Artifact";

  for (let i = rows.length - 1; i >= 0; i--) {
    const m = rows[i];
    if (m.role !== "assistant") continue;
    const visible = toVisibleHermesAssistantContent(m.content);
    const { artifact } = parseMessageForArtifact(visible);
    if (artifact) {
      html = buildArtifactSrcdoc(artifact.type, artifact.content);
      artifactTitle = artifact.title ?? artifactTitle;
      break;
    }
  }

  if (!html) {
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:monospace;padding:2rem;color:#888">
        <p>No artifact found in this session yet.</p>
        <p>Ask Hank to build something and refresh.</p>
      </body></html>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Artifact-Title": artifactTitle,
    },
  });
}
