"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "shc-show-thinking";
const EVENT = "shc-show-thinking-change";

// Default: the thinking dropdown IS available (collapsed), with a global off switch.
function read(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) !== "off";
}

/**
 * Global toggle for whether Hank's "thinking" dropdown is shown at all.
 * Backed by localStorage and synced live across every component via a
 * window event (so toggling in the header updates all message bubbles).
 */
export function useShowThinking() {
  const [showThinking, setShow] = useState(true);

  useEffect(() => {
    setShow(read());
    const onChange = () => setShow(read());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setShowThinking = (next: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    setShow(next);
    window.dispatchEvent(new Event(EVENT));
  };

  const toggleShowThinking = () => setShowThinking(!read());

  return { showThinking, setShowThinking, toggleShowThinking };
}
