import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter, readAttrList } from "./frontmatter.ts";
import { gitHooksPath } from "./git.ts";
import { readCurrent } from "./indexgen.ts";
import { listNumbers } from "./ids.ts";
import { formatCheck, type CheckItem, type CmdResult } from "./result.ts";
import { listFiles, posixRel } from "./walk.ts";
import { mdFiles } from "./walk.ts";
import { evidenceGaps, readEvidence } from "./evidence.ts";
import { casefoldCollisions, gitCommitUnix, gitDir, gitLastAuthor, gitLastBody, gitLsFiles } from "./git.ts";
import { commitLooksAgentMade } from "./harness.ts";
import { inspectSkills, listSkillDirs } from "./skills.ts";
import { measureAutoload } from "./autoload.ts";
import { collectBypassFindings } from "./bypass.ts";
import { countKnowledge } from "./knowledge.ts";
import { inspectOss, inspectResOss } from "./osscheck.ts";
import { execModeGaps } from "./execmode.ts";
import { gapHuntGaps } from "./gaphunt.ts";
import { inspectResCitations, inspectResSubstance } from "./rescheck.ts";
import { pendingCandidates, summarizedFeatures } from "./candidates.ts";
import { claimedReqs, inspectVerificationProtocol, traceWarnings, uncoveredClaimed } from "./trace.ts";
import { computeFrontier } from "./frontier.ts";
import { testBaselineGaps, headBaseline, worktreeBaseline, testFileInventory } from "./testbase.ts";
import { completionReviewGaps, reviewClearGaps } from "./reviewloop.ts";
import { inspectRequirementChangeChain } from "./changechain.ts";
import { inspectIssueProtocol } from "./issues.ts";
import { inspectDecisionTransitions } from "./decisions.ts";
import { relevantLessons } from "./lessons.ts";

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

/** Check ids that `--quick` does not run. Each must be named in a full-check test (R5 / ISS-019). */
export const QUICK_SKIPPED_IDS = [
  "G-done",
  "G-merge",
  "G-retro",
  "X-evidence",
  "X-types",
  "X-hooks",
  "X-apr",
];

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

function resCount(ctx: Ctx): number {
  return mdFiles(join(ctx.records, "research"), "RES-").length;
}

