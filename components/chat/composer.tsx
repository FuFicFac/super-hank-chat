"use client";

import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

type Props = {
  disabled?: boolean;
  placeholder?: string;
  onSend: (text: string) => void | Promise<void>;
  voiceEnabled?: boolean;
  speaking?: boolean;
  artifactOpen?: boolean;
};

// ─── Slash commands ───────────────────────────────────────────────────────────

type SlashCommand = {
  cmd: string;
  args?: string;
  desc: string;
  category: string;
};

const SLASH_COMMANDS: SlashCommand[] = [
  // Session
  { cmd: "/agents",      desc: "Show active agents and running tasks",                                    category: "Session" },
  { cmd: "/background",  args: "<prompt>",          desc: "Run a prompt in the background",              category: "Session" },
  { cmd: "/bg",          args: "<prompt>",          desc: "Run a prompt in the background (alias for /background)", category: "Session" },
  { cmd: "/branch",      args: "[name]",            desc: "Branch the current session (explore a different path)", category: "Session" },
  { cmd: "/btw",         args: "<question>",        desc: "Ephemeral side question using session context (no tools, not persisted)", category: "Session" },
  { cmd: "/clear",       desc: "Clear screen and start a new session",                                    category: "Session" },
  { cmd: "/compress",    args: "[focus topic]",     desc: "Manually compress conversation context",       category: "Session" },
  { cmd: "/fork",        args: "[name]",            desc: "Branch the current session (alias for /branch)", category: "Session" },
  { cmd: "/history",     desc: "Show conversation history",                                               category: "Session" },
  { cmd: "/new",         desc: "Start a new session (fresh session ID + history)",                        category: "Session" },
  { cmd: "/q",           args: "<prompt>",          desc: "Queue a prompt for the next turn — doesn't interrupt (alias for /queue)", category: "Session" },
  { cmd: "/queue",       args: "<prompt>",          desc: "Queue a prompt for the next turn (doesn't interrupt)", category: "Session" },
  { cmd: "/reset",       desc: "Start a new session (alias for /new)",                                   category: "Session" },
  { cmd: "/resume",      args: "[name]",            desc: "Resume a previously-named session",            category: "Session" },
  { cmd: "/retry",       desc: "Retry the last message (resend to agent)",                                category: "Session" },
  { cmd: "/rollback",    args: "[number]",          desc: "List or restore filesystem checkpoints",       category: "Session" },
  { cmd: "/save",        desc: "Save the current conversation",                                           category: "Session" },
  { cmd: "/snap",        args: "[create|restore]",  desc: "Create or restore state snapshots (alias for /snapshot)", category: "Session" },
  { cmd: "/snapshot",    args: "[create|restore <id>|prune]", desc: "Create or restore state snapshots of Hermes config/state", category: "Session" },
  { cmd: "/status",      desc: "Show session info",                                                       category: "Session" },
  { cmd: "/steer",       args: "<prompt>",          desc: "Inject a message after the next tool call without interrupting", category: "Session" },
  { cmd: "/stop",        desc: "Kill all running background processes",                                   category: "Session" },
  { cmd: "/tasks",       desc: "Show active agents and running tasks (alias for /agents)",                category: "Session" },
  { cmd: "/title",       args: "[name]",            desc: "Set a title for the current session",          category: "Session" },
  { cmd: "/undo",        desc: "Remove the last user/assistant exchange",                                 category: "Session" },
  // Configuration
  { cmd: "/config",      desc: "Show current configuration",                                              category: "Config" },
  { cmd: "/fast",        args: "[normal|fast|status]", desc: "Toggle fast mode — OpenAI Priority Processing / Anthropic Fast Mode", category: "Config" },
  { cmd: "/model",       args: "[model] [--provider name] [--global]", desc: "Switch model for this session", category: "Config" },
  { cmd: "/personality", args: "[name]",            desc: "Set a predefined personality",                 category: "Config" },
  { cmd: "/provider",    desc: "Show available providers and current provider",                           category: "Config" },
  { cmd: "/reasoning",   args: "[level|show|hide]", desc: "Manage reasoning effort and display",          category: "Config" },
  { cmd: "/sb",          desc: "Toggle the context/model status bar (alias for /statusbar)",              category: "Config" },
  { cmd: "/skin",        args: "[name]",            desc: "Show or change the display skin/theme",        category: "Config" },
  { cmd: "/statusbar",   desc: "Toggle the context/model status bar",                                     category: "Config" },
  { cmd: "/verbose",     desc: "Cycle tool progress display: off → new → all → verbose",                 category: "Config" },
  { cmd: "/voice",       args: "[on|off|tts|status]", desc: "Toggle voice mode",                          category: "Config" },
  { cmd: "/yolo",        desc: "Toggle YOLO mode (skip all dangerous command approvals)",                 category: "Config" },
  // Info
  { cmd: "/copy",        args: "[number]",          desc: "Copy the last assistant response to clipboard", category: "Info" },
  { cmd: "/debug",       desc: "Upload debug report (system info + logs) and get shareable links",        category: "Info" },
  { cmd: "/gateway",     desc: "Show gateway/messaging platform status (alias for /platforms)",           category: "Info" },
  { cmd: "/gquota",      desc: "Show Google Gemini Code Assist quota usage",                              category: "Info" },
  { cmd: "/help",        desc: "Show available commands",                                                 category: "Info" },
  { cmd: "/image",       args: "<path>",            desc: "Attach a local image file for your next prompt", category: "Info" },
  { cmd: "/insights",    args: "[days]",            desc: "Show usage insights and analytics",            category: "Info" },
  { cmd: "/paste",       desc: "Attach clipboard image from your clipboard",                              category: "Info" },
  { cmd: "/platforms",   desc: "Show gateway/messaging platform status",                                  category: "Info" },
  { cmd: "/profile",     desc: "Show active profile name and home directory",                             category: "Info" },
  { cmd: "/usage",       desc: "Show token usage and rate limits for the current session",                category: "Info" },
  // Tools & Skills
  { cmd: "/browser",     args: "[connect|disconnect|status]", desc: "Connect browser tools to your live Chrome via CDP", category: "Tools" },
  { cmd: "/cron",        args: "[subcommand]",      desc: "Manage scheduled tasks",                       category: "Tools" },
  { cmd: "/plugins",     desc: "List installed plugins and their status",                                 category: "Tools" },
  { cmd: "/reload",      desc: "Reload .env variables into the running session",                          category: "Tools" },
  { cmd: "/reload-mcp",  desc: "Reload MCP servers from config",                                          category: "Tools" },
  { cmd: "/reload_mcp",  desc: "Reload MCP servers from config (alias for /reload-mcp)",                 category: "Tools" },
  { cmd: "/skills",      desc: "Search, install, inspect, or manage skills",                              category: "Tools" },
  { cmd: "/tools",       args: "[list|disable|enable] [name...]", desc: "Manage tools",                  category: "Tools" },
  { cmd: "/toolsets",    desc: "List available toolsets",                                                 category: "Tools" },
  // Exit
  { cmd: "/exit",        desc: "Exit the CLI (alias for /quit)",                                          category: "Exit" },
  { cmd: "/quit",        desc: "Exit the CLI",                                                            category: "Exit" },
];

