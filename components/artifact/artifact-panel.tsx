"use client";

import { ArtifactIframe } from "./artifact-iframe";
import type { Artifact } from "@/lib/artifacts/schema";
import JSZip from "jszip";
import { useState } from "react";

type Props = {
  artifact: Artifact;
  sessionId: string;
  onClose: () => void;
};

type Tab = "rendered" | "source";
type Viewport = "mobile" | "tablet" | "desktop";

const TYPE_LABELS: Record<string, string> = {
  html: "HTML",
  svg: "SVG",
  code: "CODE",
  markdown: "MD",
};

export function ArtifactPanel({ artifact, sessionId, onClose }: Props) {
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

  const handleOpenTab = () => {
    window.open(`/api/sessions/${sessionId}/preview`, "_blank");
  };

  const handleSave = () => {
    const ext: Record<string, string> = { html: "html", svg: "svg", markdown: "md", code: "txt" };
    const mime: Record<string, string> = { html: "text/html", svg: "image/svg+xml", markdown: "text/markdown", code: "text/plain" };
    const slug = (artifact.title ?? artifact.type)
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "artifact";
    const filename = `${slug}.${ext[artifact.type] ?? "txt"}`;
    const blob = new Blob([artifact.content], { type: mime[artifact.type] ?? "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const [zipping, setZipping] = useState(false);

  const handleZipAll = async () => {
    if (zipping) return;
    setZipping(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`);
      if (!res.ok) throw new Error("Failed to load messages");
      const data = (await res.json()) as { messages: Array<{ artifact?: Artifact | null }> };

      const artifacts = data.messages
        .map((m) => m.artifact)
        .filter((a): a is Artifact => a != null);

      if (artifacts.length === 0) {
        alert("No artifacts found in this session.");
        return;
      }

      const ext: Record<string, string> = { html: "html", svg: "svg", markdown: "md", code: "txt" };
      const zip = new JSZip();
      const used = new Set<string>();

      artifacts.forEach((a, i) => {
        const slug = (a.title ?? a.type)
          .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "artifact";
        const e = ext[a.type] ?? "txt";
        let name = `${String(i + 1).padStart(2, "0")}-${slug}.${e}`;
        if (used.has(name)) name = `${String(i + 1).padStart(2, "0")}-${slug}-${i + 1}.${e}`;
        used.add(name);
        zip.file(name, a.content);
      });

      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `hank-artifacts-${date}.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setZipping(false);
    }
  };

  const typeLabel = TYPE_LABELS[artifact.type] ?? artifact.type.toUpperCase();
  const title = artifact.title ?? artifact.type;
  
  const viewportStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    overflow: "auto",
    display: "flex",
    justifyContent: viewport === "desktop" ? "stretch" : "center",
    alignItems: viewport === "desktop" ? "stretch" : "center",
    padding: viewport === "desktop" ? 0 : "2rem",
    background: viewport === "desktop" ? undefined : "var(--d-bg3)",
  };

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
        <button onClick={handleSave} title="Download this artifact as a file" style={btnStyle()}>
          ↓ SAVE
        </button>
        <button onClick={() => void handleZipAll()} disabled={zipping} title="Download all session artifacts as a ZIP" style={btnStyle()}>
          {zipping ? "…" : "↓ ZIP ALL"}
        </button>
        <button onClick={handleOpenTab} title="Open in new browser window" style={btnStyle()}>
          ↗ POP OUT
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
          <div style={viewportStyle}>
            {viewport === "mobile" ? (
              /* ── Phone frame ── */
              <div style={{ flexShrink: 0, position: "relative", transform: "scale(0.7)", transformOrigin: "top center" }}>
                {/* Body */}
                <div style={{
                  width: 375 + 24,
                  borderRadius: 52,
                  background: "#18181b",
                  boxShadow: "0 0 0 1px #333, 0 0 0 3px #111, 0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)",
                  padding: "52px 12px 32px",
                  position: "relative",
                }}>
                  {/* Notch pill */}
                  <div style={{
                    position: "absolute",
                    top: 16,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 110,
                    height: 28,
                    borderRadius: 14,
                    background: "#09090b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#1d1d1f" }} />
                    <div style={{ width: 50, height: 6, borderRadius: 3, background: "#1d1d1f" }} />
                  </div>
                  {/* Side buttons */}
                  <div style={{ position: "absolute", left: -3, top: 100, width: 3, height: 32, borderRadius: "2px 0 0 2px", background: "#27272a" }} />
                  <div style={{ position: "absolute", left: -3, top: 148, width: 3, height: 56, borderRadius: "2px 0 0 2px", background: "#27272a" }} />
                  <div style={{ position: "absolute", left: -3, top: 216, width: 3, height: 56, borderRadius: "2px 0 0 2px", background: "#27272a" }} />
                  <div style={{ position: "absolute", right: -3, top: 148, width: 3, height: 80, borderRadius: "0 2px 2px 0", background: "#27272a" }} />
                  {/* Screen */}
                  <div style={{
                    width: 375,
                    height: 812,
                    borderRadius: 40,
                    overflow: "hidden",
                    background: "#fff",
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)",
                  }}>
                    <ArtifactIframe
                      type={artifact.type}
                      content={artifact.content}
                      title={artifact.title}
                    />
                  </div>
                  {/* Home bar */}
                  <div style={{
                    margin: "10px auto 0",
                    width: 130,
                    height: 5,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.2)",
                  }} />
                </div>
              </div>
            ) : viewport === "tablet" ? (
              /* ── Tablet frame ── */
              <div style={{ flexShrink: 0, transform: "scale(0.6)", transformOrigin: "top center" }}>
                <div style={{
                  width: 768 + 32,
                  borderRadius: 28,
                  background: "#18181b",
                  boxShadow: "0 0 0 1px #333, 0 0 0 3px #111, 0 20px 48px rgba(0,0,0,0.5)",
                  padding: "20px 16px",
                  position: "relative",
                }}>
                  {/* Camera dot */}
                  <div style={{
                    position: "absolute",
                    top: 9,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#27272a",
                  }} />
                  {/* Screen */}
                  <div style={{
                    width: 768,
                    height: 1024,
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "#fff",
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)",
                  }}>
                    <ArtifactIframe
                      type={artifact.type}
                      content={artifact.content}
                      title={artifact.title}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* ── Desktop: full-height, no frame ── */
              <div style={{ width: "100%", height: "100%" }}>
                <ArtifactIframe
                  type={artifact.type}
                  content={artifact.content}
                  title={artifact.title}
                />
              </div>
            )}
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