/** REQ rows in a requirements file (C-04). */
export function reqEntryCount(text: string): number {
  return (text.match(/^##\s+REQ-\d+/gm) ?? []).length;
}

/** A confirmed row is the marker that a baseline was taken (C-06). */
export function confirmedReqCount(text: string): number {
  return (text.match(/^\s*-\s*\*\*status\*\*:\s*confirmed\b/gm) ?? []).length;
}

function gReq(ctx: Ctx): CheckItem {
  const r = currentReq(ctx);
  const activity = hasImplementationActivity(ctx);
  const research = resCount(ctx);
  let approvedChanges = 0;
  let verifiedReqs = 0;
  const ORDER_FIX = "land REQ entries in keel/requirements/vN.md first (k-new sequence F1 -> F2; C-04/C-05)";
  if ("error" in r) {
    if (research > 0) {
      return fail("G-req", `${research} RES record(s) but no current requirements`, ORDER_FIX);
    }
    if (!activity) {
      return skip("G-req", "尚未开始，跑 k-new 建立需求基线");
    }
    return fail("G-req", r.error, "point requirements/INDEX.md at a single vN.md");
  }
  const entries = reqEntryCount(r.text);
  if (research > 0 && entries === 0) {
    return fail("G-req", `${research} RES record(s) but 0 REQ entries in ${basename(r.path)}`, ORDER_FIX);
  }
  const n = liveClarifications(r.text);
  if (n > 0) {
    return fail(
      "G-req",
      `${n} [NEEDS-CLARIFICATION] marker(s) in current requirements`,
      "resolve markers or move open branches into the 未决问题 section before baseline (C-05)",
    );
  }
  const verification = inspectVerificationProtocol(r.text);
  if (verification.gaps.length > 0) {
    const shown = verification.gaps.slice(0, 4).join("; ");
    const more = verification.gaps.length > 4 ? ` (+${verification.gaps.length - 4} more)` : "";
    return fail(
      "G-req",
      `verification protocol: ${shown}${more}`,
      "make each acceptance/verification array equal length; use only auto, machine-doc, manual (DEC-174)",
    );
  }
  if (verification.active) verifiedReqs = verification.entries.length;
  if (confirmedReqCount(r.text) > 0) {
    const chain = inspectRequirementChangeChain(ctx, r.path, r.text);
    if (chain.gaps.length > 0) {
      return fail(
        "G-req",
        chain.gaps.join("; "),
        "approve each producing CHG and bind its normalized artifact hash in an approved APR (REQ-011/AC-5)",
      );
    }
    approvedChanges = chain.checked.length;
    const g = gapHuntGaps(ctx, r.path);
    if (g?.level === "fail") return fail("G-req", g.summary, g.fix);
    if (g?.level === "warn") return warn("G-req", g.summary, g.fix);
  }
  if (!r.text.includes("未决问题")) {
    return warn("G-req", "no 未决问题 section", "add the section even if empty (C-05)");
  }
  const chainSummary = approvedChanges > 0 ? `; ${approvedChanges} producing CHG(s) APR-bound` : "";
  const verificationSummary = verifiedReqs > 0 ? `; ${verifiedReqs} verification array(s) valid` : "";
  return pass(
    "G-req",
    `${entries} REQ entr(ies), no NEEDS-CLARIFICATION${verificationSummary}${chainSummary}`,
  );
}

function resExists(ctx: Ctx, id: string): boolean {
  const token = id.replace(/^\[/, "").replace(/\]$/, "").trim();
  if (!token) return false;
  return mdFiles(join(ctx.records, "research"), "RES-").some((f) => {
    const base = basename(f);
    return base.startsWith(token) || base.startsWith(`${token}.`) || base.startsWith(`${token}-`);
  });
}

function gResearch(ctx: Ctx): CheckItem {
  const dir = join(ctx.records, "decisions");
  const missing: string[] = [];
  const dangling: string[] = [];
  for (const f of mdFiles(dir, "DEC-")) {
    const { attrs } = parseFrontmatter(readFileSync(f, "utf8"));
    if ((attrs.adr ?? "") !== "true") continue;
    const research = readAttrList(attrs.research);
    const exemption = attrs.research_exemption ?? "";
    if (research.length === 0 && !exemption) missing.push(attrs.id || f);
    for (const id of research) {
      if (!resExists(ctx, id)) dangling.push(`${attrs.id ?? f}:${id}`);
    }
  }
  if (missing.length > 0) {
    return fail(
      "G-research",
      `adr decisions without RES or exemption: ${missing.join(", ")}`,
      "add research: [RES-…] or research_exemption (C-10)",
    );
  }
  if (dangling.length > 0) {
    return fail(
      "G-research",
      `research pointer missing on disk: ${dangling.join(", ")}`,
      "point research: at an existing RES-*.md (C-10)",
    );
  }
  const substance = inspectResSubstance(ctx);
  if (substance.length > 0) {
    const shown = substance.slice(0, 3).map((g) => `${g.id}: ${g.gap}`).join("; ");
    const more = substance.length > 3 ? ` (+${substance.length - 3} more)` : "";
    return fail(
      "G-research",
      `RES substance gaps: ${shown}${more}`,
      "a RES is a report, not a filename — declare the tier, keep the four load-bearing sections, cite sources (C-08/C-09)",
    );
  }
  const citations = inspectResCitations(ctx);
  if (citations.failures.length > 0) {
    const shown = citations.failures.slice(0, 3).map((g) => `${g.id}: ${g.gap}`).join("; ");
    const more = citations.failures.length > 3 ? ` (+${citations.failures.length - 3} more)` : "";
    return fail(
      "G-research",
      `RES citation gaps: ${shown}${more}`,
      "add dated source URLs, or restore the exact DEC-181 migration manifest id/path/normalized hash binding",
    );
  }
  if (citations.legacy.length > 0) {
    const ids = citations.legacy.map((item) => item.id).join(", ");
    return {
      ...warn(
        "G-research",
        `${citations.legacy.length} unchanged pre-0.8 standard/deep RES use the external legacy manifest: ${ids}`,
        "add dated source URLs when substantively revising these reports; any text change invalidates the legacy hash",
      ),
      acknowledged: true,
    };
  }
  return pass(
    "G-research",
    `adr decisions have RES files or a written exemption; RES substance and citations ok (${citations.cited} cited)`,
  );
}

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
  const lessons = relevantLessons(ctx, body);
  const hint = lessons.length > 0 ? `; relevant LES: ${lessons.join(", ")}` : "";
  return pass("G-plan", `unique current ${p.file} / ${r.file}; frontier ${fr.frontier.length}, blocked ${fr.blocked.length}${hint}`);
}

function gDone(ctx: Ctx): CheckItem {
  const feats = join(ctx.records, "features");
  const summaries: string[] = [];
  if (existsSync(feats)) {
    for (const name of readdirSync(feats)) {
      const s = join(feats, name, "summary.md");
      if (existsSync(s)) summaries.push(name);
    }
  }
  const ev = readEvidence(ctx);
  if (summaries.length === 0) {
    return skip("G-done", "no completion claims (C-33)");
  }
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
    return fail("G-done", `claimed ACs uncovered: ${missing.join(", ")}`, "C-33/C-32 mark tests REQ-nnn/AC-i");
  }
  const revGaps = completionReviewGaps(ctx);
  if (revGaps.length > 0) {
    return fail("G-done", revGaps.join("; "), "k-review / gate loop; do not accept until status=passed");
  }
  if (ev.review) {
    const rg = reviewClearGaps(ev.review);
    if (rg.length > 0) {
      return fail("G-done", rg.join("; "), "re-run ISS repro commands; refused=true required");
    }
  }
  return pass("G-done", "evidence 对账 + claimed AC trace + review loop passed");
}

