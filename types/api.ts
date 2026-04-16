import type { Artifact } from "@/lib/artifacts/schema";

export type ApiSessionSummary = {
  id: string;
  title: string;
  status: string;
  updatedAt: number;
  messageCount: number;
};

export type ApiSessionDetail = {
  id: string;
  title: string;
  status: string;
};

export type ApiMessage = {
  id: string;
  role: string;
  content: string;
  status: string;
  createdAt: number;
  artifact?: Artifact | null;
};
