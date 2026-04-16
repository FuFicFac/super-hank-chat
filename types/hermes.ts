export type HermesConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type HermesSseEventType =
  | "session.connected"
  | "session.disconnected"
  | "session.error"
  | "message.started"
  | "message.delta"
  | "message.completed"
  | "stderr.delta"
  | "heartbeat";
