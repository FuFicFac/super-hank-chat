"use client";

import { ChatHeader } from "@/components/chat/chat-header";
import { Composer } from "@/components/chat/composer";
import { EmptyState } from "@/components/chat/empty-state";
import { MessageList } from "@/components/chat/message-list";
import { SessionSidebar } from "@/components/chat/session-sidebar";
import { TypingStream } from "@/components/chat/typing-stream";
import type { ConnectionUiState } from "@/components/chat/connection-pill";
import type { ApiSessionSummary } from "@/types/api";
import type { UiMessage } from "@/types/chat";

type Props = {
  sessionId: string;
  title: string;
  sessions: ApiSessionSummary[];
  sessionsLoading?: boolean;
  messages: UiMessage[];
  connection: ConnectionUiState;
  headerBusy?: boolean;
  composerDisabled?: boolean;
  typing?: boolean;
  diagnostics?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onSend: (text: string) => void | Promise<void>;
  onCreateSession: () => void;
  creatingSession?: boolean;
};

export function ChatShell(props: Props) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <div className="hidden md:flex">
        <SessionSidebar
          sessions={props.sessions}
          activeId={props.sessionId}
          loading={props.sessionsLoading}
          onCreate={props.onCreateSession}
          creating={props.creatingSession}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatHeader
          title={props.title}
          connection={props.connection}
          busy={props.headerBusy}
          onConnect={props.onConnect}
          onDisconnect={props.onDisconnect}
          diagnostics={props.diagnostics}
        />
        <div className="flex min-h-0 flex-1 flex-col bg-surface">
          {props.messages.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="Connect to Hermes, then send a prompt. Your history is saved locally in SQLite."
            />
          ) : (
            <MessageList messages={props.messages} />
          )}
          <TypingStream visible={Boolean(props.typing)} />
        </div>
        <Composer
          disabled={props.composerDisabled}
          onSend={props.onSend}
          placeholder={
            props.connection === "connected"
              ? "Ask Hank anything…"
              : "Connect to Hank to send messages"
          }
        />
      </div>
    </div>
  );
}
