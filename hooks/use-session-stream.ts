"use client";

import type { HermesSseEventType } from "@/types/hermes";
import { useEffect, useRef } from "react";

export type StreamHandler = (
  type: HermesSseEventType,
  payload: Record<string, unknown>,
) => void;

const EVENT_TYPES: HermesSseEventType[] = [
  "session.connected",
  "session.disconnected",
  "session.error",
  "message.started",
  "message.delta",
  "message.completed",
  "stderr.delta",
  "heartbeat",
];

export function useSessionStream(sessionId: string | null, onEvent: StreamHandler) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!sessionId) return;
    const es = new EventSource(`/api/sessions/${sessionId}/stream`);

    const handler =
      (type: HermesSseEventType) =>
      (ev: MessageEvent<string>) => {
        try {
          const payload = JSON.parse(ev.data) as Record<string, unknown>;
          onEventRef.current(type, payload);
        } catch {
          /* ignore malformed payloads */
        }
      };

    for (const type of EVENT_TYPES) {
      es.addEventListener(type, handler(type));
    }

    return () => {
      es.close();
    };
  }, [sessionId]);
}
