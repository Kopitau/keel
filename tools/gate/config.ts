import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type JsonMap = { [key: string]: unknown };

/** REQ-025: profiles.active may be the string "unset" until F4. */
export function isProfileUnset(cfg: JsonMap): boolean {
  const profiles = (cfg.profiles ?? {}) as JsonMap;
  const active = profiles.active;
  if (active === "unset" || active === "") return true;
  if (Array.isArray(active)) {
    if (active.length === 0) return true;
    return String(active[0] ?? "") === "unset";
  }
  if (typeof active === "string" && active.toLowerCase() === "unset") return true;
  return false;
}

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