function xEvidence(ctx: Ctx): CheckItem {
  const ev = readEvidence(ctx);
  const gaps = evidenceGaps(ctx, ev);
  if (gaps.length > 0) {
    return fail("X-evidence", gaps.join("; "), "run: gate verify (C-33 对账 / ISS-002)");
  }
  return pass("X-evidence", `fresh tree ${ev?.tree_hash.slice(0, 12) ?? ""}…; junit 对账`);
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

function gIssues(ctx: Ctx): CheckItem {
  const result = inspectIssueProtocol(ctx);
  if (result.gaps.length > 0) {
    return fail(
      "G-issues",
      result.gaps.join("; "),
      "complete the iss-v2 open/closed fields, recurrence explanation, and existing defense_pointer (REQ-010)",
    );
  }
  return pass("G-issues", `${result.checked} iss-v2 valid; ${result.legacy} legacy ISS readable`);
}

function xDecisions(ctx: Ctx): CheckItem {
  const result = inspectDecisionTransitions(ctx);
  if (result.gaps.length > 0) {
    return fail("X-decisions", result.gaps.join("; "), "restore a legal C-14 state; overturn confirmed decisions via superseded");
  }
  return pass("X-decisions", `${result.checked} decision status transition(s) valid`);
}

function provisionalDecs(ctx: Ctx): string[] {
  const out: string[] = [];
  for (const f of mdFiles(join(ctx.records, "decisions"), "DEC-")) {
    const { attrs } = parseFrontmatter(readFileSync(f, "utf8"));
    const st = (attrs.status ?? "").toLowerCase();
    if (st === "proposed" || st === "provisional") out.push(attrs.id || basename(f));
  }
  return out;
}

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

function gRetro(ctx: Ctx): CheckItem {
  const feats = join(ctx.records, "features");
  if (!existsSync(feats)) return skip("G-retro", "no features dir");
  const summaryFiles: string[] = [];
  for (const name of readdirSync(feats)) {
    const s = join(feats, name, "summary.md");
    if (existsSync(s)) summaryFiles.push(s);
  }
  if (summaryFiles.length === 0) return skip("G-retro", "no feature summaries yet (C-56)");
  const overview = join(ctx.records, "OVERVIEW.md");
  if (!existsSync(overview)) return fail("G-retro", "OVERVIEW.md missing", "write the living picture (C-53)");
  let newestSummary = 0;
  for (const s of summaryFiles) {
    newestSummary = Math.max(newestSummary, gitCommitUnix(ctx, posixRel(ctx.root, s)));
  }
  const ovT = gitCommitUnix(ctx, posixRel(ctx.root, overview));
  if (newestSummary > 0 && ovT > 0 && ovT < newestSummary) {
    return fail(
      "G-retro",
      "OVERVIEW last commit is older than a feature summary",
      "update OVERVIEW at retro (C-56)",
    );
  }
  const blocking = openIssueIds(ctx);
  if (blocking.length > 0) {
    return fail("G-retro", `open issues: ${blocking.join(", ")}`, "close-out ISS before 已完成 (C-56)");
  }
  const summarized = summarizedFeatures(ctx);
  const stale = pendingCandidates(ctx).filter((c) => summarized.has(c.feature));
  if (stale.length > 0) {
    const feats = [...new Set(stale.map((c) => c.feature))].join(", ");
    return fail(
      "G-retro",
      `${stale.length} 经验候选 undisposed in summarized feature(s): ${feats}`,
      "k-retro keeps or discards each tag: annotate the line with → LES-nnn / → KLES / → 弃 <reason> (C-77/F13)",
    );
  }
  const prov = provisionalDecs(ctx);
  if (prov.length > 0) {
    const blob = readFileSync(overview, "utf8");
    const missingProv = prov.filter((id) => !blob.includes(id));
    if (missingProv.length > 0) {
      return fail(
        "G-retro",
        `provisional DECs ${missingProv.join(", ")} not closed out by id in OVERVIEW`,
        "record each id and its confirm / supersede / refreshed trigger disposition (C-56)",
      );
    }
  }
  return pass("G-retro", `OVERVIEW current; ${summaryFiles.length} summaries; issues closed`);
}

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
    const { attrs } = parseFrontmatter(readFileSync(abs, "utf8"));
    if ((attrs.status ?? "") !== "approved") continue;
    approved.push(n);
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
    // DEC-166: the git author string alone proved nothing — zhaoxi's agent
    // committed as the human with one `git config` (ISS-034 family). Judge the
    // trailers the environment writes: an agent-made commit is legitimate only
    // when the APR records the user's delegation.
    if (commitLooksAgentMade(gitLastBody(ctx, rel)) && !(attrs.delegated ?? "").trim()) {
      return fail(
        "X-apr",
        `${n} commit carries agent trailers but the APR records no delegation`,
        "add 'delegated: <用户原话+日期>' to the APR, or have the human recommit (C-107/DEC-166)",
      );
    }
  }
  if (approved.length === 0) return pass("X-apr", "no approved APR commits to check");
  return pass("X-apr", `${approved.length} approved APR(s): human author or recorded delegation`);
}

