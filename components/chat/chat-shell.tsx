"use client";

import { ArtifactPanel } from "@/components/artifact/artifact-panel";
import { ChatHeader } from "@/components/chat/chat-header";
import { Composer } from "@/components/chat/composer";
import { EmptyState } from "@/components/chat/empty-state";
import { MessageList } from "@/components/chat/message-list";
import { SessionSidebar } from "@/components/chat/session-sidebar";
import { TypingStream } from "@/components/chat/typing-stream";
import type { ConnectionUiState } from "@/components/chat/connection-pill";
import type { Artifact } from "@/lib/artifacts/schema";
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
  currentArtifact: Artifact | null;
  onCloseArtifact: () => void;
  onViewArtifact: (artifact: Artifact) => void;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  onSpeak?: (text: string) => void;
};

export function ChatShell(props: Props) {
  const hasArtifact = props.currentArtifact != null;
  return (
    <div className="flex flex-1 min-h-0 flex-row">
      <div className="flex shrink-0">
        <SessionSidebar
          sessions={props.sessions}
          activeId={props.sessionId}
          loading={props.sessionsLoading}
          onCreate={props.onCreateSession}
          creating={props.creatingSession}
        />
      </div>
      <div
        className={`flex min-h-0 min-w-0 flex-col overflow-hidden ${hasArtifact ? "md:w-[55%]" : "flex-1"}`}
      >
        <ChatHeader
          title={props.title}
          connection={props.connection}
          busy={props.headerBusy}
          onConnect={props.onConnect}
          onDisconnect={props.onDisconnect}
          diagnostics={props.diagnostics}
          voiceEnabled={props.voiceEnabled}
          onToggleVoice={props.onToggleVoice}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
          {props.messages.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="Connect to Hermes, then send a prompt. Your history is saved locally in SQLite."
            />
          ) : (
            <MessageList
              messages={props.messages}
              onViewArtifact={props.onViewArtifact}
              onSpeak={props.onSpeak}
            />
          )}
          <TypingStream visible={Boolean(props.typing)} />
        </div>
        <Composer
          disabled={props.composerDisabled}
          onSend={props.onSend}
          voiceEnabled={props.voiceEnabled}
          placeholder={
            props.connection === "connected"
              ? "Ask Hank anything…"
              : "Connect to Hank to send messages"
          }
        />
      </div>
      {hasArtifact && props.currentArtifact ? (
        <div className="hidden min-h-0 md:flex md:w-[45%] md:flex-col border-l border-zinc-200 dark:border-zinc-700">
          <ArtifactPanel
            artifact={props.currentArtifact}
            onClose={props.onCloseArtifact}
          />
        </div>
      ) : null}
    </div>
  );
}
