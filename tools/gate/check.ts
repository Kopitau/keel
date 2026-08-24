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
import { casefoldCollisions, gitCommitUnix, gitDir, gitLastAuthor, gitLsFiles } from "./git.ts";
import { inspectSkills, listSkillDirs } from "./skills.ts";
import { measureAutoload } from "./autoload.ts";
import { collectBypassFindings } from "./bypass.ts";
import { countKnowledge } from "./knowledge.ts";
import { inspectOss } from "./osscheck.ts";
import { execModeGaps } from "./execmode.ts";
import { claimedReqs, uncoveredClaimed } from "./trace.ts";
import { testBaselineGaps, headBaseline, worktreeBaseline, testFileInventory } from "./testbase.ts";

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

function gReq(ctx: Ctx): CheckItem {
  const r = currentReq(ctx);
  const activity = hasImplementationActivity(ctx);
  if ("error" in r) {
    if (!activity) {
      return skip("G-req", "尚未开始，跑 k-new 建立需求基线");
    }
    return fail("G-req", r.error, "point requirements/INDEX.md at a single vN.md");
  }
  const n = liveClarifications(r.text);
  if (n > 0) {
    return fail(
      "G-req",
      `${n} [NEEDS-CLARIFICATION] marker(s) in current requirements`,
      "resolve markers or move open branches into the 未决问题 section before baseline (C-05)",
    );
  }
  if (!r.text.includes("未决问题")) {
    return warn("G-req", "no 未决问题 section", "add the section even if empty (C-05)");
  }
  return pass("G-req", "no NEEDS-CLARIFICATION in current requirements");
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
  return pass("G-research", "adr decisions have RES files or a written exemption");
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
  return pass("G-plan", `unique current ${p.file} / ${r.file}`);
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
  return pass("G-done", "evidence 对账 + claimed AC trace green");
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
  const prov = provisionalDecs(ctx);
  if (prov.length > 0) {
    const blob = readFileSync(overview, "utf8");
    if (!blob.includes("销项") && !blob.includes("暂定")) {
      return fail(
        "G-retro",
        `provisional DECs ${prov.join(", ")} not closed out in OVERVIEW`,
        "record 销项 (C-56)",
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
  }
  if (approved.length === 0) return pass("X-apr", "no approved APR commits to check");
  return pass("X-apr", `${approved.length} approved APR author(s) not on the agent list`);
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
  const pkg = join(ctx.root, "package.json");
  if (!existsSync(pkg)) return skip("X-oss", "no package.json");
  const report = inspectOss(ctx);
  if (report.deps.length === 0) return skip("X-oss", "no direct npm dependencies");
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
  return pass("X-oss", `${report.deps.length} direct dep(s) registered`);
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
  const text = readFileSync(file, "utf8");
  if (/@YOUR-GITHUB-USERNAME/i.test(text)) {
    return fail(
      "X-owners",
      "CODEOWNERS still has the placeholder @YOUR-GITHUB-USERNAME",
      "put a real GitHub login on keel/approvals/ (C-108)",
    );
  }
  if (!/keel\/approvals\//.test(text)) {
    return fail("X-owners", "keel/approvals/ not in CODEOWNERS", "C-108");
  }
  if (!/@[A-Za-z0-9-]/.test(text)) {
    return fail("X-owners", "CODEOWNERS has no @owner", "C-108");
  }
  return pass("X-owners", "CODEOWNERS names a real owner for approvals");
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

function xTrace(ctx: Ctx): CheckItem {
  const missing = uncoveredClaimed(ctx);
  if (claimedReqs(ctx).length === 0) {
    return pass("X-trace", "no claimed-done features (C-32 scope = 验收范围)");
  }
  if (missing.length > 0) {
    return fail(
      "X-trace",
      `uncovered acceptance criteria: ${missing.join(", ")}`,
      "mark tests REQ-nnn/AC-i (C-32 / ISS-020)",
    );
  }
  return pass("X-trace", "claimed acceptance criteria covered in tests/");
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

const NO_WAIVE = new Set(["X-evidence", "X-types", "X-trace", "X-tests", "G-done", "G-merge", "X-bypass"]);

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
  items.push(xBudget(ctx));
  items.push(xCasefold(ctx));
  items.push(xIds(ctx));
  items.push(xSkills(ctx));
  items.push(xBypass(ctx));
  items.push(xOss(ctx));
  items.push(xKnowledge(ctx));
  items.push(xTrace(ctx));
  items.push(xTests(ctx));
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
