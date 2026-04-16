import { stripAnsiChunks } from "./strip-ansi";

/**
 * Normalizes raw CLI stdout: strips ANSI and normalizes line endings.
 * Response boundaries are determined by the registry idle timer, not this parser.
 */
export class HermesParser {
  private buffer = "";

  reset() {
    this.buffer = "";
  }

  /** Append raw chunk; returns newly visible plain text since last call (incremental). */
  pushRaw(chunk: string): string {
    const cleaned = stripAnsiChunks(chunk).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    this.buffer += cleaned;
    return cleaned;
  }

  getBuffer(): string {
    return this.buffer;
  }
}
