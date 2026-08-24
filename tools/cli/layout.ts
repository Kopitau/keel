import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Eight copy groups from k-init + skills (DEC-157). config.json is written clean, not copied. */
export const INIT_COPY = [
  "AGENTS.md",
  "CLAUDE.md",
  "CONTEXT.md",
  "keel/templates",
  "tools/gate",
  ".githooks",
  ".gitattributes",
  ".agents/skills",
] as const;

export const MACHINE_PATHS = [
  "tools/gate",
  ".githooks",
  ".agents/skills",
  ".claude/skills",
  "CLAUDE.md",
] as const;

export function installerRoot(metaUrl: string): string {
  return resolve(dirname(fileURLToPath(metaUrl)), "..", "..");
}

export function readInstallerVersion(source: string): string {
  const pkg = join(source, "package.json");
  if (!existsSync(pkg)) return "0.0.0";
  try {
    const j = JSON.parse(readFileSync(pkg, "utf8")) as { version?: string };
    return typeof j.version === "string" && j.version ? j.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export function flag(args: string[], name: string): string | undefined {
  const key = name.startsWith("-") ? name : `--${name}`;
  const i = args.indexOf(key);
  if (i < 0) return undefined;
  const next = args[i + 1];
  if (!next || next.startsWith("-")) return "";
  return next;
}

export function hasFlag(args: string[], name: string): boolean {
  return args.includes(name.startsWith("-") ? name : `--${name}`);
}

export function parseHuman(raw: string): { name: string; email: string } {
  const m = raw.match(/^\s*(.+?)\s*<([^>]+)>\s*$/);
  if (m) return { name: (m[1] ?? "").trim(), email: (m[2] ?? "").trim() };
  if (raw.includes("@")) return { name: raw.trim(), email: raw.trim() };
  return { name: raw.trim(), email: "" };
}
