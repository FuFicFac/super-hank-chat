"use client";

export function TypingStream({
  visible,
  agentName = "Hank",
  toolActivity,
}: {
  visible: boolean;
  agentName?: string;
  toolActivity?: string | null;
}) {
  if (!visible && !toolActivity) return null;
  return (
    <div>
      {visible && (
        <div className="typing-stream">
          <span>Hank is composing</span>
          <span className="typing-dispatch-caret">▊</span>
          <span className="typing-classroom-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </div>
      )}
      {toolActivity && (
        <div
          className="typing-stream"
          style={{
            marginTop: 6,
            opacity: 0.72,
            fontSize: 12,
          }}
        >
          <span>⚙ {agentName} is working — {toolActivity}</span>
        </div>
      )}
    </div>
  );
}
