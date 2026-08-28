import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type JsonMap = { [key: string]: unknown };

/** REQ-025: profiles.active may be the string "unset" until F4. */
export function isProfileUnset(cfg: JsonMap): boolean {
  const profiles = (cfg.profiles ?? {}) as JsonMap;
  const active = profiles.active;
  // A configured profile is always a one-item array in the executable 0.8.0
  // selector. Missing, malformed, or multi-profile values fail closed instead
  // of silently falling back to `node --test` and ignoring part of the config.
  if (!Array.isArray(active) || active.length !== 1) return true;
  const name = String(active[0] ?? "");
  if (!name || name === "unset") return true;
  const selected = profiles[name];
  return !selected || typeof selected !== "object";
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