function xBudget(ctx: Ctx): CheckItem {
  const budget = (ctx.config.budget ?? {}) as {
    agents_md_max_lines?: number;
    agents_md_chain_max_bytes?: number;
    autoload_max_bytes?: number;
  };
  const maxLines = budget.agents_md_max_lines ?? 150;
  const maxBytes = budget.agents_md_chain_max_bytes ?? 32768;
  const autoMax = budget.autoload_max_bytes ?? 10240;
  const agents = join(ctx.root, "AGENTS.md");
  if (!existsSync(agents)) return fail("X-budget", "AGENTS.md missing", "restore the root map");
  const raw = readFileSync(agents);
  const text = readFileSync(agents, "utf8");
  const lines = text.split("\n");
  const n = lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
  const bytes = raw.byteLength;
  const claude = existsSync(join(ctx.root, "CLAUDE.md"))
    ? readFileSync(join(ctx.root, "CLAUDE.md"), "utf8").trim()
    : "";
  if (claude && claude !== "@AGENTS.md") {
    return fail("X-budget", "CLAUDE.md must be exactly @AGENTS.md", "C-94");
  }
  if (bytes > maxBytes) {
    return fail("X-budget", `AGENTS.md ${bytes} bytes > ${maxBytes} hard`, "sink content (C-119)");
  }
  const auto = measureAutoload(ctx.root);
  if (n > maxLines) {
    return warn("X-budget", `AGENTS.md ${n} lines > ${maxLines} soft`, "sink content (C-118)");
  }
  if (auto.total > autoMax) {
    return warn(
      "X-budget",
      `autoload ${auto.total} bytes > ${autoMax} soft (C-26/C-118)`,
      "sink catalog or AGENTS.md; raising the cap needs a DEC (C-123)",
    );
  }
  return pass("X-budget", `AGENTS.md ${n} lines / ${bytes} bytes; autoload ${auto.total}/${autoMax}`);
}

