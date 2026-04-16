import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull().default("disconnected"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  lastConnectedAt: integer("last_connected_at", { mode: "number" }),
  lastDisconnectedAt: integer("last_disconnected_at", { mode: "number" }),
  metadataJson: text("metadata_json"),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  sequence: integer("sequence", { mode: "number" }).notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  status: text("status").notNull().default("complete"),
  stderr: integer("stderr", { mode: "boolean" }).notNull().default(false),
  metadataJson: text("metadata_json"),
});

export const sessionEvents = sqliteTable("session_events", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  payloadJson: text("payload_json"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export type ChatSessionRow = typeof chatSessions.$inferSelect;
export type ChatMessageRow = typeof chatMessages.$inferSelect;
export type SessionEventRow = typeof sessionEvents.$inferSelect;
