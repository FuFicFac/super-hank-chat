import type { HermesSseEventType } from "@/types/hermes";

export type HermesOutboundEvent = {
  type: HermesSseEventType;
  payload: Record<string, unknown>;
};

export function sseEvent(
  type: HermesSseEventType,
  payload: Record<string, unknown>,
): HermesOutboundEvent {
  return { type, payload };
}
