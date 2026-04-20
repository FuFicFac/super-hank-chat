"use client";

import { ArtifactIframe } from "./artifact-iframe";
import type { Artifact } from "@/lib/artifacts/schema";
import { useState } from "react";

type Props = {
  artifact: Artifact;
  onClose: () => void;
};

type Tab = "rendered" | "source";
type Viewport = "mobile" | "tablet" | "desktop";

const VIEWPORT_WIDTHS: Record<Viewport, number | null> = {
  mobile:  375,
  tablet:  768,
  desktop: null,
};

const TYPE_LABELS: Record<string, string> = {
  html: "HTML",
  svg: "SVG",
  code: "CODE",
  markdown: "MD",
};

export function ArtifactPanel({ artifact, onClose }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab>("rendered");
  const [viewport, setViewport] = useState<Viewport>("desktop");

  const handleCopy = () => {
    void navigator.clipboard.writeText(artifact.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const typeLabel = TYPE_LABELS[artifact.type] ?? artifact.type.toUpperCase();
  const title = artifact.title ?? artifact.type;
  const previewWidth = VIEWPORT_WIDTHS[viewport];

  const btnStyle = (active = false) => ({
    padding: "5px 9px",
    border: `1px solid ${active ? "var(--d-rule2)" : "var(--d-outline)"}`,
    background: active ? "var(--d-rule2)" : "var(--d-outline-bg)",
    color: active ? "var(--d-mute)" : "var(--d-outline-ink)",
    fontFamily: "inherit",
    fontSize: 9,
    letterSpacing: 1.4,
    cursor: "pointer",
  });

  const vpBtnStyle = (vp: Viewport) => ({
    padding: "5px 8px",
    border: `1px solid ${viewport === vp ? "var(--d-green)" : "var(--d-rule2)"}`,
    background: viewport === vp ? "var(--d-green)" : "transparent",
    color: viewport === vp ? "var(--d-on-accent)" : "var(--d-mute)",
    fontFamily: "inherit",
    fontSize: 9,
    letterSpacing: 1.2,
    cursor: "pointer",
  });

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      background: "var(--d-bg2)",
      minWidth: 0,
      minHeight: 0,
      overflow: "hidden",
      position: fullscreen ? "fixed" : "relative",
      inset: fullscreen ? 0 : undefined,
      zIndex: fullscreen ? 50 : undefined,
    }}>
      {/* Green label strip */}
      <div style={{
        background: "var(--d-green)",
        color: "var(--d-on-accent)",
        padding: "6px 16px",
        fontSize: 10,
        letterSpacing: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "2px solid var(--d-blue)",
        flexShrink: 0,
      }}>
        <span>▞ WORKBENCH · {typeLabel} ARTIFACT</span>
        <span>SANDBOXED</span>
      </div>

      {/* Title + controls */}
      <div style={{
        padding: "10px 16px",
        borderBottom: "1px solid var(--d-rule)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
        flexWrap: "wrap",
      }}>
        <div style={{
          fontFamily: "var(--font-serif, Newsreader, Georgia, serif)",
          fontSize: 17,
          color: "var(--d-ink2)",
          letterSpacing: -0.2,
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 60,
        }}>
          {title}
        </div>
        <button onClick={handleCopy} style={btnStyle()}>
          {copied ? "✓ COPIED" : "⧉ COPY"}
        </button>
        <button onClick={() => setFullscreen((f) => !f)} style={btnStyle()}>
          {fullscreen ? "⤡ EXIT" : "⤢ FULL"}
        </button>
        <button onClick={onClose} style={{ ...btnStyle(), borderColor: "var(--d-rule2)", color: "var(--d-mute)" }}>
          ✕
        </button>
      </div>

      {/* Tabs + viewport presets */}
      <div style={{
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid var(--d-rule)",
        fontSize: 10,
        letterSpacing: 1.6,
        flexShrink: 0,
      }}>
        {(["rendered", "source"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 14px",
              color: tab === t ? "var(--d-green)" : "var(--d-mute)",
              borderBottom: tab === t ? "2px solid var(--d-structure)" : "2px solid transparent",
              borderRight: "1px solid var(--d-rule)",
              borderTop: "none",
              borderLeft: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 10,
              letterSpacing: 1.6,
              flexShrink: 0,
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}

        {/* Viewport presets — only in rendered tab */}
        {tab === "rendered" && (
          <div style={{
            display: "flex",
            gap: 4,
            padding: "0 10px",
            alignItems: "center",
            marginLeft: "auto",
          }}>
            <span style={{ fontSize: 9, color: "var(--d-mute3)", letterSpacing: 1.2, marginRight: 2 }}>
              VIEW
            </span>
            {(["mobile", "tablet", "desktop"] as Viewport[]).map((vp) => (
              <button key={vp} onClick={() => setViewport(vp)} style={vpBtnStyle(vp)}>
                {vp === "mobile"  ? "📱 375" :
                 vp === "tablet"  ? "⬜ 768" :
                                    "🖥 FULL"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        {tab === "rendered" ? (
          <div style={{
            width: "100%",
            height: "100%",
            overflowX: previewWidth ? "auto" : "hidden",
            overflowY: "hidden",
            display: "flex",
            justifyContent: previewWidth ? "center" : "stretch",
            background: previewWidth ? "var(--d-bg3)" : undefined,
          }}>
            <div style={{
              width: previewWidth ? previewWidth : "100%",
              minWidth: previewWidth ? previewWidth : undefined,
              height: "100%",
              flexShrink: 0,
              boxShadow: previewWidth ? "0 0 0 1px var(--d-rule2)" : undefined,
            }}>
              <ArtifactIframe
                type={artifact.type}
                content={artifact.content}
                title={artifact.title}
              />
            </div>
          </div>
        ) : (
          <div style={{
            height: "100%",
            overflowY: "auto",
            padding: 16,
            background: "var(--d-bg4)",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            color: "var(--d-ink4)",
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}>
            {artifact.content}
          </div>
        )}
      </div>
    </div>
  );
}
