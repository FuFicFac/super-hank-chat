"use client";

export function TypingStream({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="typing-stream">
      <span>Hank is composing</span>
      <span style={{ animation: "dispatchBlink 0.9s infinite" }}>▊</span>
    </div>
  );
}
