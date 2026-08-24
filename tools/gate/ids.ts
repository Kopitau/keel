import { basename, join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import type { Ctx } from "./ctx.ts";
import { sha256Normalized } from "./hash.ts";

export type Kind = "dec" | "res" | "iss" | "chg" | "oss" | "les" | "apr" | "feature";

const KIND_DIR: { [k in Kind]: string } = {
  dec: "decisions",
  res: "research",
  iss: "issues",
  chg: "changes",
  oss: "oss",
  les: "lessons",
  apr: "approvals",
  feature: "features",
};

const KIND_RE: { [k in Kind]: RegExp } = {
  dec: /^DEC-(\d+)/i,
  res: /^RES-(\d+)/i,
  iss: /^ISS-(\d+)/i,
  chg: /^CHG-(\d+)/i,
  oss: /^OSS-(\d+)/i,
  les: /^LES-(\d+)/i,
  apr: /^APR-(\d+)/i,
  feature: /^f(\d+)-/i,
};

export function kindDir(ctx: Ctx, kind: Kind): string {
  return join(ctx.records, KIND_DIR[kind]);
}

export function listNumbers(ctx: Ctx, kind: Kind): number[] {
  const dir = kindDir(ctx, kind);
  if (!existsSync(dir)) return [];
  const re = KIND_RE[kind];
  const nums: number[] = [];
  for (const name of readdirSync(dir)) {
    const m = re.exec(name);
    if (!m) continue;
    nums.push(Number.parseInt(m[1] ?? "0", 10));
  }
  return nums;
}

export function nextNumber(ctx: Ctx, kind: Kind): number {
  const nums = listNumbers(ctx, kind);
  return nums.length === 0 ? 1 : Math.max(...nums) + 1;
}

export function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function asciiSlug(title: string, fallback: string): string {
  const s = title
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  if (s) return s;
  return `${fallback}-${sha256Normalized(title).slice(0, 8)}`;
}

export function findFeatureDir(ctx: Ctx, featureId: string): string | null {
  const m = /^F-?(\d+)$/i.exec(featureId.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1] ?? "0", 10);
  const dir = kindDir(ctx, "feature");
  if (!existsSync(dir)) return null;
  const prefix = `f${pad2(n)}-`;
  const prefix3 = `f${pad3(n)}-`;
  for (const name of readdirSync(dir)) {
    if (name.startsWith(prefix) || name.startsWith(prefix3) || name === `f${n}`) {
      return join(dir, name);
    }
  }
  return null;
}

export function featureSlugFromDir(dir: string): string {
  return basename(dir);
}
