import { getDb } from "@/lib/db/client";
import {
  createSession,
  getSessionById,
  listSessions,
  type SessionListItem,
} from "@/lib/db/repositories/sessions-repository";
import type { ApiSessionDetail } from "@/types/api";

export function listSessionsService(): SessionListItem[] {
  return listSessions(getDb());
}

export function getSessionDetail(sessionId: string): ApiSessionDetail | null {
  const row = getSessionById(getDb(), sessionId);
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
  };
}

export function createSessionService(input: { title?: string }) {
  return createSession(getDb(), input);
}
