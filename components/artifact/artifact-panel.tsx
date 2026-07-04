"use client";

import { ArtifactIframe } from "./artifact-iframe";
import type { Artifact } from "@/lib/artifacts/schema";
import JSZip from "jszip";
import type { CSSProperties } from "react";
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
    "--artifact-border": active ? "var(--d-rule2)" : "var(--d-outline)",
    "--artifact-bg": active ? "var(--d-rule2)" : "var(--d-outline-bg)",
    "--artifact-color": active ? "var(--d-mute)" : "var(--d-outline-ink)",
  }) as CSSProperties;

  const vpBtnStyle = (vp: Viewport) => ({
    "--vp-border": viewport === vp ? "var(--d-green)" : "var(--d-rule2)",
    "--vp-bg": viewport === vp ? "var(--d-green)" : "transparent",
    "--vp-color": viewport === vp ? "var(--d-on-accent)" : "var(--d-mute)",
  }) as CSSProperties;

  return (
    <div
      className="artifact-panel"
      style={{
        position: fullscreen ? "fixed" : "relative",
        inset: fullscreen ? 0 : undefined,
        zIndex: fullscreen ? 50 : undefined,
      }}
    >
      {/* Green label strip */}
      <div className="artifact-strip">
        <span>▞ Workbench · {typeLabel} artifact</span>
        <span>Sandboxed</span>
      </div>

      {/* Title + controls */}
      <div className="artifact-toolbar">
        <div className="artifact-title">
          {title}
        </div>
        <button type="button" onClick={handleCopy} title="Copy source" className="artifact-button classroom-button" style={btnStyle()}>
          {copied ? "✓ Copied" : "⧉ Copy"}
        </button>
        <button type="button" onClick={handleSave} title="Download this artifact as a file" className="artifact-button classroom-button" style={btnStyle()}>
          ↓ Save
        </button>
        <button type="button" onClick={() => void handleZipAll()} disabled={zipping} title="Download all session artifacts as a ZIP" className="artifact-button classroom-button" style={btnStyle()}>
          {zipping ? "…" : "↓ Zip all"}
        </button>
        <button type="button" onClick={handleOpenTab} title="Open in new browser window" className="artifact-button classroom-button" style={btnStyle()}>
          ↗ Pop out
        </button>
        <button type="button" onClick={() => setFullscreen((f) => !f)} title={fullscreen ? "Exit fullscreen" : "Fullscreen"} className="artifact-button classroom-button" style={btnStyle()}>
          {fullscreen ? "⤡ Exit" : "⤢ Full"}
        </button>
        <button type="button" onClick={onClose} title="Close artifact panel" className="artifact-button classroom-button" style={{
          ...btnStyle(),
          "--artifact-border": "var(--d-rule2)",
          "--artifact-color": "var(--d-mute)",
        } as CSSProperties}>
          ✕
        </button>
      </div>

      {/* Tabs + viewport presets */}
      <div className="artifact-tabs">
        {(["rendered", "source"] as Tab[]).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className="artifact-tab"
            data-active={tab === t}
          >
            {t}
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
            <span className="artifact-viewport-label">
              View
            </span>
            {(["mobile", "tablet", "desktop"] as Viewport[]).map((vp) => (
              <button type="button" key={vp} onClick={() => setViewport(vp)} className="artifact-viewport-button classroom-button" style={vpBtnStyle(vp)}>
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
          <div className="artifact-source">
            {artifact.content}
          </div>
        )}
      </div>
    </div>
  );
}
