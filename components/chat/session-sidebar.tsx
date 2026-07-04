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
  onSelect?: () => void;
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

export function SessionSidebar({ sessions, activeId, loading, onCreate, creating, onDeleted, onSelect }: Props) {
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
      <aside className="session-sidebar session-sidebar-collapsed">
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
    <aside className="session-sidebar">
      {/* Wordmark */}
      <div className="sidebar-wordmark">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div className="sidebar-brand">
            Hank<span style={{ color: "var(--d-green)" }}>.</span>
            <span style={{ color: "var(--d-blue)", marginLeft: 1 }}>_</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="sidebar-version" style={{ color: "var(--d-blue)" }}>
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
          &ldquo;at your disposal, as ever&rdquo;
        </div>
      </div>

      {/* New session button */}
      <button
        onClick={onCreate}
        disabled={creating}
        className="sidebar-new-button classroom-button"
        style={{
          cursor: creating ? "not-allowed" : "pointer",
          opacity: creating ? 0.6 : 1,
        }}
      >
        <span>{creating ? "Creating…" : "＋ New chat"}</span>
        <span style={{ opacity: 0.7 }}>⌘N</span>
      </button>

      {/* Filter tabs */}
      <div className="sidebar-filter sidebar-tabs">
        <span style={{
          color: "var(--d-ink)",
          borderBottom: "1px solid var(--d-structure)",
          paddingBottom: 2,
        }}>
          All · {sessions.length}
        </span>
        <span>Live · {live.length}</span>
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
              color: clearingEmpty ? "var(--d-mute3)" : "var(--c-danger, #e05a3a)",
              cursor: clearingEmpty ? "not-allowed" : "pointer",
              padding: 0,
            }}
          >
            {clearingEmpty ? "Clearing…" : `Clear ${emptyCount} empty`}
          </button>
        )}
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "64px 1fr 36px 20px",
        padding: "8px 16px 6px",
        fontSize: 10,
        color: "var(--d-mute3)",
        letterSpacing: 1.6,
        borderBottom: "1px solid var(--d-rule)",
        flexShrink: 0,
      }}>
        <span>Code</span>
        <span>Title / age</span>
        <span style={{ textAlign: "right" }}>Msg</span>
        <span />
      </div>

      {/* Session list */}
      <div className="session-list">
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
                  className="session-link"
                  data-active={isActive}
                  data-alt={i % 2 === 1}
                  style={{ opacity: isDeleting ? 0.4 : 1 }}
                  onClick={onSelect}
                >
                  <div
                    className="session-code"
                    style={{
                      color: isActive ? "var(--d-green)" : "var(--d-mute)",
                      paddingTop: 1,
                    }}
                  >
                    {code}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="session-title">
                      {s.title}
                    </div>
                    <div className="session-meta">
                      <span>{relativeTime(s.updatedAt)} ago</span>
                      {isLive && (
                        <span style={{ color: "var(--d-green)", marginLeft: "auto" }}>● Live</span>
                      )}
                    </div>
                  </div>
                  <div className="session-count" style={{
                    textAlign: "right",
                    fontSize: 11,
                    color: "var(--d-mute)",
                    paddingTop: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {s.messageCount}
                  </div>
                  {/* Delete button — shown on hover */}
                  <div className="session-delete-cell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {(isHovered || isDeleting) && (
                      <button
                        onClick={(e) => void handleDelete(e, s.id)}
                        disabled={isDeleting}
                        title="Delete session"
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--c-danger, #e05a3a)",
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
      <div className="sidebar-footer">
        <div style={{ color: "var(--d-blue)" }}>Sessions · {sessions.length}</div>
        <div style={{ color: "var(--d-green)" }}>⌘K Palette</div>
      </div>
    </aside>
  );
}
