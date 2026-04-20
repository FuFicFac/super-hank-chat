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
import { useCallback, useEffect, useRef, useState } from "react";

/** Derive a stable HNK-XXXX code from a session ID. */
function sessionCode(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) >>> 0;
  }
  return "HNK-" + String(h % 10000).padStart(4, "0");
}

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
  onSessionDeleted?: () => void;
  currentArtifact: Artifact | null;
  onCloseArtifact: () => void;
  onViewArtifact: (artifact: Artifact) => void;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  onSpeak?: (text: string) => void;
  voiceSpeaking?: boolean;
};

const PALETTE_COMMANDS = [
  { icon: "⏎", label: "New session",              kbd: "⌘N",  action: "new" },
  { icon: "◉", label: "Toggle mic",               kbd: "⌘/",  action: "mic" },
  { icon: "⇌", label: "Reconnect to Hermes",      kbd: "⌘R",  action: "reconnect" },
  { icon: "▦", label: "Open artifact workbench",  kbd: "⌘A",  action: "artifact" },
  { icon: "↓", label: "Export thread as markdown", kbd: "⌘E", action: "export" },
];

const DEFAULT_ARTIFACT_WIDTH = 480; // px
const MIN_ARTIFACT_WIDTH = 320;
const MIN_CHAT_WIDTH = 340;

export function ChatShell(props: Props) {
  const hasArtifact = props.currentArtifact != null;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [artifactWidth, setArtifactWidth] = useState(DEFAULT_ARTIFACT_WIDTH);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const currentSession = props.sessions.find((s) => s.id === props.sessionId);
  const code = sessionCode(props.sessionId);
  const msgCount = currentSession?.messageCount ?? props.messages.length;

  // Reset width when artifact closes/opens
  useEffect(() => {
    if (!hasArtifact) return;
    // Clamp to sensible default on open
    const containerWidth = containerRef.current?.offsetWidth ?? 900;
    const clamped = Math.min(DEFAULT_ARTIFACT_WIDTH, containerWidth - MIN_CHAT_WIDTH);
    setArtifactWidth(Math.max(MIN_ARTIFACT_WIDTH, clamped));
  }, [hasArtifact]);

  const onDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    // Artifact panel is on the right; x from right edge
    const newWidth = rect.right - e.clientX;
    const maxWidth = containerWidth - MIN_CHAT_WIDTH;
    setArtifactWidth(Math.max(MIN_ARTIFACT_WIDTH, Math.min(maxWidth, newWidth)));
  }, []);

  const onDragEnd = useCallback(() => {
    dragging.current = false;
  }, []);

  // ⌘K global shortcut
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const handlePaletteAction = (action: string) => {
    setPaletteOpen(false);
    if (action === "new") props.onCreateSession();
    if (action === "reconnect") {
      props.onDisconnect();
      setTimeout(() => props.onConnect(), 300);
    }
  };

  return (
    <div style={{
      display: "flex",
      flex: 1,
      minHeight: 0,
      flexDirection: "row",
      background: "var(--d-bg)",
      color: "var(--d-ink)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Left rail */}
      <SessionSidebar
        sessions={props.sessions}
        activeId={props.sessionId}
        loading={props.sessionsLoading}
        onCreate={props.onCreateSession}
        creating={props.creatingSession}
        onDeleted={props.onSessionDeleted}
      />

      {/* Center + Artifact */}
      <div
        ref={containerRef}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerLeave={onDragEnd}
        style={{
          display: "flex",
          flexDirection: "row",
          flex: 1,
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {/* Chat column */}
        <section style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: MIN_CHAT_WIDTH,
          minHeight: 0,
          position: "relative",
        }}>
          <ChatHeader
            title={props.title}
            sessionCode={code}
            messageCount={msgCount}
            connection={props.connection}
            busy={props.headerBusy}
            onConnect={props.onConnect}
            onDisconnect={props.onDisconnect}
            diagnostics={props.diagnostics}
            voiceEnabled={props.voiceEnabled}
            onToggleVoice={props.onToggleVoice}
            speaking={props.voiceSpeaking}
          />

          {props.messages.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="Connect to Hermes, then send a prompt. History is saved locally."
            />
          ) : (
            <MessageList
              messages={props.messages}
              onViewArtifact={props.onViewArtifact}
              onSpeak={props.onSpeak}
              speaking={props.voiceSpeaking}
            />
          )}

          <TypingStream visible={Boolean(props.typing)} />

          <Composer
            disabled={props.composerDisabled}
            onSend={props.onSend}
            voiceEnabled={props.voiceEnabled}
            speaking={props.voiceSpeaking}
            artifactOpen={hasArtifact}
          />
        </section>

        {/* Drag handle + Artifact workbench */}
        {hasArtifact && props.currentArtifact && (
          <>
            {/* Drag handle */}
            <div
              onPointerDown={onDragStart}
              style={{
                width: 6,
                flexShrink: 0,
                cursor: "col-resize",
                background: "var(--d-rule)",
                position: "relative",
                zIndex: 2,
                transition: "background 120ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--d-green)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--d-rule)")}
            >
              {/* Grip dots */}
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                gap: 3,
                pointerEvents: "none",
              }}>
                {[0,1,2].map((i) => (
                  <div key={i} style={{
                    width: 2,
                    height: 2,
                    borderRadius: "50%",
                    background: "var(--d-mute3)",
                  }} />
                ))}
              </div>
            </div>

            <div style={{ width: artifactWidth, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <ArtifactPanel
                artifact={props.currentArtifact}
                sessionId={props.sessionId}
                onClose={props.onCloseArtifact}
              />
            </div>
          </>
        )}
      </div>

      {/* ⌘K Command Palette */}
      {paletteOpen && (
        <div
          onClick={() => setPaletteOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            background: "var(--d-palette-shadow)",
            display: "grid",
            placeItems: "start center",
            paddingTop: 120,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 520,
              background: "var(--d-bg)",
              border: "1px solid var(--d-outline)",
              color: "var(--d-ink)",
            }}
          >
            {/* Palette header */}
            <div style={{
              background: "var(--d-green)",
              color: "var(--d-on-accent)",
              padding: "6px 14px",
              fontSize: 10,
              letterSpacing: 2,
            }}>
              ⌘K · COMMAND PALETTE
            </div>
            {/* Search input */}
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--d-rule)" }}>
              <input
                autoFocus
                placeholder="type a command or session code…"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--d-ink)",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              />
            </div>
            {/* Commands */}
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {PALETTE_COMMANDS.map(({ icon, label, kbd, action }, idx) => (
                <button
                  key={action}
                  onClick={() => handlePaletteAction(action)}
                  style={{
                    width: "100%",
                    padding: "9px 14px",
                    display: "grid",
                    gridTemplateColumns: "24px 1fr auto",
                    alignItems: "center",
                    background: idx === 0 ? "var(--d-bg-row-hot)" : "transparent",
                    borderLeft: idx === 0 ? "2px solid var(--d-structure)" : "2px solid transparent",
                    border: "none",
                    borderBottom: "1px solid var(--d-rule3)",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--d-ink)",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ color: "var(--d-green)", fontSize: 12 }}>{icon}</span>
                  <span style={{
                    fontFamily: "var(--font-serif, Newsreader, Georgia, serif)",
                    fontSize: 14,
                  }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--d-blue)", letterSpacing: 1.2 }}>{kbd}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
