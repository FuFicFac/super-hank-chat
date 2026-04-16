/**
 * Spawns `hermes chat` with the same environment as the app adapter and writes one line to stdin.
 * Run: `npm run smoke:hermes -- "hello"`
 */
import { spawn } from "child_process";

const prompt = process.argv.slice(2).join(" ") || "Say hello in one short sentence.";

const cmd = process.env.HERMES_BIN ?? "hermes";
const child = spawn(cmd, ["chat"], {
  stdio: ["pipe", "pipe", "pipe"],
  shell: false,
  env: {
    ...process.env,
    TERM: "dumb",
    NO_COLOR: "1",
  },
});

console.error(`[smoke-hermes] pid=${child.pid} cmd=${cmd} chat`);

child.stdout.on("data", (b: Buffer) => {
  process.stdout.write(b.toString("utf8"));
});
child.stderr.on("data", (b: Buffer) => {
  process.stderr.write(`[stderr] ${b.toString("utf8")}`);
});
child.on("exit", (code, signal) => {
  console.error(`\n[smoke-hermes] exit code=${code} signal=${signal}`);
  process.exit(code ?? 0);
});
child.on("error", (err) => {
  console.error("[smoke-hermes] spawn error:", err);
  process.exit(1);
});

setTimeout(() => {
  child.stdin.write(`${prompt}\n`);
}, 300);

setTimeout(() => {
  console.error("\n[smoke-hermes] closing stdin");
  child.stdin.end();
}, 60_000);
