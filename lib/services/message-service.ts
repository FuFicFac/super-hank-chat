import type { HankDatabase } from "@/lib/db/client";
import { getDb } from "@/lib/db/client";
import {
  insertMessage,
  listMessagesForSession,
} from "@/lib/db/repositories/messages-repository";
import { touchSession } from "@/lib/db/repositories/sessions-repository";
import type { ApiMessage } from "@/types/api";
import { toVisibleHermesAssistantContent } from "@/lib/hermes/query-output";

export function listMessagesService(sessionId: string): ApiMessage[] {
  const rows = listMessagesForSession(getDb(), sessionId);
  return rows.flatMap((m) => {
    const content =
      m.role === "assistant" ? toVisibleHermesAssistantContent(m.content) : m.content;
    if (m.role === "assistant" && !content) return [];
    return [{
      id: m.id,
      role: m.role,
      content,
      status: m.status,
      createdAt: m.createdAt,
    }];
  });
}

export function persistUserMessage(
  db: HankDatabase,
  sessionId: string,
  content: string,
) {
  const msg = insertMessage(db, {
    sessionId,
    role: "user",
    content,
    status: "complete",
  });
  touchSession(db, sessionId);
  return msg;
}
