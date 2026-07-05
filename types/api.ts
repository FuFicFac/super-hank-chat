import type { Artifact } from "@/lib/artifacts/schema";

export type ApiSessionSummary = {
  id: string;
  title: string;
  status: string;
  updatedAt: number;
  messageCount: number;
  agentId: string | null;
};

export type ApiSessionDetail = {
  id: string;
  title: string;
  status: string;
  agentId: string | null;
};

export type ApiMessage = {
  id: string;
  role: string;
  content: string;
  status: string;
  createdAt: number;
  artifact?: Artifact | null;
  /** Hank's reasoning/thinking, shown in a collapsible dropdown. */
  thinking?: string | null;
};
