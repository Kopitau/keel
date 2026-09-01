import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { sha256Normalized } from "./hash.ts";
import { git, gitDirty, gitHead, gitWriteTree } from "./git.ts";
import { posixRel } from "./walk.ts";
import { isAllowedTestArgv, splitCmd } from "./testcmd.ts";
import { mdFiles } from "./walk.ts";

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

// ---------------------------------------------------------------- DEC-187: evidence carried by an APR

/** The verify facts an approval freezes in its front matter (flat `evidence_*` keys). */
export type ApprovalEvidence = {
  apr: string;
  tree_hash: string;
  git_commit: string;
  command: string;
  exit_code: number;
  passed: number;
  failed: number;
  skipped: number;
  recorded_at: string;
};

export const APPROVAL_EVIDENCE_KEYS = [
  "evidence_tree_hash",
  "evidence_commit",
  "evidence_command",
  "evidence_exit_code",
  "evidence_passed",
  "evidence_failed",
  "evidence_skipped",
  "evidence_recorded_at",
] as const;

/** Front-matter lines `gate approve` writes when a fresh, green verify.json is on disk (DEC-187). */
export function approvalEvidenceLines(ev: Evidence): string[] {
  return [
    `evidence_tree_hash: ${ev.tree_hash}`,
    `evidence_commit: ${ev.git_commit}`,
    `evidence_command: "${(ev.command ?? "").replace(/"/g, "'")}"`,
    `evidence_exit_code: ${ev.exit_code}`,
    `evidence_passed: ${ev.counts?.passed ?? 0}`,
    `evidence_failed: ${ev.counts?.failed ?? 0}`,
    `evidence_skipped: ${ev.counts?.skipped ?? 0}`,
    `evidence_recorded_at: ${ev.finished || new Date().toISOString()}`,
  ];
}

/** The APR file is committed and byte-identical to HEAD: a snapshot typed into the working tree proves nothing. */
function approvalCommitted(ctx: Ctx, path: string): boolean {
  const rel = posixRel(ctx.root, path);
  if (git(ctx, ["ls-files", "--error-unmatch", "--", rel]).status !== 0) return false;
  return git(ctx, ["diff", "--quiet", "HEAD", "--", rel]).status === 0;
}

/** Every approved, committed APR that carries an evidence snapshot. */
export function readApprovalEvidence(ctx: Ctx, opts: { committedOnly?: boolean } = {}): ApprovalEvidence[] {
  const out: ApprovalEvidence[] = [];
  for (const path of mdFiles(join(ctx.records, "approvals"), "APR-")) {
    const { attrs } = parseFrontmatter(readFileSync(path, "utf8"));
    if ((attrs.status ?? "").toLowerCase() !== "approved") continue;
    const tree = (attrs.evidence_tree_hash ?? "").trim();
    if (!tree) continue;
    // keel/approvals is outside the tree hash (DEC-187), so the fallback only trusts
    // what a human identity actually committed — never eight lines still in the editor.
    if (opts.committedOnly !== false && !approvalCommitted(ctx, path)) continue;
    out.push({
      apr: (attrs.id ?? "").match(/^APR-\d+/)?.[0] ?? basename(path).match(/^APR-\d+/)?.[0] ?? basename(path),
      tree_hash: tree,
      git_commit: (attrs.evidence_commit ?? "").trim(),
      command: (attrs.evidence_command ?? "").trim(),
      exit_code: Number(attrs.evidence_exit_code ?? "1"),
      passed: Number(attrs.evidence_passed ?? "0"),
      failed: Number(attrs.evidence_failed ?? "0"),
      skipped: Number(attrs.evidence_skipped ?? "0"),
      recorded_at: (attrs.evidence_recorded_at ?? "").trim(),
    });
  }
  return out;
}

/**
 * DEC-187: with verify.json gone (local tier after a merge, worktree deleted) or
 * stale, an approved APR whose snapshot names the current tree and exited 0 is the
 * evidence. A moved tree matches nothing and the gate still asks for `gate verify`.
 */
export function evidenceViaApproval(ctx: Ctx): ApprovalEvidence | null {
  const tree = gitWriteTree(ctx);
  if (!tree) return null;
  for (const ev of readApprovalEvidence(ctx)) {
    if (ev.tree_hash === tree && ev.exit_code === 0 && ev.failed === 0 && ev.passed > 0) return ev;
  }
  return null;
}

export type EvidenceVerdict =
  | { ok: true; via: string; ev: Evidence | null }
  | { ok: false; gaps: string[] };

/**
 * verify.json when it is fresh and reconciles; otherwise an APR snapshot for this
 * very tree — but only when verify.json is absent or speaks about another tree. A
 * red or unreconciled verify.json for the current tree is the latest word on it
 * (ISS-061); an older approval never overrules it.
 */
export function evidenceVerdict(ctx: Ctx): EvidenceVerdict {
  const ev = readEvidence(ctx);
  const gaps = evidenceGaps(ctx, ev);
  if (gaps.length === 0) return { ok: true, via: "verify", ev };
  const tree = gitWriteTree(ctx);
  if (ev && tree && ev.tree_hash === tree) return { ok: false, gaps };
  const apr = evidenceViaApproval(ctx);
  if (apr) return { ok: true, via: apr.apr, ev };
  return { ok: false, gaps };
}
