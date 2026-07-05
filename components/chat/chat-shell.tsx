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
import type { AgentProfile } from "@/lib/agents/profiles";
import type { ApiSessionSummary } from "@/types/api";
import type { UiMessage } from "@/types/chat";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  agent: AgentProfile;
  messages: UiMessage[];
  connection: ConnectionUiState;
  headerBusy?: boolean;
  composerDisabled?: boolean;
  typing?: boolean;
  toolActivity?: string | null;
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
  onExportMarkdown: () => void;
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
  const router = useRouter();
  const hasArtifact = props.currentArtifact != null;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [artifactWidth, setArtifactWidth] = useState(DEFAULT_ARTIFACT_WIDTH);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const currentSession = props.sessions.find((s) => s.id === props.sessionId);
  const code = sessionCode(props.sessionId);
  const msgCount = currentSession?.messageCount ?? props.messages.length;
  const normalizedPaletteQuery = paletteQuery.trim().toLowerCase();
  const filteredCommands = useMemo(() => {
    if (!normalizedPaletteQuery) return PALETTE_COMMANDS;
    return PALETTE_COMMANDS.filter((command) =>
      command.label.toLowerCase().includes(normalizedPaletteQuery),
    );
  }, [normalizedPaletteQuery]);
  const filteredSessions = useMemo(() => {
    if (!normalizedPaletteQuery) return [];
    return props.sessions.filter((session) => {
      const code = sessionCode(session.id).toLowerCase();
      return (
        code.includes(normalizedPaletteQuery) ||
        session.title.toLowerCase().includes(normalizedPaletteQuery)
      );
    });
  }, [normalizedPaletteQuery, props.sessions]);

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
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const closePalette = () => {
    setPaletteOpen(false);
    setPaletteQuery("");
  };

  const handlePaletteAction = (action: string) => {
    closePalette();
    if (action === "new") props.onCreateSession();
    if (action === "mic") props.onToggleVoice?.();
    if (action === "reconnect") {
      props.onDisconnect();
      setTimeout(() => props.onConnect(), 300);
    }
    if (action === "artifact" && hasArtifact) {
      return;
    }
    if (action === "export") props.onExportMarkdown();
  };

  const handlePaletteSession = (sessionId: string) => {
    closePalette();
    router.push(`/sessions/${sessionId}`);
  };

  const handlePaletteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const firstCommand = filteredCommands[0];
    if (firstCommand) {
      e.preventDefault();
      handlePaletteAction(firstCommand.action);
      return;
    }
    const firstSession = filteredSessions[0];
    if (firstSession) {
      e.preventDefault();
      handlePaletteSession(firstSession.id);
    }
  };

  return (
    <div
      className="chat-shell"
    >
      {/* Left rail */}
      {sidebarOpen && (
        <button
          type="button"
          className="mobile-sidebar-scrim"
          aria-label="Close sessions"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="sidebar-drawer" data-open={sidebarOpen}>
        <SessionSidebar
          sessions={props.sessions}
          activeId={props.sessionId}
          loading={props.sessionsLoading}
          onCreate={props.onCreateSession}
          creating={props.creatingSession}
          onDeleted={props.onSessionDeleted}
          onSelect={() => setSidebarOpen(false)}
        />
      </div>

      {/* Center + Artifact */}
      <div
        className="chat-workspace"
        ref={containerRef}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerLeave={onDragEnd}
      >
        {/* Chat column */}
        <section className="chat-column">
          <ChatHeader
            title={props.title}
            sessionCode={code}
            messageCount={msgCount}
            connection={props.connection}
            busy={props.headerBusy}
            onConnect={props.onConnect}
            onDisconnect={props.onDisconnect}
            diagnostics={props.diagnostics}
            agent={props.agent}
            voiceEnabled={props.voiceEnabled}
            onToggleVoice={props.onToggleVoice}
            speaking={props.voiceSpeaking}
            thinking={props.typing}
            onToggleSidebar={() => setSidebarOpen(true)}
          />

          {props.messages.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="Connect to Hermes, then send a prompt. History is saved locally."
            />
          ) : (
            <MessageList
              messages={props.messages}
              agent={props.agent}
              onViewArtifact={props.onViewArtifact}
              onSpeak={props.onSpeak}
              speaking={props.voiceSpeaking}
            />
          )}

          <TypingStream
            visible={Boolean(props.typing)}
            agentName={props.agent.name}
            toolActivity={props.toolActivity}
          />

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
              className="artifact-resize-handle"
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

            <div
              className="artifact-panel-shell"
              style={{ width: artifactWidth }}
            >
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
          onClick={closePalette}
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
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                onKeyDown={handlePaletteKeyDown}
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
              {filteredCommands.map(({ icon, label, kbd, action }, idx) => (
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
              {filteredSessions.length > 0 && (
                <div style={{
                  padding: "7px 14px 5px",
                  fontSize: 10,
                  letterSpacing: 1.6,
                  color: "var(--d-mute3)",
                  borderBottom: "1px solid var(--d-rule3)",
                }}>
                  SESSIONS
                </div>
              )}
              {filteredSessions.map((session) => {
                const code = sessionCode(session.id);
                const isActive = session.id === props.sessionId;
                return (
                  <button
                    key={session.id}
                    onClick={() => handlePaletteSession(session.id)}
                    style={{
                      width: "100%",
                      padding: "9px 14px",
                      display: "grid",
                      gridTemplateColumns: "76px 1fr",
                      alignItems: "center",
                      gap: 10,
                      background: isActive ? "var(--d-bg-row-hot)" : "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--d-rule3)",
                      cursor: "pointer",
                      textAlign: "left",
                      color: "var(--d-ink)",
                      fontFamily: "inherit",
                    }}
                  >
                    <span style={{ color: "var(--d-blue)", fontSize: 10, letterSpacing: 1.2 }}>
                      {code}
                    </span>
                    <span style={{
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontFamily: "var(--font-serif, Newsreader, Georgia, serif)",
                      fontSize: 14,
                    }}>
                      {session.title}
                    </span>
                  </button>
                );
              })}
              {filteredCommands.length === 0 && filteredSessions.length === 0 && (
                <div style={{ padding: "16px 14px", fontSize: 12, color: "var(--d-mute)" }}>
                  No commands or sessions
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
