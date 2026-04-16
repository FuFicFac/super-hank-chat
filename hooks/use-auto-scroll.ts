"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const NEAR_BOTTOM_PX = 120;

export function useAutoScroll<T extends HTMLElement>(deps: unknown[]) {
  const ref = useRef<T | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setIsAtBottom(distance < NEAR_BOTTOM_PX);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < NEAR_BOTTOM_PX) {
      el.scrollTop = el.scrollHeight;
    }
  }, [deps]);

  return { ref, scrollToBottom, isAtBottom };
}
