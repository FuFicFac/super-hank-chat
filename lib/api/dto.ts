import type { ChatMessageRow, ChatSessionRow } from "@/lib/db/schema";
import type { ApiMessage, ApiSessionDetail, ApiSessionSummary } from "@/types/api";
import type { SessionListItem } from "@/lib/db/repositories/sessions-repository";

export function toSessionSummary(row: SessionListItem): ApiSessionSummary {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    updatedAt: row.updatedAt,
    messageCount: row.messageCount,
  };
}

export function toSessionDetail(row: ChatSessionRow): ApiSessionDetail {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
  };
}

export function toApiMessage(row: ChatMessageRow): ApiMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    status: row.status,
    createdAt: row.createdAt,
  };
}
