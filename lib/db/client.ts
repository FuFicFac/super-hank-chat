import fs from "fs";
import path from "path";
import initSqlJs, { type Database } from "sql.js";
import { drizzle, type SQLJsDatabase } from "drizzle-orm/sql-js";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

export type HankDatabase = SQLJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  sqlJsDb?: Database;
  drizzleDb?: HankDatabase;
  initPromise?: Promise<void>;
};

function resolveDbPath(): string {
  const fromEnv = process.env.DATABASE_PATH;
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  }
  return path.join(process.cwd(), "data", "hank-chat.db");
}

function ensureDataDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readFileAsArrayBuffer(filePath: string): ArrayBuffer {
  const buf = fs.readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/**
 * Applies the initial migration SQL if the database is empty (no chat_sessions table).
 * This runs every time the DB is initialized, but is a no-op if tables already exist.
 */
function applyMigrationsIfNeeded(sqlite: Database): void {
  const result = sqlite.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='chat_sessions'"
  );
  if (result.length > 0 && result[0].values.length > 0) {
    // Tables exist, skip migration
    return;
  }

  const migrationPath = path.join(process.cwd(), "drizzle", "0000_init.sql");
  if (!fs.existsSync(migrationPath)) {
    console.warn("⚠️ Migration file not found at", migrationPath);
    return;
  }

  const migrationSql = fs.readFileSync(migrationPath, "utf-8");
  sqlite.run(migrationSql);
  console.log("✅ Applied initial migration");
}

export async function initDbSingleton(): Promise<void> {
  if (globalForDb.drizzleDb && globalForDb.sqlJsDb) return;
  if (globalForDb.initPromise) {
    await globalForDb.initPromise;
    return;
  }

  globalForDb.initPromise = (async () => {
    const wasmPath = path.join(
      process.cwd(),
      "node_modules",
      "sql.js",
      "dist",
      "sql-wasm.wasm"
    );
    const wasmBinary = readFileAsArrayBuffer(wasmPath);
    const SQL = await initSqlJs({ wasmBinary });
    const dbPath = resolveDbPath();
    ensureDataDir(dbPath);

    const sqlite = fs.existsSync(dbPath)
      ? new SQL.Database(new Uint8Array(readFileAsArrayBuffer(dbPath)))
      : new SQL.Database();

    // Auto-apply migrations if tables don't exist yet
    applyMigrationsIfNeeded(sqlite);

    // Persist any migration changes
    const data = sqlite.export();
    fs.writeFileSync(dbPath, Buffer.from(data));

    globalForDb.sqlJsDb = sqlite;
    globalForDb.drizzleDb = drizzle(sqlite, { schema });
  })();

  await globalForDb.initPromise;
}

export function getDb(): HankDatabase {
  const db = globalForDb.drizzleDb;
  if (!db) {
    throw new Error(
      "Database is not initialized yet. Call await initDbSingleton() from instrumentation, root layout, or API routes."
    );
  }
  return db;
}

export function persistDb() {
  const sqlite = globalForDb.sqlJsDb;
  if (!sqlite) return;
  const dbPath = resolveDbPath();
  ensureDataDir(dbPath);
  const data = sqlite.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export function pingDb() {
  getDb().all(sql`SELECT 1`);
}