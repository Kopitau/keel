import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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
    if (/^\s*-\s+Given\b/.test(line)) continue;
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

function gReq(ctx: Ctx): CheckItem {
  const r = currentReq(ctx);
  if ("error" in r) return fail("G-req", r.error, "point requirements/INDEX.md at a single vN.md");
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

function gResearch(ctx: Ctx): CheckItem {
  const dir = join(ctx.records, "decisions");
  const missing: string[] = [];
  for (const f of mdFiles(dir, "DEC-")) {
    const { attrs } = parseFrontmatter(readFileSync(f, "utf8"));
    if ((attrs.adr ?? "") !== "true") continue;
    const research = readAttrList(attrs.research);
    const exemption = attrs.research_exemption ?? "";
    if (research.length === 0 && !exemption) missing.push(attrs.id || f);
  }
  if (missing.length > 0) {
    return fail(
      "G-research",
      `adr decisions without RES or exemption: ${missing.join(", ")}`,
      "add research: [RES-…] or research_exemption (C-10)",
    );
  }
  return pass("G-research", "adr decisions have RES or a written exemption");
}

function gPlan(ctx: Ctx): CheckItem {
  const planIdx = join(ctx.records, "plan", "INDEX.md");
  const reqIdx = join(ctx.records, "requirements", "INDEX.md");
  const p = readCurrent(planIdx);
  const r = readCurrent(reqIdx);
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
  if (!existsSync(feats)) return skip("G-done", "no features dir");
  const summaries: string[] = [];
  for (const name of readdirSync(feats)) {
    const s = join(feats, name, "summary.md");
    if (existsSync(s)) summaries.push(name);
  }
  if (summaries.length === 0) {
    return skip("G-done", "no completion claims; test rerun is gate verify (W3 / C-33)");
  }
  return fail(
    "G-done",
    `summary.md present (${summaries.join(", ")}) but evidence/verify is W3`,
    "run gate verify after W3 lands, or remove premature summary.md",
  );
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
  return pass("G-merge", `${approved} approved APR file(s) on disk`);
}

function gRetro(ctx: Ctx): CheckItem {
  const feats = join(ctx.records, "features");
  if (!existsSync(feats)) return skip("G-retro", "no features dir");
  let summaries = 0;
  for (const name of readdirSync(feats)) {
    if (existsSync(join(feats, name, "summary.md"))) summaries += 1;
  }
  if (summaries === 0) return skip("G-retro", "no feature summaries yet (C-56)");
  const overview = join(ctx.records, "OVERVIEW.md");
  if (!existsSync(overview)) return fail("G-retro", "OVERVIEW.md missing", "write the living picture (C-53)");
  return pass("G-retro", `OVERVIEW present; ${summaries} summaries`);
}

function xBudget(ctx: Ctx): CheckItem {
  const budget = (ctx.config.budget ?? {}) as {
    agents_md_max_lines?: number;
    agents_md_chain_max_bytes?: number;
  };
  const maxLines = budget.agents_md_max_lines ?? 150;
  const maxBytes = budget.agents_md_chain_max_bytes ?? 32768;
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
  if (n > maxLines) {
    return warn("X-budget", `AGENTS.md ${n} lines > ${maxLines} soft`, "sink content (C-118)");
  }
  return pass("X-budget", `AGENTS.md ${n} lines / ${bytes} bytes`);
}

function xCasefold(ctx: Ctx): CheckItem {
  const seen = new Map<string, string>();
  const collisions: string[] = [];
  for (const f of listFiles(ctx.root)) {
    const rel = posixRel(ctx.root, f);
    const key = rel.toLowerCase();
    const prev = seen.get(key);
    if (prev && prev !== rel) collisions.push(`${prev} vs ${rel}`);
    else seen.set(key, rel);
  }
  if (collisions.length > 0) {
    return fail("X-casefold", collisions.join("; "), "rename so Linux sees one file (DEC-145)");
  }
  return pass("X-casefold", "no case-only filename collisions");
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
  return pass("X-hooks", `core.hooksPath=${hp}`);
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
    if (blob.includes(`gate-warn: ${it.id}`)) return it;
    return {
      ...it,
      verdict: "fail" as const,
      summary: `${it.summary} (warn not acknowledged)`,
      fix: `${it.fix ?? ""} record 'gate-warn: ${it.id}' in the feature worklog to pass a warning (C-103)`,
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
  if (!quick) {
    items.push(gDone(ctx));
    items.push(gMerge(ctx));
    items.push(gRetro(ctx));
    items.push(xTypes(ctx));
    items.push(xHooks(ctx));
  }
  return formatCheck(warnWorklogCovered(ctx, items));
}
