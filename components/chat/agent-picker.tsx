"use client";

import { useEffect } from "react";
import { AGENT_PROFILES } from "@/lib/agents/profiles";
import { HankAvatar } from "./hank-avatar";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (agentId: string) => void;
};

export function AgentPicker({ open, onClose, onPick }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(0, 0, 0, 0.48)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-picker-title"
        style={{
          width: "min(720px, 100%)",
          maxHeight: "min(720px, calc(100vh - 40px))",
          overflow: "auto",
          border: "1px solid var(--d-rule2)",
          borderRadius: 8,
          background: "var(--d-bg3)",
          color: "var(--d-ink)",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.38)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "18px 20px 14px",
            borderBottom: "1px solid var(--d-rule)",
          }}
        >
          <div>
            <h2 id="agent-picker-title" style={{ margin: 0, fontSize: 18, letterSpacing: 0 }}>
              Choose an agent
            </h2>
            <div style={{ marginTop: 4, fontSize: 12, color: "var(--d-mute)" }}>
              This session will stay bound to the selected persona.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close agent picker"
            className="classroom-button"
            style={{
              width: 32,
              height: 32,
              border: "1px solid var(--d-rule2)",
              borderRadius: 6,
              background: "transparent",
              color: "var(--d-ink)",
              cursor: "pointer",
            }}
          >
            x
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 12,
            padding: 20,
          }}
        >
          {AGENT_PROFILES.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => onPick(profile.id)}
              className="classroom-button"
              style={{
                minHeight: 132,
                padding: 14,
                textAlign: "left",
                border: `1px solid ${profile.color}`,
                borderRadius: 8,
                background: "var(--d-bg-row)",
                color: "var(--d-ink)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <HankAvatar
                  size="md"
                  src={profile.avatar}
                  name={profile.name}
                  color={profile.color}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{profile.name}</div>
                  {profile.id === "hank" && (
                    <div style={{ marginTop: 2, fontSize: 11, color: "var(--d-mute)" }}>
                      Default
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.35, color: "var(--d-mute)" }}>
                {profile.tagline}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