const CATEGORY_ORDER = ["Session", "Config", "Info", "Tools", "Exit"];

// ─── Oscilloscope ─────────────────────────────────────────────────────────────

function useOscPath(active: boolean, width: number, height = 34): string {
  const [t, setT] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const loop = () => {
      setT((x) => x + 0.06);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const pts = 80;
  const mid = height / 2;
  let d = "";
  for (let i = 0; i < pts; i++) {
    const x = (i / (pts - 1)) * width;
    let y: number;
    if (!active) {
      y = mid;
    } else {
      const phase = t + i * 0.22;
      const env = Math.sin((i / pts) * Math.PI);
      y = mid + env * (
        Math.sin(phase) * 9 +
        Math.sin(phase * 2.3 + 1.2) * 5 +
        Math.sin(phase * 0.7 + 2.1) * 3
      );
    }
    d += (i === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2) + " ";
  }
  return d;
}

// ─── Composer ────────────────────────────────────────────────────────────────

export function Composer({
  disabled,
  onSend,
  voiceEnabled,
  speaking,
}: Props) {
  const [value, setValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [oscWidth, setOscWidth] = useState(600);
  const [slashIndex, setSlashIndex] = useState(0);

  // Measure composer width for oscilloscope
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setOscWidth(Math.floor(w));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Slash command filtering
  const isSlash = value.startsWith("/") && !value.includes(" ");
  const slashQuery = isSlash ? value.toLowerCase() : "";
  const filteredCmds = isSlash
    ? SLASH_COMMANDS.filter((c) => c.cmd.startsWith(slashQuery))
    : [];

  // Reset selection index when filter changes
  useEffect(() => { setSlashIndex(0); }, [slashQuery]);

  const { transcript, listening, supported, start, stop, reset } = useSpeechRecognition();
  const prevListening = useRef(false);

  useEffect(() => {
    if (prevListening.current && !listening && transcript.trim()) {
      setValue(transcript.trim());
      reset();
    }
    prevListening.current = listening;
  }, [listening, transcript, reset]);

  const isActive = listening || (speaking ?? false);
  const oscPath = useOscPath(isActive, oscWidth);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [value]);

  const submit = useCallback(async () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    await onSend(text);
  }, [disabled, onSend, value]);

  const selectSlashCmd = useCallback((cmd: SlashCommand) => {
    // Fill in the command; if it takes args, leave a space after
    const filled = cmd.args ? `${cmd.cmd} ` : cmd.cmd;
    setValue(filled);
    textareaRef.current?.focus();
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (filteredCmds.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => Math.min(i + 1, filteredCmds.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && filteredCmds.length > 0 && filteredCmds[slashIndex]?.cmd !== value)) {
        e.preventDefault();
        const chosen = filteredCmds[slashIndex];
        if (chosen) selectSlashCmd(chosen);
        return;
      }
      if (e.key === "Escape") {
        setValue("");
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const toggleMic = () => {
    if (!supported || disabled) return;
    if (listening) { stop(); } else { reset(); start(); }
  };

  const strokeColor = listening
    ? "var(--d-green)"
    : speaking
      ? "var(--d-play-trace)"
      : "var(--d-idle-trace)";

  // Group filtered commands by category in order
  const grouped: { category: string; cmds: SlashCommand[] }[] = [];
  for (const cat of CATEGORY_ORDER) {
    const cmds = filteredCmds.filter((c) => c.category === cat);
    if (cmds.length) grouped.push({ category: cat, cmds });
  }
  // Flat index → grouped for highlight tracking
  const flatFiltered = CATEGORY_ORDER.flatMap((cat) =>
    filteredCmds.filter((c) => c.category === cat)
  );

  return (
    <div
      ref={containerRef}
      style={{
        borderTop: "1px solid var(--d-rule)",
        background: "var(--d-bg)",
        padding: "12px 24px 14px",
        flexShrink: 0,
        position: "relative",
      }}
    >
      {/* ── Slash command picker ─────────────────────────────────────────── */}
      {filteredCmds.length > 0 && (
        <div style={{
          position: "absolute",
          bottom: "100%",
          left: 24,
          right: 24,
          maxHeight: 320,
          overflowY: "auto",
          background: "var(--d-bg)",
          border: "1px solid var(--d-outline)",
          zIndex: 20,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.3)",
        }}>
          {/* Header */}
          <div style={{
            background: "var(--d-green)",
            color: "var(--d-on-accent)",
            padding: "5px 12px",
            fontSize: 9,
            letterSpacing: 2,
            display: "flex",
            justifyContent: "space-between",
          }}>
            <span>/ COMMANDS · {filteredCmds.length}</span>
            <span style={{ opacity: 0.8 }}>↑↓ NAVIGATE · TAB COMPLETE · ESC CANCEL</span>
          </div>

          {grouped.map(({ category, cmds }) => (
            <div key={category}>
              {/* Category header */}
              <div style={{
                padding: "5px 12px 3px",
                fontSize: 9,
                letterSpacing: 1.8,
                color: "var(--d-blue)",
                borderBottom: "1px solid var(--d-rule3)",
                background: "var(--d-bg2)",
              }}>
                {category.toUpperCase()}
              </div>

              {cmds.map((cmd) => {
                const flatIdx = flatFiltered.indexOf(cmd);
                const isHighlighted = flatIdx === slashIndex;
                return (
                  <button
                    key={cmd.cmd}
                    onMouseDown={(e) => { e.preventDefault(); selectSlashCmd(cmd); }}
                    onMouseEnter={() => setSlashIndex(flatIdx)}
                    style={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "120px 1fr",
                      gap: 8,
                      padding: "7px 12px",
                      background: isHighlighted ? "var(--d-bg-row-hot)" : "transparent",
                      borderLeft: isHighlighted ? "2px solid var(--d-green)" : "2px solid transparent",
                      borderBottom: "1px solid var(--d-rule3)",
                      borderTop: "none",
                      borderRight: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                      alignItems: "baseline",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4, minWidth: 0 }}>
                      <span style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: 11,
                        color: isHighlighted ? "var(--d-green)" : "var(--d-ink)",
                        fontWeight: 600,
                      }}>
                        {cmd.cmd}
                      </span>
                      {cmd.args && (
                        <span style={{
                          fontFamily: "var(--font-mono, monospace)",
                          fontSize: 10,
                          color: "var(--d-blue)",
                        }}>
                          {cmd.args}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: "var(--d-mute)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {cmd.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Oscilloscope ─────────────────────────────────────────────────── */}
      <div style={{ height: 34, marginBottom: 8, position: "relative" }}>
        <svg
          width="100%"
          height={34}
          viewBox={`0 0 ${oscWidth} 34`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <line x1="0" y1="17" x2={oscWidth} y2="17"
            stroke="var(--d-rule)" strokeWidth="1" strokeDasharray="2 3" />
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={i}
              x1={(i / 19) * oscWidth} y1="14"
              x2={(i / 19) * oscWidth} y2="20"
              stroke="var(--d-rule)" strokeWidth="1" />
          ))}
          <path
            d={oscPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={listening ? 2.5 : 2}
            style={{
              filter: listening ? "drop-shadow(0 0 4px var(--d-wave-glow))" : "none",
              transition: "stroke 180ms",
            }}
          />
        </svg>
        <div style={{
          position: "absolute", left: 0, top: -2,
          fontSize: 8, letterSpacing: 1.6, color: "var(--d-mute3)",
        }}>
          {listening ? "● RECORDING" : speaking ? "◦ PLAYBACK" : "— IDLE"}
        </div>
        <div style={{
          position: "absolute", right: 0, top: -2,
          fontSize: 8, letterSpacing: 1.6, color: "var(--d-mute3)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {listening ? "−12 dB" : "−∞ dB"}
        </div>
      </div>

      {/* ── Input row ────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 10,
        border: "1px solid var(--d-rule2)",
        padding: "10px 12px",
        background: "var(--d-bg3)",
      }}>
        <span style={{
          color: value.startsWith("/") ? "var(--d-blue)" : "var(--d-green)",
          fontSize: 13,
          paddingBottom: 2,
          flexShrink: 0,
          transition: "color 100ms",
        }}>❯</span>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={listening ? "listening…" : disabled ? "connect to Hank to send" : "say something to Hank · type / for commands"}
          rows={1}
          disabled={disabled}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            overflowY: "auto",
            color: value.startsWith("/") ? "var(--d-blue)" : "var(--d-ink)",
            fontFamily: value.startsWith("/")
              ? "var(--font-mono, monospace)"
              : "var(--font-serif, Newsreader, Georgia, serif)",
            fontSize: 15,
            lineHeight: 1.4,
            opacity: disabled ? 0.5 : 1,
            transition: "color 100ms, font-family 100ms",
          }}
          aria-label="Message input"
        />
        {voiceEnabled && (
          <button
            onClick={toggleMic}
            disabled={!supported || disabled}
            title={listening ? "Stop listening" : supported ? "Speak to type" : "Speech not supported"}
            style={{
              width: 30, height: 30,
              border: `1px solid ${listening ? "var(--d-green)" : "var(--d-rule2)"}`,
              background: listening ? "var(--d-green)" : "transparent",
              color: listening ? "var(--d-on-accent)" : "var(--d-mute)",
              cursor: supported && !disabled ? "pointer" : "not-allowed",
              fontSize: 12,
              display: "grid",
              placeItems: "center",
              position: "relative",
              flexShrink: 0,
            }}
            aria-pressed={listening}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
          >
            ●
            {listening && (
              <span style={{
                position: "absolute",
                inset: -4,
                border: "1px solid var(--d-green)",
                animation: "dispatchPulse 1.2s infinite",
                pointerEvents: "none",
              }} />
            )}
          </button>
        )}
        <button
          onClick={() => void submit()}
          disabled={disabled || !value.trim()}
          style={{
            padding: "6px 12px",
            border: "1px solid var(--d-green)",
            background: "var(--d-green)",
            color: "var(--d-on-accent)",
            cursor: disabled || !value.trim() ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            fontSize: 10,
            letterSpacing: 1.6,
            opacity: disabled || !value.trim() ? 0.5 : 1,
            flexShrink: 0,
          }}
          aria-label="Send message"
        >
          SEND ↵
        </button>
      </div>

      {/* ── Hint row ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: 6,
        fontSize: 9,
        color: "var(--d-mute3)",
        letterSpacing: 1.2,
      }}>
        <span>↵ SEND · ⇧↵ NEW LINE · / COMMANDS · ⌘K PALETTE{voiceEnabled ? " · ⌘/ MIC" : ""}</span>
        <span style={{ color: "var(--d-blue)" }}>HERMES · 128k ctx</span>
      </div>
    </div>
  );
}
