"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// How close to the bottom (px) still counts as "following the conversation".
const NEAR_BOTTOM_PX = 120;

/**
 * Stick-to-bottom scrolling for a chat log.
 *
 * Behavior:
 * - While you're at (or near) the bottom, the view follows new content —
 *   including live streaming — by pinning to the bottom as the content grows.
 * - The moment you scroll up, following pauses so you can read; content keeps
 *   arriving below without yanking you back down.
 * - Scrolling back to the bottom re-engages following.
 * - `scrollToBottom()` re-engages following on demand (e.g. the jump button,
 *   or when you send a message).
 *
 * Growth is tracked with a ResizeObserver on the content element, so it stays
 * pinned during rapid streaming regardless of React render timing.
 */
export function useAutoScroll<T extends HTMLElement>(deps: unknown[]) {
  const ref = useRef<T | null>(null);
  const followRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const pin = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      followRef.current = true;
      setIsAtBottom(true);
      pin(behavior);
    },
    [pin],
  );

  // Track the user's scroll position → engage/disengage following.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const atBottom = distance < NEAR_BOTTOM_PX;
      followRef.current = atBottom;
      setIsAtBottom(atBottom);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Pin to the bottom as content grows (streaming), but only while following.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const content = el.firstElementChild;
    const ro = new ResizeObserver(() => {
      if (followRef.current) pin("auto");
    });
    if (content) ro.observe(content);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pin]);

  // When the message set changes (new bubble), follow if we were at the bottom.
  useEffect(() => {
    if (followRef.current) pin("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ref, scrollToBottom, isAtBottom };
}