function xBypass(ctx: Ctx): CheckItem {
  const findings = collectBypassFindings(ctx);
  if (findings.length === 0) {
    return pass("X-bypass", "no Keel-Precommit: skipped in last 50; CI/tests-dir intact");
  }
  const first = findings[0];
  const extra = findings.length > 1 ? ` (+${findings.length - 1} more)` : "";
  return warn("X-bypass", `${first?.summary ?? "bypass"}${extra}`, first?.fix ?? "C-105");
}

function xOss(ctx: Ctx): CheckItem {
  // C-11 stance first: research picks a dependency long before any manifest
  // exists, so this must not hide behind a missing package.json.
  const stance = inspectResOss(ctx);
  if (stance.dangling.length > 0) {
    const d = stance.dangling[0];
    return fail(
      "X-oss",
      `${d?.res} references ${d?.oss} with no OSS record`,
      "gate new oss <name> and fill C-88 fields (C-89)",
    );
  }
  if (stance.silent.length > 0) {
    return fail(
      "X-oss",
      `RES record(s) take no OSS stance: ${stance.silent.join(", ")}`,
      "add oss: [OSS-00N] for projects the research selected, or oss_none: <reason> (C-11)",
    );
  }
  const declared = stance.declared > 0 ? `${stance.declared} RES stance(s) declared; ` : "";
  const report = inspectOss(ctx);
  if (report.gaps.length > 0) {
    return fail("X-oss", `invalid OSS record: ${report.gaps.join("; ")}`, "fill the C-88 fields and sections; retired records remain readable");
  }
  const pkg = join(ctx.root, "package.json");
  if (!existsSync(pkg)) {
    return stance.declared > 0
      ? pass("X-oss", `${declared}no package.json`)
      : skip("X-oss", "no package.json");
  }
  if (report.deps.length === 0) {
    return stance.declared > 0
      ? pass("X-oss", `${declared}no direct npm dependencies`)
      : skip("X-oss", "no direct npm dependencies");
  }
  if (report.missing.length > 0) {
    return fail(
      "X-oss",
      `direct deps missing OSS records: ${report.missing.join(", ")}`,
      "gate new oss <name> and fill C-88 fields (C-89)",
    );
  }
  if (report.due.length > 0) {
    return warn(
      "X-oss",
      `OSS review due: ${report.due.map((r) => r.id).join(", ")}`,
      "read-only compare upstream; conclusion in the OSS file (C-90)",
    );
  }
  if (report.versionMismatch.length > 0) {
    const m = report.versionMismatch[0];
    return warn(
      "X-oss",
      `OSS ${m?.project} version ${m?.oss} != lock ${m?.lock}`,
      "update the OSS record or file a CHG (C-90)",
    );
  }
  return pass("X-oss", `${declared}${report.deps.length} direct dep(s) registered`);
}

