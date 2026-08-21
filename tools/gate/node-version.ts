export const MIN_NODE = "22.18.0";

export function parseVersion(raw: string): [number, number, number] {
  const cleaned = raw.replace(/^v/i, "").split("-")[0] ?? "0.0.0";
  const parts = cleaned.split(".").map((p) => Number.parseInt(p, 10) || 0);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function isAtLeast(current: string, min: string): boolean {
  const a = parseVersion(current);
  const b = parseVersion(min);
  for (let i = 0; i < 3; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return true;
}
