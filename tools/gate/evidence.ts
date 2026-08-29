import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { sha256Normalized } from "./hash.ts";
import { gitDirty, gitHead, gitWriteTree } from "./git.ts";
import { isAllowedTestArgv, splitCmd } from "./testcmd.ts";

export type EvidenceReviewRun = {
  iss: string;
  command: string;
  exit_code: number;
  refused: boolean;
  /** DEC-177/182: new runs are append-only and identify their review round. */
  round?: number;
  recorded_at?: string;
  tree_hash?: string;
};

export type EvidenceReview = {
  status: string;
  implementer_harness?: string;
  reviewer_harness?: string;
  blocking_iss?: string[];
  repro_runs?: EvidenceReviewRun[];
  round?: number;
};

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
  review?: EvidenceReview;
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

/** C-33 对账: fields must match junit + allowlisted command; dirty tree is not done. */
export function evidenceGaps(ctx: Ctx, ev: Evidence | null): string[] {
  if (!ev) return ["verify.json missing"];
  const gaps: string[] = [];
  if (!ev.tree_hash) gaps.push("empty tree_hash");
  if (!evidenceFresh(ctx, ev)) gaps.push("stale tree_hash or nonzero exit_code");
  if (ev.dirty) gaps.push("dirty working tree");
  if (!isAllowedTestArgv(splitCmd(ev.command || ""))) {
    gaps.push(`command not allowlisted: ${ev.command}`);
  }
  const passed = ev.counts?.passed ?? 0;
  const failed = ev.counts?.failed ?? 0;
  if (passed === 0 && failed === 0) gaps.push("zero tests");
  if (failed > 0) gaps.push(`counts.failed=${failed}`);
  const junit = junitPath(ctx);
  if (!existsSync(junit)) {
    gaps.push("junit.xml missing");
  } else {
    const xml = readFileSync(junit, "utf8");
    if (sha256Normalized(xml) !== ev.report_hash) gaps.push("report_hash != sha256(junit.xml)");
    const rec = parseJunit(xml);
    if (rec.passed !== passed || rec.failed !== failed) {
      gaps.push("counts do not match junit.xml");
    }
  }
  const actor = ev.actor ?? { harness: "", model: "", session: "" };
  if (!(actor.harness ?? "").trim()) gaps.push("actor.harness empty");
  if (!(actor.model ?? "").trim()) gaps.push("actor.model empty");
  if (!(actor.session ?? "").trim()) gaps.push("actor.session empty");
  if (ev.review && ev.review.status === "passed") {
    const latest = new Map<string, EvidenceReviewRun>();
    for (const run of ev.review.repro_runs ?? []) latest.set(run.iss, run);
    for (const id of ev.review.blocking_iss ?? []) {
      const run = latest.get(id);
      if (!run) gaps.push(`review missing repro run for ${id}`);
      else if (!run.refused) gaps.push(`${id} repro still succeeds; cannot clear (REQ-027)`);
    }
    // DEC-177 keeps earlier vulnerable runs for audit. Only each ISS's latest
    // observation decides whether a passed review is actually clear.
    for (const run of latest.values()) {
      if (run.refused === false || run.exit_code === 0) {
        gaps.push(`${run.iss} repro exit=${run.exit_code}; not refused`);
      }
    }
  }
  return gaps;
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
