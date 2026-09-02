import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const INIT_COPY = [
  "AGENTS.md",
  "CLAUDE.md",
  "CONTEXT.md",
  "keel/templates",
  "keel/review/checklist.md",
  "tools/gate",
  ".githooks",
  ".gitattributes",
  ".agents/skills",
];

export const MACHINE_PATHS = [
  "tools/gate",
  ".githooks",
  ".agents/skills",
  ".claude/skills",
  "CLAUDE.md",
];

export const EXEC_REQUIRED = [
  ".githooks/pre-commit",
  ".githooks/pre-push",
  ".githooks/prepare-commit-msg",
  "tools/gate/gate.sh",
  "tools/gate/ci-trunk.sh",
];

export function installerRoot(metaUrl) {
  return resolve(dirname(fileURLToPath(metaUrl)), "..", "..");
}

export function readInstallerVersion(source) {
  const pkg = join(source, "package.json");
  if (!existsSync(pkg)) return "0.0.0";
  try {
    const j = JSON.parse(readFileSync(pkg, "utf8"));
    return typeof j.version === "string" && j.version ? j.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export function isAtLeast(current, min) {
  const parse = function (raw) {
    const cleaned = String(raw).replace(/^v/i, "").split("-")[0] || "0.0.0";
    const parts = cleaned.split(".").map(function (p) {
      return parseInt(p, 10) || 0;
    });
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  };
  const a = parse(current);
  const b = parse(min);
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return true;
}

export function flag(args, name) {
  const key = name.startsWith("-") ? name : "--" + name;
  const i = args.indexOf(key);
  if (i < 0) return undefined;
  const next = args[i + 1];
  if (!next || next.startsWith("-")) return "";
  return next;
}

export function hasFlag(args, name) {
  return args.includes(name.startsWith("-") ? name : "--" + name);
}

export function parseHuman(raw) {
  const m = String(raw).match(/^\s*(.+?)\s*<([^>]+)>\s*$/);
  if (m) return { name: (m[1] || "").trim(), email: (m[2] || "").trim() };
  if (raw.includes("@")) return { name: raw.trim(), email: raw.trim() };
  return { name: raw.trim(), email: "" };
}
