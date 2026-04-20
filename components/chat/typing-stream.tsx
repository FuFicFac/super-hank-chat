"use client";

export function TypingStream({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{
      alignSelf: "flex-start",
      display: "flex",
      gap: 6,
      color: "var(--d-green)",
      fontSize: 10,
      letterSpacing: 1.6,
      padding: "0 0 4px 0",
    }}>
      <span>HANK IS COMPOSING</span>
      <span style={{ animation: "dispatchBlink 0.9s infinite" }}>▊</span>
    </div>
  );
}
