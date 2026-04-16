import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

export type HankDatabase = BetterSQLite3Database<typeof schema>;

function resolveDbPath(): string {
  const fromEnv = process.env.DATABASE_PATH;
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  }
  return path.join(process.cwd(), "data", "super-hank-chat.db");
}

function ensureDataDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function applyMigrationsIfNeeded(sqlite: Database.Database): void {
  const result = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_sessions'")
    .get();
  if (result) return;

  const migrationPath = path.join(process.cwd(), "drizzle", "0000_init.sql");
  if (!fs.existsSync(migrationPath)) {
    console.warn("⚠️ Migration file not found at", migrationPath);
    return;
  }

  const migrationSql = fs.readFileSync(migrationPath, "utf-8");
  sqlite.exec(migrationSql);
  console.log("✅ Applied initial migration");
}

let _db: HankDatabase | null = null;

export async function initDbSingleton(): Promise<void> {
  if (_db) return;

  const dbPath = resolveDbPath();
  ensureDataDir(dbPath);

  const sqlite = new Database(dbPath);

  // WAL mode for better concurrent read performance
  sqlite.pragma("journal_mode = WAL");

  applyMigrationsIfNeeded(sqlite);

  _db = drizzle(sqlite, { schema });
}

export function getDb(): HankDatabase {
  if (!_db) {
    throw new Error(
      "Database not initialized. Call await initDbSingleton() from instrumentation or route handlers."
    );
  }
  return _db;
}

export function pingDb() {
  getDb().run(sql`SELECT 1`);
}