function xKnowledge(ctx: Ctx): CheckItem {
  const cap = typeof ctx.config.knowledge_cap === "number" ? ctx.config.knowledge_cap : 100;
  const kn = countKnowledge();
  if (!kn.exists) return skip("X-knowledge", "~/.keel/knowledge absent");
  if (kn.count > cap) {
    return warn(
      "X-knowledge",
      `${kn.count} KLES files > cap ${cap}`,
      "distill or delete expired entries (C-86)",
    );
  }
  return pass("X-knowledge", `${kn.count} / ${cap} KLES files`);
}

function xSkills(ctx: Ctx): CheckItem {
  const budget = (ctx.config.budget ?? {}) as {
    skill_max_lines?: number;
    skill_description_max_chars?: number;
    skill_count_cap?: number;
  };
  if (listSkillDirs(join(ctx.root, ".agents", "skills")).length === 0) {
    return skip("X-skills", "no k-* skills installed yet");
  }
  const issues = inspectSkills(
    ctx.root,
    budget.skill_max_lines ?? 500,
    budget.skill_description_max_chars ?? 1024,
    budget.skill_count_cap ?? 16,
  );
  if (issues.length === 0) return pass("X-skills", "16 k-* skills within C-95/C-118/C-121");
  const first = issues[0];
  const extra = issues.length > 1 ? ` (+${issues.length - 1} more)` : "";
  return fail(
    "X-skills",
    `${first?.skill}: ${first?.message}${extra}`,
    "fix SKILL.md frontmatter and size (C-95/C-118)",
  );
}

function xCasefold(ctx: Ctx): CheckItem {
  const indexed = gitDir(ctx) ? gitLsFiles(ctx) : [];
  const rels =
    indexed.length > 0
      ? indexed
      : listFiles(ctx.root).map((f) => posixRel(ctx.root, f));
  const collisions = casefoldCollisions(rels);
  if (collisions.length > 0) {
    return fail("X-casefold", collisions.join("; "), "rename so Linux sees one file (DEC-145)");
  }
  return pass("X-casefold", `no case-only collisions (${indexed.length > 0 ? "git index" : "workdir"})`);
}

