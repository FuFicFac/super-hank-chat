import { getDb } from "@/lib/db/client";
import {
  searchMessages,
  type MessageSearchResult,
} from "@/lib/db/repositories/messages-repository";

export function searchService(query: string): MessageSearchResult[] {
  return searchMessages(getDb(), query);
}
