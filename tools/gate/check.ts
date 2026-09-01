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
import {
  completionReviewGaps,
  completionReviewWarnings,
  loopForCurrentPlan,
  reviewClearGaps,
} from "./reviewloop.ts";
import {
  approvalBinding,
  declaredStatusOf,
  declaresConfirmed,
  inspectApprovedArtifacts,
  inspectRequirementChangeChain,
  isPlanArtifact,
} from "./changechain.ts";
import { posixRel } from "./walk.ts";

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
  let chainBound = false;
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
      // fix does, and stands only with one worklog line per approval it touches —
      // 'gate-warn: G-req ref=<the APR that bound that artifact>' (fp:g-req-apr-waiver).
      const needed = [...new Set(chain.warnings.map((w) => w.apr))];
      return {
        ...warn(
          "G-req",
          chain.warnings.map((w) => w.text).join("; "),
          `typo fix: worklog line(s) ${needed.map((a) => `'gate-warn: G-req ref=${a}'`).join(" and ")}; semantic change: new version + re-approve (REQ-011/AC-4)`,
        ),
        waivers: needed,
      };
    }
    approvedChanges = chain.checked.length;
    chainBound = approvedChanges > 0;
  }
  // DEC-186: a current version that calls itself confirmed must be able to prove it —
  // an approved APR binds the file itself, or binds the approved CHG that produced it.
  const declared = declaredStatusOf(r.text);
  if (declaresConfirmed(declared)) {
    const binding = approvalBinding(ctx, posixRel(ctx.root, r.path));
    if (!binding.matched) {
      if (binding.boundBy.length === 0 && !chainBound) {
        return fail(
          "G-req",
          `${basename(r.path)} declares "${declared.slice(0, 40)}" but no approved APR binds it`,
          "gate approve APR-nnn as a human (or with a recorded delegation), or set the status back to proposed (DEC-186)",
        );
      }
      if (binding.boundBy.length > 0) return {
        ...warn(
          "G-req",
          `${basename(r.path)} body changed after its approval ${binding.boundBy.join("/")} (artifact hash mismatch)`,
          `typo fix: worklog line(s) ${binding.boundBy.map((a) => `'gate-warn: G-req ref=${a}'`).join(" and ")}; semantic change: new version + re-approve (DEC-185 / REQ-011/AC-4)`,
        ),
        waivers: binding.boundBy,
      };
    }
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
  // DEC-186: the current overview that calls itself confirmed must be bound by an approved APR.
  const declared = declaredStatusOf(body);
  if (declaresConfirmed(declared)) {
    const binding = approvalBinding(ctx, posixRel(ctx.root, planFile));
    if (!binding.matched) {
      if (binding.boundBy.length === 0) {
        return fail(
          "G-plan",
          `${p.file} declares "${declared.slice(0, 40)}" but no approved APR binds it`,
          "gate approve APR-nnn as a human (or with a recorded delegation), or set the status back to 工作规划/proposed (DEC-186)",
        );
      }
      return {
        ...warn(
          "G-plan",
          `${p.file} body changed after its approval ${binding.boundBy.join("/")} (artifact hash mismatch)`,
          `typo fix: worklog line(s) ${binding.boundBy.map((a) => `'gate-warn: G-plan ref=${a}'`).join(" and ")}; semantic change: new version + re-approve (DEC-185)`,
        ),
        waivers: binding.boundBy,
      };
    }
  }
  // DEC-185: plan-class artifacts of every approved APR are re-hashed here, in --quick,
  // so an in-place edit of a frozen plan reddens the very next pre-commit.
  const planDrift = inspectApprovedArtifacts(ctx).filter((d) => isPlanArtifact(d.path) && d.state !== "ok");
  const planMissing = planDrift.filter((d) => d.state === "missing");
  if (planMissing.length > 0) {
    return fail(
      "G-plan",
      `approved plan artifact missing: ${planMissing.map((d) => `${d.path} (${d.apr})`).join(", ")}`,
      "restore the file or supersede it with a new version + new APR (C-24 / DEC-185)",
    );
  }
  if (planDrift.length > 0) {
    const aprs = [...new Set(planDrift.map((d) => d.apr))];
    return {
      ...warn(
        "G-plan",
        `approved plan artifact(s) edited in place: ${planDrift.map((d) => `${d.path} (${d.apr})`).join(", ")}`,
        `typo fix: worklog line(s) ${aprs.map((a) => `'gate-warn: G-plan ref=${a}'`).join(" and ")}; semantic change: new plan version + re-approve (C-24 / DEC-185)`,
      ),
      waivers: aprs,
    };
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

// G-done — completion claims have fresh evidence and black-box coverage, and the
// plan-level review (REQ-027/AC-10, CHG-011) allows acceptance: passed → PASS
// (tree moved since → WARN), repairing → WARN, fused → FAIL; no disposition →
// PASS while features are still in progress, FAIL once every active feature has
// its summary and the review still has not run.
function gDone(ctx: Ctx): CheckItem {
  const summaries = summarizedFeatureDirs(ctx);
  const loop = loopForCurrentPlan(ctx);
  if (summaries.length === 0 && !loop) {
    if (!hasImplementationActivity(ctx)) return skip("G-done", "no completion claims (C-33)");
    return pass("G-done", "in progress: no completion claim yet; plan-level review not due (REQ-027)");
  }
  let ev: ReturnType<typeof readEvidence> = null;
  if (summaries.length > 0) {
    ev = readEvidence(ctx);
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
  }
  const revGaps = completionReviewGaps(ctx);
  if (revGaps.length > 0) {
    return fail("G-done", revGaps.join("; "), "plan-level review (k-review): pack → ingest → clear until passed (REQ-027)");
  }
  if (ev?.review) {
    const rg = reviewClearGaps(ev.review);
    if (rg.length > 0) {
      return fail("G-done", rg.join("; "), "re-run ISS repro commands; refused=true required");
    }
  }
  const revWarn = completionReviewWarnings(ctx);
  if (revWarn.length > 0) {
    // In progress, or the tree moved after a pass: visible, not red (CHG-011).
    // G-done cannot be waived, so the WARN is marked acknowledged instead.
    return {
      ...warn("G-done", revWarn.join("; "), "finish the loop (gate loop clear) or re-pack after code changes (REQ-027/AC-10)"),
      acknowledged: true,
    };
  }
  return pass(
    "G-done",
    loop
      ? "evidence 对账 + claimed AC trace + plan-level review passed"
      : "in progress: features without summary remain; plan-level review not yet due (REQ-027)",
  );
}

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
  // DEC-185: every bound artifact is re-hashed; drift after approval is a FAIL that
  // stands down only with a worklog line citing the APR that bound it (typo-level edits).
  const drift = inspectApprovedArtifacts(ctx).filter((d) => d.state !== "ok");
  const missing = drift.filter((d) => d.state === "missing");
  if (missing.length > 0) {
    return fail(
      "X-apr",
      `approved artifact missing: ${missing.map((d) => `${d.path} (${d.apr})`).join(", ")}`,
      "restore the file or supersede it with a new version + new APR (C-24 / DEC-185)",
    );
  }
  if (drift.length > 0) {
    const aprs = [...new Set(drift.map((d) => d.apr))];
    return {
      ...warn(
        "X-apr",
        `approved artifact(s) edited after approval: ${drift.map((d) => `${d.path} (${d.apr})`).join(", ")}`,
        `typo fix: worklog line(s) ${aprs.map((a) => `'gate-warn: X-apr ref=${a}'`).join(" and ")}; semantic change: new version + new APR (C-24 / DEC-185)`,
      ),
      waivers: aprs,
    };
  }
  return pass("X-apr", `${approved.length} approved APR(s): human author or recorded delegation; hashes bound and unchanged`);
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

/** C-103 waiver lines in the worklogs: `gate-warn: <check> ref=<record>`, one record per line. */
function waiverRefs(id: string, blob: string): string[] {
  const re = new RegExp(`gate-warn:\\s*${id}\\s+ref=((?:ISS|DEC|APR)-\\d+)`, "g");
  return [...blob.matchAll(re)].map((m) => m[1] ?? "").filter(Boolean);
}

function warnAcknowledged(ctx: Ctx, it: CheckItem, blob: string): boolean {
  if (NO_WAIVE.has(it.id)) return false;
  const refs = waiverRefs(it.id, blob);
  if (it.waivers && it.waivers.length > 0) {
    // Scoped WARN: every approval that bound a changed artifact must be cited by its
    // own line; an unrelated APR waives nothing (fp:g-req-apr-waiver).
    return it.waivers.every((need) => refs.includes(need) && recordRefExists(ctx, need));
  }
  const ref = refs.find((r) => !r.startsWith("APR-"));
  return Boolean(ref) && recordRefExists(ctx, ref as string) && refIsOpenIss(ctx, ref as string);
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
    if (warnAcknowledged(ctx, it, blob)) return it;
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
