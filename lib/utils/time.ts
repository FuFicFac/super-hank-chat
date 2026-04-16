export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function nowUnixMs(): number {
  return Date.now();
}
