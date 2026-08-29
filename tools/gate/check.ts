import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { readCurrent } from "./indexgen.ts";
import { formatCheck, type CheckItem, type CmdResult } from "./result.ts";
import { mdFiles } from "./walk.ts";
import { evidenceGaps, readEvidence } from "./evidence.ts";
import { gitLastAuthor, gitLastBody } from "./git.ts";
import { commitLooksAgentMade } from "./harness.ts";
import { collectBypassFindings } from "./bypass.ts";
import { claimedReqs, traceWarnings, uncoveredClaimed } from "./trace.ts";
import { computeFrontier } from "./frontier.ts";
import { completionReviewGaps, reviewClearGaps } from "./reviewloop.ts";
import { inspectRequirementChangeChain } from "./changechain.ts";

/**
 * The gate after CHG-011 (DEC-183): eight checks, and every one of them judges
 * whether "done" is true — baseline exists, plan is unique, evidence is bound to
 * the tree, claimed acceptance criteria have black-box tests, nobody bypassed the
 * hooks, approvals carry a human's decision. Nothing here judges the *shape* of
 * a record; that lives in the skills (N5).
 */
function pass(id: string, summary: string): CheckItem {
  return { id, verdict: "pass", summary };
}
function warn(id: string, summary: string, fix: string): CheckItem {
  return { id, verdict: "warn", summary, fix };
}
function fail(id: string, summary: string, fix: string): CheckItem {
  return { id, verdict: "fail", summary, fix };
}
function skip(id: string, summary: string): CheckItem {
  return { id, verdict: "skip", summary };
}

/** Checks that run only in the full gate (git history / evidence), not in the pre-commit quick pass. */
export const QUICK_SKIPPED_IDS = ["G-done", "G-merge", "X-evidence", "X-apr"];

