"use client";

import { useState } from "react";

type HankAvatarState = "idle" | "thinking" | "speaking";
type HankAvatarSize = "sm" | "md";

export function HankAvatar({
  size = "md",
  state = "idle",
  className = "",
}: {
  size?: HankAvatarSize;
  state?: HankAvatarState;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <span
      className={`hank-avatar hank-avatar-${size} hank-avatar-${state} ${className}`}
      aria-hidden="true"
    >
      {!imageFailed ? (
        <img
          src="/avatar/hank.png"
          alt=""
          className="hank-avatar-image"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <svg className="hank-avatar-svg" viewBox="0 0 40 40" role="img">
          <circle cx="20" cy="20" r="20" fill="var(--c-hank, var(--d-green))" />
          <rect className="hank-avatar-eyelid" x="10" y="13" width="20" height="8" rx="4" fill="var(--c-hank, var(--d-green))" />
          <circle cx="14.5" cy="17" r="2.2" fill="var(--c-primary-ink, var(--d-on-accent))" />
          <circle cx="25.5" cy="17" r="2.2" fill="var(--c-primary-ink, var(--d-on-accent))" />
          <path
            d="M13.5 24.5c2 3.1 10.9 3.1 13 0"
            fill="none"
            stroke="var(--c-primary-ink, var(--d-on-accent))"
            strokeLinecap="round"
            strokeWidth="2.4"
          />
        </svg>
      )}
    </span>
  );
}
