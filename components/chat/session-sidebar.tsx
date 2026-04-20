"use client";

import type { ApiSessionSummary } from "@/types/api";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  sessions: ApiSessionSummary[];
  activeId: string;
  loading?: boolean;
  onCreate: () => void;
  creating?: boolean;
  onDeleted?: () => void;
};

/** Derive a stable HNK-XXXX code from a session ID (UUID). */
function sessionCode(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) >>> 0;
  }
  return "HNK-" + String(h % 10000).padStart(4, "0");
}

function relativeTime(updatedAt: number): string {
  const delta = Math.floor((Date.now() / 1000) - updatedAt);
  if (delta < 60) return `${delta}s`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h`;
  if (delta < 604800) return `${Math.floor(delta / 86400)}d`;
  return `${Math.floor(delta / 604800)}w`;
}

export function SessionSidebar({ sessions, activeId, loading, onCreate, creating, onDeleted }: Props) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [clearingEmpty, setClearingEmpty] = useState(false);

  const live = sessions.filter((s) => s.status === "connected");
  const emptyCount = sessions.filter((s) => s.messageCount === 0).length;

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingIds((prev) => new Set(prev).add(sessionId));
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      onDeleted?.();
      if (sessionId === activeId) {
        // Navigate to another session or home
        const next = sessions.find((s) => s.id !== sessionId);
        router.push(next ? `/sessions/${next.id}` : "/");
      }
    } finally {
      setDeletingIds((prev) => {
        const s = new Set(prev);
        s.delete(sessionId);
        return s;
      });
    }
  };

  const handleClearEmpty = async () => {
    setClearingEmpty(true);
    const empty = sessions.filter((s) => s.messageCount === 0 && s.id !== activeId);
    try {
      await Promise.all(empty.map((s) => fetch(`/api/sessions/${s.id}`, { method: "DELETE" })));
      onDeleted?.();
    } finally {
      setClearingEmpty(false);
    }
  };

  if (collapsed) {
    return (
      <aside style={{
        width: 36,
        minWidth: 36,
        borderRight: "1px solid var(--d-rule)",
        background: "var(--d-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: "100%",
        minHeight: 0,
        transition: "width 180ms ease",
      }}>
        <button
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
          style={{
            marginTop: 14,
            background: "none",
            border: "none",
            color: "var(--d-mute)",
            cursor: "pointer",
            fontSize: 14,
            padding: "4px 6px",
            lineHeight: 1,
          }}
        >
          ›
        </button>
      </aside>
    );
  }

  return (
    <aside style={{
      width: 272,
      minWidth: 272,
      borderRight: "1px solid var(--d-rule)",
      background: "var(--d-bg)",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      minHeight: 0,
    }}>
      {/* Wordmark */}
      <div style={{
        padding: "18px 16px 14px",
        borderBottom: "1px solid var(--d-rule)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{
            fontFamily: "var(--font-serif, Newsreader, Georgia, serif)",
            fontSize: 22, fontWeight: 500, letterSpacing: -0.4,
            color: "var(--d-ink2)",
          }}>
            Hank<span style={{ color: "var(--d-green)" }}>.</span>
            <span style={{ color: "var(--d-blue)", marginLeft: 1 }}>_</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 10, color: "var(--d-blue)", letterSpacing: 1.2 }}>
              v4.2 · 3099
            </div>
            <button
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
              style={{
                background: "none",
                border: "none",
                color: "var(--d-mute)",
                cursor: "pointer",
                fontSize: 14,
                padding: "0 2px",
                lineHeight: 1,
              }}
            >
              ‹
            </button>
          </div>
        </div>
        <div style={{
          marginTop: 6, fontSize: 11,
          color: "var(--d-mute)",
          fontStyle: "italic",
          fontFamily: "var(--font-serif, Newsreader, Georgia, serif)",
        }}>
          "at your disposal, as ever"
        </div>
      </div>

      {/* New session button */}
      <button
        onClick={onCreate}
        disabled={creating}
        style={{
          margin: "12px 12px 8px",
          padding: "9px 12px",
          background: "var(--d-outline-bg)",
          border: "1px solid var(--d-outline)",
          color: "var(--d-outline-ink)",
          fontFamily: "inherit",
          fontSize: 11,
          letterSpacing: 1.6,
          cursor: creating ? "not-allowed" : "pointer",
          opacity: creating ? 0.6 : 1,
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span>{creating ? "CREATING…" : "+ NEW SESSION"}</span>
        <span style={{ opacity: 0.7 }}>⌘N</span>
      </button>

      {/* Filter tabs */}
      <div style={{
        padding: "8px 16px 6px",
        display: "flex",
        gap: 12,
        fontSize: 10,
        color: "var(--d-mute2)",
        letterSpacing: 1.4,
        flexShrink: 0,
      }}>
        <span style={{
          color: "var(--d-ink)",
          borderBottom: "1px solid var(--d-structure)",
          paddingBottom: 2,
        }}>
          ALL · {sessions.length}
        </span>
        <span>LIVE · {live.length}</span>
        {emptyCount > 0 && (
          <button
            onClick={handleClearEmpty}
            disabled={clearingEmpty}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              fontFamily: "inherit",
              fontSize: 10,
              letterSpacing: 1.4,
              color: clearingEmpty ? "var(--d-mute3)" : "#e05a3a",
              cursor: clearingEmpty ? "not-allowed" : "pointer",
              padding: 0,
            }}
          >
            {clearingEmpty ? "CLEARING…" : `CLEAR ${emptyCount} EMPTY`}
          </button>
        )}
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "64px 1fr 36px 20px",
        padding: "8px 16px 6px",
        fontSize: 9,
        color: "var(--d-mute3)",
        letterSpacing: 1.6,
        borderBottom: "1px solid var(--d-rule)",
        flexShrink: 0,
      }}>
        <span>CODE</span>
        <span>TITLE / AGE</span>
        <span style={{ textAlign: "right" }}>MSG</span>
        <span />
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: "16px", fontSize: 11, color: "var(--d-mute)" }}>
            Loading…
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: "16px", fontSize: 11, color: "var(--d-mute)" }}>
            No sessions yet.
          </div>
        ) : (
          sessions.map((s, i) => {
            const isActive = s.id === activeId;
            const code = sessionCode(s.id);
            const isLive = s.status === "connected";
            const isDeleting = deletingIds.has(s.id);
            const isHovered = hoveredId === s.id;
            return (
              <div
                key={s.id}
                onMouseEnter={() => setHoveredId(s.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ position: "relative" }}
              >
                <Link
                  href={`/sessions/${s.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "64px 1fr 36px 20px",
                    padding: "10px 16px",
                    cursor: "pointer",
                    background: isActive ? "var(--d-bg-row-hot)" : i % 2 === 1 ? "var(--d-bg-row)" : "transparent",
                    borderLeft: isActive ? "2px solid var(--d-structure)" : "2px solid transparent",
                    borderBottom: "1px solid var(--d-rule3)",
                    textDecoration: "none",
                    alignItems: "start",
                    opacity: isDeleting ? 0.4 : 1,
                    transition: "opacity 150ms",
                  }}
                >
                  <div style={{
                    fontSize: 10,
                    color: isActive ? "var(--d-green)" : "var(--d-mute)",
                    letterSpacing: 0.8,
                    paddingTop: 1,
                  }}>
                    {code}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontFamily: "var(--font-serif, Newsreader, Georgia, serif)",
                      fontSize: 14,
                      lineHeight: 1.25,
                      color: isActive ? "var(--d-ink2)" : "var(--d-ink3)",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: "2",
                      WebkitBoxOrient: "vertical" as const,
                    }}>
                      {s.title}
                    </div>
                    <div style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 3,
                      fontSize: 10,
                      color: "var(--d-mute3)",
                      letterSpacing: 0.6,
                    }}>
                      <span>{relativeTime(s.updatedAt)} ago</span>
                      {isLive && (
                        <span style={{ color: "var(--d-green)", marginLeft: "auto" }}>● LIVE</span>
                      )}
                    </div>
                  </div>
                  <div style={{
                    textAlign: "right",
                    fontSize: 11,
                    color: "var(--d-mute)",
                    paddingTop: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {s.messageCount}
                  </div>
                  {/* Delete button — shown on hover */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {(isHovered || isDeleting) && (
                      <button
                        onClick={(e) => void handleDelete(e, s.id)}
                        disabled={isDeleting}
                        title="Delete session"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#e05a3a",
                          fontSize: 12,
                          cursor: "pointer",
                          padding: "0 2px",
                          lineHeight: 1,
                          opacity: isDeleting ? 0.4 : 1,
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </Link>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid var(--d-rule)",
        padding: "8px 16px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        fontSize: 9,
        letterSpacing: 1.2,
        color: "var(--d-mute2)",
        flexShrink: 0,
      }}>
        <div style={{ color: "var(--d-blue)" }}>SESSIONS · {sessions.length}</div>
        <div style={{ color: "var(--d-green)" }}>⌘K PALETTE</div>
      </div>
    </aside>
  );
}