export function liveClarifications(text: string): number {
  let n = 0;
  for (const line of text.split(/\n/)) {
    if (!line.includes("[NEEDS-CLARIFICATION")) continue;
    if (/`[^`]*\[NEEDS-CLARIFICATION/.test(line)) continue;
    if (/标\s*\[NEEDS-CLARIFICATION/.test(line)) continue;
    n += 1;
  }
  return n;
}

function currentReq(ctx: Ctx): { path: string; text: string } | { error: string } {
  const idx = join(ctx.records, "requirements", "INDEX.md");
  const cur = readCurrent(idx);
  if (cur.error || !cur.file) return { error: cur.error ?? "no current requirements" };
  const path = join(ctx.records, "requirements", cur.file);
  if (!existsSync(path)) return { error: `missing ${cur.file}` };
  return { path, text: readFileSync(path, "utf8") };
}

/** Objective traces of implementation (DEC-158). Empty features/ does not count. */
export function hasImplementationActivity(ctx: Ctx): boolean {
  const feats = join(ctx.records, "features");
  if (!existsSync(feats)) return false;
  let names: string[] = [];
  try {
    names = readdirSync(feats);
  } catch {
    return false;
  }
  for (const name of names) {
    const p = join(feats, name);
    try {
      const st = statSync(p);
      if (st.isDirectory() || st.isFile()) return true;
    } catch {
      continue;
    }
  }
  return false;
}

/** REQ rows in a requirements file (C-04). */
export function reqEntryCount(text: string): number {
  return (text.match(/^##\s+REQ-\d+/gm) ?? []).length;
}

/** A confirmed row is the marker that a baseline was taken (C-06). */
export function confirmedReqCount(text: string): number {
  return (text.match(/^\s*-\s*\*\*status\*\*:\s*confirmed\b/gm) ?? []).length;
}

// G-req — a requirements baseline exists, is unique, has no live fog markers, and
// every confirmed requirement's producing CHG is approved and APR-bound.
function gReq(ctx: Ctx): CheckItem {
  const r = currentReq(ctx);
  const activity = hasImplementationActivity(ctx);
  if ("error" in r) {
    if (!activity) return skip("G-req", "尚未开始，跑 k-new 建立需求基线");
    return fail("G-req", r.error, "point requirements/INDEX.md at a single vN.md");
  }
  const entries = reqEntryCount(r.text);
  const n = liveClarifications(r.text);
  if (n > 0) {
    return fail(
      "G-req",
      `${n} [NEEDS-CLARIFICATION] marker(s) in current requirements`,
      "resolve markers or move open branches into the 未决问题 section before baseline (C-05)",
    );
  }
  let approvedChanges = 0;
  if (confirmedReqCount(r.text) > 0) {
    const chain = inspectRequirementChangeChain(ctx, r.path, r.text);
    if (chain.gaps.length > 0) {
      return fail(
        "G-req",
        chain.gaps.join("; "),
        "approve each producing CHG and bind its body hash in an approved APR (REQ-011/AC-5)",
      );
    }
    if (chain.warnings.length > 0) {
      // CHG-011: freezing binds semantics. Metadata never moves the body hash; a typo
      // fix does, and stands with a worklog line 'gate-warn: G-req ref=APR-nnn'.
      return warn(
        "G-req",
        chain.warnings.join("; "),
        "typo fix: worklog 'gate-warn: G-req ref=APR-nnn'; semantic change: new version + re-approve (REQ-011/AC-4)",
      );
    }
    approvedChanges = chain.checked.length;
  }
  if (!r.text.includes("未决问题")) {
    return warn("G-req", "no 未决问题 section", "add the section even if empty (C-05)");
  }
  const chainSummary = approvedChanges > 0 ? `; ${approvedChanges} producing CHG(s) APR-bound` : "";
  return pass("G-req", `${entries} REQ entr(ies), no NEEDS-CLARIFICATION${chainSummary}`);
}

// G-plan — one current overview with a coupling table; feature plans' blocked_by is sane.
function gPlan(ctx: Ctx): CheckItem {
  const planIdx = join(ctx.records, "plan", "INDEX.md");
  const reqIdx = join(ctx.records, "requirements", "INDEX.md");
  const p = readCurrent(planIdx);
  const r = readCurrent(reqIdx);
  const activity = hasImplementationActivity(ctx);
  const multi =
    (p.error && p.error.includes("multiple")) || (r.error && r.error.includes("multiple"));
  if (multi) {
    return fail("G-plan", `INDEX: ${p.error ?? r.error}`, "run: gate index (C-24)");
  }
  const noPlan = Boolean(p.error || !p.file || !existsSync(join(ctx.records, "plan", p.file ?? "")));
  if (!activity && noPlan) {
    return skip("G-plan", "尚未开始，跑 k-new 建立需求基线");
  }
  if (p.error) return fail("G-plan", `plan INDEX: ${p.error}`, "run: gate index (C-24)");
  if (r.error) return fail("G-plan", `requirements INDEX: ${r.error}`, "run: gate index (C-63)");
  const planFile = join(ctx.records, "plan", p.file ?? "");
  if (!existsSync(planFile)) return fail("G-plan", `current plan missing: ${p.file}`, "fix INDEX current");
  const body = readFileSync(planFile, "utf8");
  if (!body.includes("接口与耦合") && !body.includes("| I-")) {
    return fail("G-plan", "current overview has no coupling table", "add 接口与耦合 (C-24/C-38)");
  }
  const fr = computeFrontier(ctx);
  if (fr.problems.length > 0) {
    return fail(
      "G-plan",
      `blocked_by: ${fr.problems.join("; ")}`,
      "fix blocked_by in the feature plan front matter — existing feature ids, no self-reference, no cycle (DEC-169)",
    );
  }
  return pass("G-plan", `unique current ${p.file} / ${r.file}; frontier ${fr.frontier.length}, blocked ${fr.blocked.length}`);
}

function summarizedFeatureDirs(ctx: Ctx): string[] {
  const feats = join(ctx.records, "features");
  const out: string[] = [];
  if (!existsSync(feats)) return out;
  for (const name of readdirSync(feats)) {
    if (existsSync(join(feats, name, "summary.md"))) out.push(name);
  }
  return out;
}

// G-done — a feature that claims completion has fresh evidence, black-box coverage
// of its acceptance criteria, and the plan-level review has passed.
function gDone(ctx: Ctx): CheckItem {
  const summaries = summarizedFeatureDirs(ctx);
  if (summaries.length === 0) {
    return skip("G-done", "no completion claims (C-33)");
  }
  const ev = readEvidence(ctx);
  if (!ev) {
    return fail(
      "G-done",
      `summary.md present (${summaries.join(", ")}) but verify.json missing`,
      "run: gate verify (C-33). Missing evidence is fail, not skip (ISS-002)",
    );
  }
  const gaps = evidenceGaps(ctx, ev);
  if (gaps.length > 0) {
    return fail("G-done", gaps.join("; "), "run: gate verify (C-33 对账)");
  }
  const missing = uncoveredClaimed(ctx);
  if (missing.length > 0) {
    return fail("G-done", `claimed ACs uncovered: ${missing.join(", ")}`, "C-33/C-32 mark black-box tests REQ-nnn/AC-i");
  }
  const revGaps = completionReviewGaps(ctx);
  if (revGaps.length > 0) {
    return fail("G-done", revGaps.join("; "), "plan-level review (k-review); do not accept until status=passed (REQ-027)");
  }
  if (ev.review) {
    const rg = reviewClearGaps(ev.review);
    if (rg.length > 0) {
      return fail("G-done", rg.join("; "), "re-run ISS repro commands; refused=true required");
    }
  }
  return pass("G-done", "evidence 对账 + claimed AC trace + plan-level review passed");
}

// X-evidence — verify.json is bound to the tree. Stale evidence is a WARN during
// daily work (CHG-011: a dirty tree must not paint the gate red); it becomes a
// FAIL only where completion or merge is judged (G-done / G-merge).
// X-evidence — full check only (CHG-011): judged when done or merge is claimed,
// never in --quick, so a dirty daily tree does not redden the hook.
function xEvidence(ctx: Ctx): CheckItem {
  const ev = readEvidence(ctx);
  if (!ev) {
    const summaries = summarizedFeatureDirs(ctx);
    if (summaries.length === 0) {
      return skip("X-evidence", "no verify.json yet; run gate verify before claiming done (C-33)");
    }
    return fail(
      "X-evidence",
      `summary.md present (${summaries.join(", ")}) but verify.json missing`,
      "run: gate verify (C-33). Missing evidence is fail, not skip (ISS-002)",
    );
  }
  const gaps = evidenceGaps(ctx, ev);
  if (gaps.length > 0) {
    return fail("X-evidence", gaps.join("; "), "run: gate verify before claiming done or merging (C-33)");
  }
  return pass("X-evidence", `fresh tree ${ev.tree_hash.slice(0, 12)}…; junit 对账`);
}

function openIssueIds(ctx: Ctx): string[] {
  const dir = join(ctx.records, "issues");
  const out: string[] = [];
  for (const f of mdFiles(dir, "ISS-")) {
    const { attrs } = parseFrontmatter(readFileSync(f, "utf8"));
    const st = (attrs.status ?? "").toLowerCase();
    if (st === "open" || st === "") out.push(attrs.id || basename(f));
  }
  return out;
}

// G-merge — before merging: fresh evidence, trace green, no open issues, an approved APR.
function gMerge(ctx: Ctx): CheckItem {
  const aprDir = join(ctx.records, "approvals");
  let approved = 0;
  if (existsSync(aprDir)) {
    for (const n of readdirSync(aprDir)) {
      if (!n.startsWith("APR-") || !n.endsWith(".md")) continue;
      const { attrs } = parseFrontmatter(readFileSync(join(aprDir, n), "utf8"));
      if ((attrs.status ?? "") === "approved") approved += 1;
    }
  }
  if (approved === 0) {
    return skip("G-merge", "no approved APR; merge gate applies at merge time (C-45)");
  }
  const gaps = evidenceGaps(ctx, readEvidence(ctx));
  if (gaps.length > 0) {
    return fail("G-merge", `evidence: ${gaps.join("; ")}`, "run: gate verify (C-45)");
  }
  const missing = uncoveredClaimed(ctx);
  if (missing.length > 0) {
    return fail("G-merge", `trace not green: ${missing.join(", ")}`, "C-45");
  }
  const blocking = openIssueIds(ctx);
  if (blocking.length > 0) {
    return fail("G-merge", `open issues: ${blocking.join(", ")}`, "close or wontfix blocking ISS (C-45)");
  }
  return pass("G-merge", `${approved} approved APR; evidence+trace green; no open ISS`);
}

// X-apr — an approved APR was committed by a human, or by an agent under a recorded
// delegation, and actually binds artifact hashes (ISS-053).
function xApr(ctx: Ctx): CheckItem {
  const aprDir = join(ctx.records, "approvals");
  if (!existsSync(aprDir)) return skip("X-apr", "no approvals dir");
  const identities = (ctx.config.identities ?? {}) as {
    agents?: { name?: string; email?: string }[];
    humans?: { name?: string; email?: string }[];
  };
  const agents = identities.agents ?? [];
  const approved: string[] = [];
  for (const n of readdirSync(aprDir)) {
    if (!n.startsWith("APR-") || !n.endsWith(".md")) continue;
    const rel = join("keel", "approvals", n).split("\\").join("/");
    const abs = join(aprDir, n);
    const raw = readFileSync(abs, "utf8");
    const { attrs } = parseFrontmatter(raw);
    if ((attrs.status ?? "") !== "approved") continue;
    approved.push(n);
    if (/content_sha256:\s*pending\b/.test(raw)) {
      return fail(
        "X-apr",
        `${n} is approved but an artifact hash is still pending`,
        "re-run gate approve so every artifact carries its normalized hash (C-106 / ISS-053)",
      );
    }
    if ((identities.humans ?? []).length === 0) {
      return fail("X-apr", `${n} is approved but identities.humans is empty`, "C-107");
    }
    const author = gitLastAuthor(ctx, rel);
    const email = author.email.toLowerCase();
    const name = author.name.toLowerCase();
    const agentHit = agents.some(
      (a) =>
        (a.email && a.email.toLowerCase() === email) ||
        (a.name && a.name.toLowerCase() === name),
    );
    if (agentHit) {
      return fail(
        "X-apr",
        `${n} last commit author ${author.name} <${author.email}> is an agent`,
        "rewrite the APR commit with a human identity (C-107)",
      );
    }
    // DEC-166: judge the trailers the environment writes — an agent-made commit is
    // legitimate only when the APR records the user's delegation.
    if (commitLooksAgentMade(gitLastBody(ctx, rel)) && !(attrs.delegated ?? "").trim()) {
      return fail(
        "X-apr",
        `${n} commit carries agent trailers but the APR records no delegation`,
        "add 'delegated: <用户原话+日期>' to the APR, or have the human recommit (C-107/DEC-166)",
      );
    }
  }
  if (approved.length === 0) return pass("X-apr", "no approved APR commits to check");
  return pass("X-apr", `${approved.length} approved APR(s): human author or recorded delegation; hashes bound`);
}

// X-bypass — hooks skipped, hooksPath moved, tests dir gone, CI workflow weakened (C-105).
function xBypass(ctx: Ctx): CheckItem {
  const findings = collectBypassFindings(ctx);
  if (findings.length === 0) {
    return pass("X-bypass", "no Keel-Precommit: skipped in last 50; CI/tests-dir intact");
  }
  const first = findings[0];
  const extra = findings.length > 1 ? ` (+${findings.length - 1} more)` : "";
  return warn("X-bypass", `${first?.summary ?? "bypass"}${extra}`, first?.fix ?? "C-105");
}

const TRACE_FIX =
  "only black-box acceptance tests carry REQ-nnn/AC-i; a stand-in says [proxy:<release condition>]; regression/guard names start with ISS-/DEC-/fp: (DEC-168)";

// X-trace — every claimed acceptance criterion has a black-box test (or an honest proxy).
function xTrace(ctx: Ctx): CheckItem {
  const claimed = claimedReqs(ctx);
  // Gaps first: a claimed feature whose plan names no REQ must not read as "nothing claimed" (ISS-044).
  const missing = uncoveredClaimed(ctx);
  if (missing.length > 0) {
    return fail(
      "X-trace",
      `uncovered acceptance criteria: ${missing.join(", ")}`,
      "add req: [REQ-nnn] to the feature plan front matter (ISS-044); mark black-box acceptance tests REQ-nnn/AC-i (C-32 / ISS-020 / DEC-168)",
    );
  }
  const { proxies, whitebox } = traceWarnings(ctx, claimed);
  if (claimed.length === 0 && whitebox.length === 0) {
    return pass("X-trace", "no claimed-done features (C-32 scope = 验收范围)");
  }
  const notes: string[] = [];
  if (proxies.length > 0) notes.push(`proxy coverage, WARN not PASS: ${proxies.join(", ")}`);
  if (whitebox.length > 0) notes.push(`white-box names carry AC markers: ${whitebox.join(", ")}`);
  if (notes.length > 0) {
    // The reason is in the test name itself; C-103 does not escalate it (DEC-168).
    return { ...warn("X-trace", notes.join("; "), TRACE_FIX), acknowledged: true };
  }
  return pass("X-trace", "claimed acceptance criteria covered by black-box tests in tests/");
}

const NO_WAIVE = new Set(["X-trace", "G-done", "G-merge", "X-bypass"]);

function recordRefExists(ctx: Ctx, ref: string): boolean {
  if (ref.startsWith("ISS-")) {
    return mdFiles(join(ctx.records, "issues"), "ISS-").some((f) => basename(f).startsWith(ref));
  }
  if (ref.startsWith("DEC-")) {
    return mdFiles(join(ctx.records, "decisions"), "DEC-").some((f) => basename(f).startsWith(ref));
  }
  if (ref.startsWith("APR-")) {
    // REQ-011/AC-4: a typo fix in an approved artifact cites the approval it keeps.
    return mdFiles(join(ctx.records, "approvals"), "APR-").some((f) => basename(f).startsWith(ref));
  }
  return false;
}

function refIsOpenIss(ctx: Ctx, ref: string): boolean {
  if (!ref.startsWith("ISS-")) return true;
  const file = mdFiles(join(ctx.records, "issues"), "ISS-").find((f) => basename(f).startsWith(ref));
  if (!file) return false;
  const { attrs } = parseFrontmatter(readFileSync(file, "utf8"));
  return (attrs.status ?? "") === "open";
}

function warnAcknowledged(ctx: Ctx, id: string, blob: string): boolean {
  if (NO_WAIVE.has(id)) return false;
  const re = new RegExp(`gate-warn:\\s*${id}\\s+ref=(ISS-\\d+|DEC-\\d+|APR-\\d+)`);
  const m = blob.match(re);
  if (!m?.[1]) return false;
  const ref = m[1];
  return recordRefExists(ctx, ref) && refIsOpenIss(ctx, ref);
}

/** C-103: a WARN stands only when a worklog line cites an open ISS or a DEC; otherwise it is a FAIL. */
function warnWorklogCovered(ctx: Ctx, items: CheckItem[]): CheckItem[] {
  const logs: string[] = [];
  const feat = join(ctx.records, "features");
  if (existsSync(feat)) {
    for (const name of readdirSync(feat)) {
      const p = join(feat, name, "worklog.md");
      if (existsSync(p)) logs.push(readFileSync(p, "utf8"));
    }
  }
  const blob = logs.join("\n");
  return items.map((it) => {
    if (it.verdict !== "warn") return it;
    if (it.acknowledged) return it;
    if (warnAcknowledged(ctx, it.id, blob)) return it;
    return {
      ...it,
      verdict: "fail" as const,
      summary: `${it.summary} (warn not acknowledged)`,
      fix: `${it.fix ?? ""} worklog line 'gate-warn: ${it.id} ref=ISS-nnn' citing an open ISS or a DEC (C-103/ISS-005)`,
    };
  });
}

export function runCheck(ctx: Ctx, args: string[]): CmdResult {
  const quick = args.includes("--quick");
  const items: CheckItem[] = [];
  items.push(gReq(ctx));
  items.push(gPlan(ctx));
  items.push(xTrace(ctx));
  items.push(xBypass(ctx));
  if (!quick) {
    items.push(gDone(ctx));
    items.push(gMerge(ctx));
    items.push(xEvidence(ctx));
    items.push(xApr(ctx));
  }
  return formatCheck(warnWorklogCovered(ctx, items));
}
