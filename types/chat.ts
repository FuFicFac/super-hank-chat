export type ChatMessageRole = "user" | "assistant" | "system" | "status";

export type UiMessage = {
  id: string;
  role: ChatMessageRole | string;
  content: string;
  status: string;
  createdAt: number;
  streaming?: boolean;
};
