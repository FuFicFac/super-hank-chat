import { spawnSync } from "child_process";
import { initDbSingleton, pingDb } from "@/lib/db/client";

export const runtime = "nodejs";

function hermesBinaryStatus(): "ok" | "missing" | "unknown" {
  const bin = process.env.HERMES_BIN ?? "hermes";
  const r = spawnSync(bin, ["--version"], {
    encoding: "utf8",
    env: { ...process.env, TERM: "dumb", NO_COLOR: "1" },
  });
  if (r.error && (r.error as NodeJS.ErrnoException).code === "ENOENT") {
    return "missing";
  }
  if (r.status === 0 || r.stdout) return "ok";
  const which = spawnSync("/bin/sh", ["-c", `command -v ${bin}`], { encoding: "utf8" });
  if (which.status === 0 && which.stdout?.trim()) return "unknown";
  return "missing";
}

export async function GET() {
  let database: "ok" | "error" = "ok";
  try {
    await initDbSingleton();
    pingDb();
  } catch {
    database = "error";
  }
  const hermesBinary = hermesBinaryStatus();
  return Response.json({
    ok: database === "ok",
    database,
    hermesBinary,
  });
}
