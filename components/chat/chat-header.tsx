"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { ConnectionUiState } from "@/components/chat/connection-pill";

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
  const rafRef = { current: 0 };
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

const CONN_ORDER: ConnectionUiState[] = ["disconnected", "connecting", "connected", "error"];

const connColor: Record<ConnectionUiState, string> = {
  disconnected: "var(--d-disconnect)",
  connecting:   "var(--d-blue)",
  connected:    "var(--d-green)",
  error:        "#e05a3a",
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
    <header style={{
      padding: "14px 24px",
      borderBottom: "1px solid var(--d-rule)",
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "var(--d-bg)",
      flexShrink: 0,
    }}>
      {/* Session info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 10,
          color: "var(--d-mute2)",
          letterSpacing: 1.6,
          display: "flex",
          gap: 10,
        }}>
          <span style={{ color: "var(--d-green)" }}>{sessionCode}</span>
          <span>·</span>
          <span>{messageCount} MSG</span>
        </div>
        <div style={{
          fontFamily: "var(--font-serif, Newsreader, Georgia, serif)",
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: -0.3,
          color: "var(--d-ink2)",
          marginTop: 3,
          lineHeight: 1.15,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {title}
        </div>
      </div>

      {/* Dark/Light toggle */}
      <button
        onClick={() => setTheme(isLight ? "dark" : "light")}
        title={`switch to ${isLight ? "dark" : "light"} mode`}
        style={{
          display: "flex",
          alignItems: "center",
          border: "1px solid var(--d-rule2)",
          background: "transparent",
          padding: 0,
          fontFamily: "inherit",
          fontSize: 10,
          letterSpacing: 1.4,
          cursor: "pointer",
          color: "var(--d-mute)",
          flexShrink: 0,
        }}
      >
        <span style={{
          padding: "6px 9px",
          background: !isLight ? "var(--d-green)" : "transparent",
          color: !isLight ? "var(--d-on-accent)" : "var(--d-mute)",
        }}>DARK</span>
        <span style={{
          padding: "6px 9px",
          background: isLight ? "var(--d-green)" : "transparent",
          color: isLight ? "var(--d-on-accent)" : "var(--d-mute)",
          borderLeft: "1px solid var(--d-rule2)",
        }}>LIGHT</span>
      </button>

      {/* Connection pill */}
      <button
        onClick={cycleConnection}
        disabled={busy || connection === "connecting"}
        title={isLive ? "click to disconnect" : "click to connect"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          border: `1px solid ${isLive ? "var(--d-outline)" : dotColor}`,
          background: isLive ? "var(--d-outline-bg)" : "transparent",
          color: isLive ? "var(--d-outline-ink)" : dotColor,
          fontSize: 10,
          letterSpacing: 1.6,
          cursor: busy || connection === "connecting" ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
          opacity: busy ? 0.6 : 1,
        }}
        aria-live="polite"
      >
        <span style={{
          width: 6, height: 6,
          borderRadius: "50%",
          background: dotColor,
          boxShadow: isLive ? `0 0 6px ${dotColor}` : "none",
          animation: connection === "connecting" ? "dispatchBlink 0.9s infinite" : "none",
          flexShrink: 0,
        }} />
        <span>{connection.toUpperCase()}</span>
        {isLive && (
          <span style={{ color: "var(--d-mute)", marginLeft: 4 }}>{uptime}</span>
        )}
      </button>

      {/* TTS toggle */}
      {onToggleVoice && (
        <button
          onClick={onToggleVoice}
          title={voiceEnabled ? "TTS on — click to disable" : "TTS off — click to enable"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            border: `1px solid ${voiceEnabled ? "var(--d-outline)" : "var(--d-rule2)"}`,
            background: voiceEnabled ? "var(--d-outline-bg)" : "transparent",
            color: voiceEnabled ? "var(--d-outline-ink)" : "var(--d-mute)",
            fontSize: 10,
            letterSpacing: 1.6,
            cursor: "pointer",
            fontFamily: "inherit",
            flexShrink: 0,
          }}
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
          <span>{voiceEnabled ? "TTS · ON" : "TTS · OFF"}</span>
        </button>
      )}

      {/* Diagnostics */}
      {diagnostics && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          background: "rgba(224, 90, 58, 0.12)",
          borderBottom: "1px solid rgba(224, 90, 58, 0.4)",
          padding: "6px 24px",
          fontSize: 10,
          color: "#e05a3a",
          fontFamily: "var(--font-mono, monospace)",
          letterSpacing: 0.5,
          maxHeight: 80,
          overflowY: "auto",
          zIndex: 5,
        }}>
          {diagnostics}
        </div>
      )}
    </header>
  );
}
