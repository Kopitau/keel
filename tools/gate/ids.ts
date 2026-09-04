import { basename, join, relative } from "node:path";
import { git } from "./git.ts";
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

function recordsRel(ctx: Ctx): string {
  return relative(ctx.root, ctx.records).split("\\").join("/") || "keel";
}

/**
 * CHG-016: numbers already taken anywhere — this tree, every other worktree on disk
 * (their uncommitted records included) and every `keel/*` branch. Two worktrees that
 * each allocated DEC-021 / APR-006 / ISS-032 collided at merge in zhaoxi (DEC-033).
 */
export function listNumbersEverywhere(ctx: Ctx, kind: Kind): number[] {
  const nums = listNumbers(ctx, kind);
  const re = KIND_RE[kind];
  const dirRel = `${recordsRel(ctx)}/${KIND_DIR[kind]}`;
  const take = (name: string): void => {
    const m = re.exec(name);
    if (m) nums.push(Number.parseInt(m[1] ?? "0", 10));
  };
  const worktrees = git(ctx, ["worktree", "list", "--porcelain"]).stdout;
  for (const line of worktrees.split(/\r?\n/)) {
    const m = line.match(/^worktree (.+)$/);
    if (!m) continue;
    const dir = join(m[1]?.trim() ?? "", ...dirRel.split("/"));
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) take(name);
  }
  const refs = git(ctx, ["for-each-ref", "--format=%(refname:short)", "refs/heads/keel/"]).stdout;
  for (const ref of refs.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const ls = git(ctx, ["ls-tree", "--name-only", ref, `${dirRel}/`]).stdout;
    for (const p of ls.split(/\r?\n/)) take(basename(p.trim()));
  }
  return nums;
}

export function nextNumber(ctx: Ctx, kind: Kind): number {
  const nums = listNumbersEverywhere(ctx, kind);
  return nums.length === 0 ? 1 : Math.max(...nums) + 1;
}

/** CHG-016: ids present more than once in this tree (a merge that kept both sides). */
export function duplicateRecordIds(ctx: Ctx): string[] {
  const out: string[] = [];
  for (const kind of ["dec", "res", "iss", "chg", "apr"] as Kind[]) {
    const seen = new Map<number, number>();
    for (const n of listNumbers(ctx, kind)) seen.set(n, (seen.get(n) ?? 0) + 1);
    for (const [n, c] of seen) if (c > 1) out.push(`${kind.toUpperCase()}-${pad3(n)}`);
  }
  return out.sort();
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
    // CHG-016: cut first, then trim — a slice used to leave "...-withdrawal-.md".
    .slice(0, 40)
    .replace(/^-|-$/g, "");
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
