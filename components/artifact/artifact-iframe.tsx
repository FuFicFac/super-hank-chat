"use client";

import { buildArtifactSrcdoc } from "@/lib/artifacts/renderer";
import type { ArtifactType } from "@/lib/artifacts/schema";
import { useEffect, useRef } from "react";

type Props = {
  type: ArtifactType;
  content: string;
  title?: string;
};

export function ArtifactIframe({ type, content, title }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // For markdown type, we don't use iframe — handled by parent
  const srcdoc = buildArtifactSrcdoc(type, content);

  // Reset scroll position when content changes
  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    // Re-assign srcdoc to force reload
    frame.srcdoc = srcdoc;
  }, [srcdoc]);

  return (
    <iframe
      ref={iframeRef}
      title={title ?? "Artifact"}
      srcDoc={srcdoc}
      sandbox="allow-scripts"
      className="h-full w-full border-0"
      loading="lazy"
    />
  );
}