function xOwners(ctx: Ctx): CheckItem {
  const tier = String(ctx.config.enforcement_tier ?? "local");
  const file = join(ctx.root, ".github", "CODEOWNERS");
  if (tier === "local") {
    return skip("X-owners", "local tier: CODEOWNERS is documentation only (C-108)");
  }
  if (!existsSync(file)) {
    return fail("X-owners", "CODEOWNERS missing", "add .github/CODEOWNERS covering keel/approvals/ (C-108)");
  }
  const recordsDir = String(ctx.config.records_dir ?? "keel").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const approvalPatterns = new Set([
    `${recordsDir}/approvals`,
    `${recordsDir}/approvals/`,
    `${recordsDir}/approvals/*`,
    `${recordsDir}/approvals/**`,
  ]);
  const rules = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => line.split(/\s+/))
    .filter((parts) => approvalPatterns.has((parts[0] ?? "").replace(/^\/+/, "")));
  if (rules.length === 0) {
    return fail("X-owners", "keel/approvals/ not in CODEOWNERS", "C-108");
  }
  const owners = rules.flatMap((parts) => parts.slice(1).filter((part) => /^@[A-Za-z0-9][A-Za-z0-9_/-]*$/.test(part)));
  if (owners.length === 0) {
    return fail("X-owners", "CODEOWNERS approvals rule has no @owner on the same active line", "C-108");
  }
  const nonPlaceholders = owners.filter((owner) => !/^@YOUR-GITHUB-USERNAME$/i.test(owner));
  if (nonPlaceholders.length === 0) {
    return fail(
      "X-owners",
      "CODEOWNERS approvals rule still has only the placeholder @YOUR-GITHUB-USERNAME",
      "put a human platform login on keel/approvals/ (C-108)",
    );
  }
  const identities = ctx.config.identities as { agents?: unknown } | undefined;
  const agentHandles = new Set(
    (Array.isArray(identities?.agents) ? identities.agents : [])
      .flatMap((agent) => {
        if (!agent || typeof agent !== "object") return [];
        const name = (agent as { name?: unknown }).name;
        return typeof name === "string" ? [name.toLowerCase().replace(/^@/, "")] : [];
      }),
  );
  const humanOwners = nonPlaceholders.filter((owner) => !agentHandles.has(owner.slice(1).toLowerCase()));
  if (humanOwners.length === 0) {
    return fail("X-owners", "CODEOWNERS approvals rule names only a configured agent", "name a human owner (C-108)");
  }
  return pass("X-owners", "CODEOWNERS names a non-placeholder, non-agent owner for approvals");
}

function xIds(ctx: Ctx): CheckItem {
  const kinds = ["dec", "res", "iss", "chg", "oss", "les", "apr", "feature"] as const;
  const dups: string[] = [];
  for (const k of kinds) {
    const nums = listNumbers(ctx, k);
    const seen = new Set<number>();
    for (const n of nums) {
      if (seen.has(n)) dups.push(`${k}-${n}`);
      seen.add(n);
    }
  }
  if (dups.length > 0) return fail("X-ids", `duplicate ids: ${dups.join(", ")}`, "never reuse numbers");
  return pass("X-ids", "no duplicate record ids");
}

function xTypes(ctx: Ctx): CheckItem {
  const tsconfig = join(ctx.root, "tsconfig.json");
  if (!existsSync(tsconfig)) return skip("X-types", "no tsconfig.json");
  const tsc = join(ctx.root, "node_modules", "typescript", "lib", "tsc.js");
  if (!existsSync(tsc)) {
    return warn(
      "X-types",
      "typescript package missing; tsc --noEmit not run",
      "npm install (DEC-154)",
    );
  }
  const r = spawnSync(process.execPath, [tsc, "--noEmit"], {
    encoding: "utf8",
    cwd: ctx.root,
  });
  if ((r.status ?? 1) !== 0) {
    return fail("X-types", "tsc --noEmit failed", (r.stdout || r.stderr || "").slice(0, 400));
  }
  return pass("X-types", "tsc --noEmit clean");
}

function xHooks(ctx: Ctx): CheckItem {
  const hp = gitHooksPath(ctx);
  if (!hp) {
    return warn("X-hooks", "core.hooksPath is unset", "git config core.hooksPath .githooks (C-102)");
  }
  const norm = hp.split("\\").join("/");
  if (norm !== ".githooks" && !norm.endsWith("/.githooks")) {
    return warn("X-hooks", `core.hooksPath=${hp}`, "point it at .githooks");
  }
  const gaps = execModeGaps(ctx);
  if (gaps.length > 0) {
    return fail(
      "X-hooks",
      gaps.join("; "),
      "git update-index --chmod=+x on hooks and gate.sh (ISS-004 / DEC-104)",
    );
  }
  return pass("X-hooks", `core.hooksPath=${hp}; exec bits 100755`);
}

const TRACE_FIX =
  "only black-box acceptance tests carry REQ-nnn/AC-i; a stand-in says [proxy:<release condition>]; regression/guard names start with ISS-/DEC-/fp: (DEC-168)";

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

