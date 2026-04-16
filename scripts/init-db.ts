/**
 * Initializes the SQLite database by running the raw migration SQL directly.
 * This avoids drizzle-orm's migrator which had partial-application issues with sql.js.
 */
import fs from "fs";
import path from "path";
import initSqlJs from "sql.js";

const DB_PATH = path.join(process.cwd(), "data", "hank-chat.db");
const MIGRATION_SQL = path.join(process.cwd(), "drizzle", "0000_init.sql");

async function main() {
  // Ensure data dir exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Load sql.js WASM
  const wasmPath = path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm");
  const wasmBuf = fs.readFileSync(wasmPath);
  const SQL = await initSqlJs({
    wasmBinary: wasmBuf.buffer.slice(wasmBuf.byteOffset, wasmBuf.byteOffset + wasmBuf.byteLength),
  });

  // Open or create DB
  let db: initSqlJs.Database;
  if (fs.existsSync(DB_PATH)) {
    const fileBuf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(new Uint8Array(fileBuf.buffer.slice(fileBuf.byteOffset, fileBuf.byteOffset + fileBuf.byteLength)));
  } else {
    db = new SQL.Database();
  }

  // Apply migration SQL
  const sql = fs.readFileSync(MIGRATION_SQL, "utf-8");
  db.run(sql);

  // Persist
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();

  console.log("✅ Database initialized successfully at", DB_PATH);
}

main().catch((e) => {
  console.error("❌ DB init failed:", e);
  process.exit(1);
});