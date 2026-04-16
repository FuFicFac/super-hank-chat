import stripAnsi from "strip-ansi";

export function stripAnsiChunks(text: string): string {
  return stripAnsi(text);
}
