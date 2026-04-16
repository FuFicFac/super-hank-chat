/**
 * Initializes the SQLite database by running the raw migration SQL.
 * Uses better-sqlite3 — synchronous, no WASM overhead.
 */
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DB_PATH = path.join(process.cwd(), "data", "super-hank-chat.db");
const MIGRATION_SQL = path.join(process.cwd(), "drizzle", "0000_init.sql");

function main() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // Check if already migrated
  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_sessions'")
    .get();

  if (exists) {
    console.log("✅ Database already initialized at", DB_PATH);
    db.close();
    return;
  }

  const sql = fs.readFileSync(MIGRATION_SQL, "utf-8");
  db.exec(sql);
  db.close();

  console.log("✅ Database initialized at", DB_PATH);
}

try {
  main();
} catch (e) {
  console.error("❌ DB init failed:", e);
  process.exit(1);
}
