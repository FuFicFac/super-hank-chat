import type { ChildProcessWithoutNullStreams } from "child_process";

/** Narrow view of the live subprocess for diagnostics and status routes */
export type HermesProcessHandle = {
  pid?: number;
  child?: ChildProcessWithoutNullStreams | null;
};
