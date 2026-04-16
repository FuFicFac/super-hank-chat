"use client";

import { useCallback, useEffect, useRef } from "react";

const NEAR_BOTTOM_PX = 120;

export function useAutoScroll<T extends HTMLElement>(deps: unknown[]) {
  const ref = useRef<T | null>(null);

  const scrollToBottom = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < NEAR_BOTTOM_PX) {
      scrollToBottom();
    }
  }, [deps, scrollToBottom]);

  return { ref, scrollToBottom };
}
