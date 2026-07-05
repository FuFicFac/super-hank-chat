import type { Artifact } from "@/lib/artifacts/schema";

export type ChatMessageRole = "user" | "assistant" | "system" | "status";

export type UiMessage = {
  id: string;
  role: ChatMessageRole | string;
  content: string;
  status: string;
  createdAt: number;
  streaming?: boolean;
  /** Parsed artifact attached to this message, if any */
  artifact?: Artifact | null;
  /** Hank's reasoning/thinking for this message, shown collapsibly */
  thinking?: string | null;
};
