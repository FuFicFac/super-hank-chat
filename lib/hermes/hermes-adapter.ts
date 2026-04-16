import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { EventEmitter } from "eventemitter3";
import { HermesParser } from "./hermes-parser";

export type HermesAdapterEvents = {
  stdout: (plainDelta: string) => void;
  stderr: (plainDelta: string) => void;
  exit: (code: number | null, signal: NodeJS.Signals | null) => void;
  error: (err: Error) => void;
};

export type HermesSpawnOptions = {
  command?: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

const DEFAULT_CMD = process.env.HERMES_BIN ?? "hermes";

export class HermesAdapter extends EventEmitter<HermesAdapterEvents> {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private readonly parserOut = new HermesParser();
  private readonly parserErr = new HermesParser();

  get pid(): number | undefined {
    return this.proc?.pid;
  }

  isRunning(): boolean {
    return this.proc !== null && !this.proc.killed;
  }

  start(opts: HermesSpawnOptions = {}) {
    if (this.isRunning()) return;
    const cmd = opts.command ?? DEFAULT_CMD;
    const args = opts.args ?? ["chat"];
    const child = spawn(cmd, args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
      cwd: opts.cwd,
      env: {
        ...process.env,
        TERM: "dumb",
        NO_COLOR: "1",
        ...opts.env,
      },
    });
    this.proc = child;
    this.parserOut.reset();
    this.parserErr.reset();

    child.stdout.on("data", (buf: Buffer) => {
      const delta = this.parserOut.pushRaw(buf.toString("utf8"));
      if (delta) this.emit("stdout", delta);
    });
    child.stderr.on("data", (buf: Buffer) => {
      const delta = this.parserErr.pushRaw(buf.toString("utf8"));
      if (delta) this.emit("stderr", delta);
    });
    child.on("error", (err) => this.emit("error", err));
    child.on("exit", (code, signal) => {
      this.emit("exit", code, signal);
      this.proc = null;
    });
  }

  sendMessage(text: string) {
    if (!this.proc?.stdin.writableEnded) {
      this.proc?.stdin.write(text.endsWith("\n") ? text : `${text}\n`);
    }
  }

  stop() {
    const p = this.proc;
    if (!p) return;
    try {
      p.stdin.end();
    } catch {
      /* ignore */
    }
    if (!p.killed) {
      p.kill("SIGTERM");
      const t = setTimeout(() => {
        if (!p.killed) p.kill("SIGKILL");
      }, 4000);
      t.unref?.();
    }
    this.proc = null;
  }
}
