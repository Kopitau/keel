import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { sha256Normalized } from "./hash.ts";
import { gitDirty, gitHead, gitWriteTree } from "./git.ts";

export type Evidence = {
  command: string;
  exit_code: number;
  started: string;
  finished: string;
  git_commit: string;
  tree_hash: string;
  dirty: boolean;
  report_hash: string;
  counts: { passed: number; failed: number; skipped: number };
  req_coverage: { [req: string]: number };
  stdout_tail_2kb: string;
  actor: { harness: string; model: string; session: string };
};

export function evidencePath(ctx: Ctx): string {
  return join(ctx.records, "evidence", "verify.json");
}

export function junitPath(ctx: Ctx): string {
  return join(ctx.records, "evidence", "junit.xml");
}

export function readEvidence(ctx: Ctx): Evidence | null {
  const p = evidencePath(ctx);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Evidence;
  } catch {
    return null;
  }
}

export function writeEvidence(ctx: Ctx, ev: Evidence): void {
  mkdirSync(join(ctx.records, "evidence"), { recursive: true });
  writeFileSync(evidencePath(ctx), JSON.stringify(ev, null, 2) + "\n", "utf8");
}

export function currentTree(ctx: Ctx): { hash: string; dirty: boolean; commit: string } {
  return { hash: gitWriteTree(ctx), dirty: gitDirty(ctx), commit: gitHead(ctx) };
}

export function evidenceFresh(ctx: Ctx, ev: Evidence | null): boolean {
  if (!ev) return false;
  const tree = gitWriteTree(ctx);
  return Boolean(tree) && ev.tree_hash === tree && ev.exit_code === 0;
}

export function parseJunit(xml: string): { passed: number; failed: number; skipped: number } {
  const attrTests = Number((xml.match(/\btests="(\d+)"/) ?? [])[1] ?? NaN);
  if (!Number.isNaN(attrTests)) {
    const failures = Number((xml.match(/\bfailures="(\d+)"/) ?? [])[1] ?? 0);
    const skipped = Number((xml.match(/\bskipped="(\d+)"/) ?? [])[1] ?? 0);
    const errors = Number((xml.match(/\berrors="(\d+)"/) ?? [])[1] ?? 0);
    const failed = failures + errors;
    return { passed: Math.max(0, attrTests - failed - skipped), failed, skipped };
  }
  const cases = (xml.match(/<testcase\b/g) ?? []).length;
  const failed = (xml.match(/<failure\b/g) ?? []).length;
  const skipped = (xml.match(/<skipped\b/g) ?? []).length;
  const passC = xml.match(/<!-- pass (\d+) -->/);
  if (passC) {
    return {
      passed: Number(passC[1]),
      failed: Number((xml.match(/<!-- fail (\d+) -->/) ?? [])[1] ?? failed),
      skipped: Number((xml.match(/<!-- skipped (\d+) -->/) ?? [])[1] ?? skipped),
    };
  }
  return { passed: Math.max(0, cases - failed - skipped), failed, skipped };
}

export function tail2kb(text: string): string {
  const bytes = 2048;
  if (text.length <= bytes) return text;
  return text.slice(text.length - bytes);
}

export function hashReport(xml: string): string {
  if (!xml) return "";
  return sha256Normalized(xml);
}