function xFull(ctx: Ctx): CheckItem {
  const testsDir = join(ctx.root, "tests");
  if (!existsSync(testsDir)) return skip("X-full", "no tests/");
  const files = listFiles(testsDir).filter((f) => /\.(ts|js|mjs|cjs)$/.test(f));
  const blob = files.map((f) => readFileSync(f, "utf8")).join("\n");
  if (!blob.includes("runCheck")) {
    return skip("X-full", "tests/ do not invoke runCheck (consumer project)");
  }
  if (!/runCheck\s*\(\s*[^,]+,\s*\[\s*\]\s*\)/.test(blob)) {
    return fail(
      "X-full",
      "no test runs full gate check (not --quick)",
      "add runCheck(ctx, []) covering ISS-019 meta-rule / R5",
    );
  }
  const missing = QUICK_SKIPPED_IDS.filter((id) => !blob.includes(id));
  if (missing.length > 0) {
    return fail(
      "X-full",
      `quick-skipped checks never named in tests/: ${missing.join(", ")}`,
      "assert each --quick-skipped id in a full-check test (R5 / ISS-019)",
    );
  }
  return pass("X-full", "quick-skipped checks have full-check coverage in tests/");
}

function xTests(ctx: Ctx): CheckItem {
  const gaps = testBaselineGaps(ctx);
  if (gaps.length > 0) {
    return fail(
      "X-tests",
      gaps.join("; "),
      "restore tests, or add a new worklog line 'C-34: ref=ISS-nnn' citing a real ISS/DEC and update keel/test-baseline.json (C-34 / ISS-021)",
    );
  }
  const head = headBaseline(ctx);
  const work = worktreeBaseline(ctx);
  if (!head && !work) {
    const n = testFileInventory(ctx.root).names.length;
    return skip("X-tests", `no test-baseline.json (${n} tests/ names; C-34 unarmed until first snapshot)`);
  }
  const n = (work ?? head ?? []).length;
  return pass("X-tests", `baseline ${n} names; skip/delete cited or unchanged (C-34)`);
}

const NO_WAIVE = new Set(["X-evidence", "X-types", "X-trace", "X-tests", "X-full", "G-done", "G-merge", "X-bypass"]);

function recordRefExists(ctx: Ctx, ref: string): boolean {
  if (ref.startsWith("ISS-")) {
    return mdFiles(join(ctx.records, "issues"), "ISS-").some((f) => basename(f).startsWith(ref));
  }
  if (ref.startsWith("DEC-")) {
    return mdFiles(join(ctx.records, "decisions"), "DEC-").some((f) => basename(f).startsWith(ref));
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
  const re = new RegExp(`gate-warn:\\s*${id}\\s+ref=(ISS-\\d+|DEC-\\d+)`);
  const m = blob.match(re);
  if (!m?.[1]) return false;
  const ref = m[1];
  return recordRefExists(ctx, ref) && refIsOpenIss(ctx, ref);
}

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
  items.push(gResearch(ctx));
  items.push(gPlan(ctx));
  items.push(gIssues(ctx));
  items.push(xDecisions(ctx));
  items.push(xBudget(ctx));
  items.push(xCasefold(ctx));
  items.push(xIds(ctx));
  items.push(xSkills(ctx));
  items.push(xBypass(ctx));
  items.push(xOss(ctx));
  items.push(xKnowledge(ctx));
  items.push(xTrace(ctx));
  items.push(xTests(ctx));
  items.push(xFull(ctx));
  items.push(xOwners(ctx));
  if (!quick) {
    items.push(gDone(ctx));
    items.push(gMerge(ctx));
    items.push(gRetro(ctx));
    items.push(xEvidence(ctx));
    items.push(xTypes(ctx));
    items.push(xHooks(ctx));
    items.push(xApr(ctx));
  }
  return formatCheck(warnWorklogCovered(ctx, items));
}
