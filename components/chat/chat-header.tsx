"use client";

import { useTheme } from "next-themes";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import type { ConnectionUiState } from "@/components/chat/connection-pill";
import { UiThemeToggle } from "@/components/layout/ui-theme-toggle";

type Props = {
  title: string;
  sessionCode: string;
  messageCount: number;
  connection: ConnectionUiState;
  busy?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  diagnostics?: string | null;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  speaking?: boolean;
};

function useUptime(running: boolean): string {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!running) { setS(0); return; }
    const t = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function useTtsBars(active: boolean, n = 5): number[] {
  const [t, setT] = useState(0);
  const rafRef = useRef(0);
  useEffect(() => {
    if (!active) return;
    const loop = () => {
      setT((x) => x + 0.12);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);
  return Array.from({ length: n }, (_, i) => {
    if (!active) return 0.15;
    return 0.25 + (Math.sin(t * (1 + i * 0.3) + i) * 0.5 + 0.5) * 0.75;
  });
}

const connColor: Record<ConnectionUiState, string> = {
  disconnected: "var(--d-disconnect)",
  connecting:   "var(--d-blue)",
  connected:    "var(--d-green)",
  error:        "var(--c-danger, #e05a3a)",
};

const connLabel: Record<ConnectionUiState, string> = {
  disconnected: "Offline",
  connecting: "Connecting",
  connected: "Connected",
  error: "Error",
};

export function ChatHeader({
  title,
  sessionCode,
  messageCount,
  connection,
  busy,
  onConnect,
  onDisconnect,
  diagnostics,
  voiceEnabled,
  onToggleVoice,
  speaking,
}: Props) {
  const { theme, setTheme } = useTheme();
  const isLight = theme === "light";
  const isLive = connection === "connected";
  const uptime = useUptime(isLive);
  const bars = useTtsBars(speaking ?? false, 5);

  const cycleConnection = () => {
    if (busy) return;
    if (connection === "disconnected" || connection === "error") {
      onConnect();
    } else if (connection === "connected") {
      onDisconnect();
    }
  };

  const dotColor = connColor[connection];

  return (
    <header className="chat-header">
      <div className="chat-header-mark" aria-hidden>H</div>
      {/* Session info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="chat-header-meta">
          <span style={{ color: "var(--d-green)" }}>{sessionCode}</span>
          <span>·</span>
          <span>{messageCount} messages</span>
        </div>
        <div className="chat-header-title">
          <span className="classroom-only">Super Hank Chat</span>
          <span className="dispatch-only">{title}</span>
        </div>
      </div>

      {/* Dark/Light toggle */}
      <button
        type="button"
        onClick={() => setTheme(isLight ? "dark" : "light")}
        title={`switch to ${isLight ? "dark" : "light"} mode`}
        className="segmented-toggle classroom-button"
      >
        <span data-active={!isLight}>Dark</span>
        <span data-active={isLight}>Light</span>
      </button>

      <UiThemeToggle />

      {/* Connection pill */}
      <button
        type="button"
        onClick={cycleConnection}
        disabled={busy || connection === "connecting"}
        title={isLive ? "click to disconnect" : "click to connect"}
        className="connection-action classroom-button"
        style={{
          "--conn-color": isLive ? "var(--d-outline-ink)" : dotColor,
          "--conn-border": isLive ? "var(--d-outline)" : dotColor,
          "--conn-bg": isLive ? "var(--d-outline-bg)" : "transparent",
          cursor: busy || connection === "connecting" ? "not-allowed" : "pointer",
          opacity: busy ? 0.6 : 1,
        } as CSSProperties}
        aria-live="polite"
      >
        <span
          className="connection-dot"
          style={{
            boxShadow: isLive ? `0 0 6px ${dotColor}` : "none",
            animation: connection === "connecting" ? "dispatchBlink 0.9s infinite" : "none",
          }}
        />
        <span>{connLabel[connection]}</span>
        {isLive && (
          <span style={{ color: "var(--d-mute)", marginLeft: 4 }}>{uptime}</span>
        )}
      </button>

      {/* TTS toggle */}
      {onToggleVoice && (
        <button
          type="button"
          onClick={onToggleVoice}
          title={voiceEnabled ? "TTS on — click to disable" : "TTS off — click to enable"}
          className="voice-toggle classroom-button"
          style={{
            "--voice-border": voiceEnabled ? "var(--d-outline)" : "var(--d-rule2)",
            "--voice-bg": voiceEnabled ? "var(--d-outline-bg)" : "transparent",
            "--voice-color": voiceEnabled ? "var(--d-outline-ink)" : "var(--d-mute)",
          } as CSSProperties}
          aria-pressed={voiceEnabled}
        >
          <span style={{ display: "inline-flex", gap: 2, alignItems: "end", height: 12 }}>
            {bars.map((b, i) => (
              <span key={i} style={{
                width: 2,
                height: `${b * 12}px`,
                background: voiceEnabled ? "var(--d-green)" : "var(--d-mute3)",
                transition: "height 80ms linear",
                minHeight: 2,
              }} />
            ))}
          </span>
          <span>{voiceEnabled ? "TTS · On" : "TTS · Off"}</span>
        </button>
      )}

      {/* Diagnostics */}
      {diagnostics && (
        <div className="diagnostics-banner">
          {diagnostics}
        </div>
      )}
    </header>
  );
}
