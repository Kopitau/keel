import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type JsonMap = { [key: string]: unknown };

export function loadConfig(recordsDir: string): JsonMap {
  const path = join(recordsDir, "config.json");
  if (!existsSync(path)) return {};
  const raw = JSON.parse(readFileSync(path, "utf8")) as JsonMap;
  const out: JsonMap = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!k.startsWith("_")) out[k] = v;
  }
  return out;
}
