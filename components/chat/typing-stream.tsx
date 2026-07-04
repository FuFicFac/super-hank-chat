"use client";

export function TypingStream({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="typing-stream">
      <span>Hank is composing</span>
      <span className="typing-dispatch-caret">▊</span>
      <span className="typing-classroom-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}
