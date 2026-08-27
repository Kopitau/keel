import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { mdFiles } from "./walk.ts";
import { ok, type CmdResult } from "./result.ts";
import { liveClarifications } from "./check.ts";
import { readCurrent } from "./indexgen.ts";
import { pendingCandidates } from "./candidates.ts";
import { computeFrontier } from "./frontier.ts";
import { buildTrace } from "./trace.ts";

export function runStatus(ctx: Ctx): CmdResult {
  const cfg = ctx.config;
  const tier =
    typeof cfg.enforcement_tier === "string" ? cfg.enforcement_tier : "unknown";
  const planIdx = join(ctx.records, "plan", "INDEX.md");
  const reqIdx = join(ctx.records, "requirements", "INDEX.md");
  const handoff = join(ctx.records, "handoff.md");
  let provisional = 0;
  for (const f of mdFiles(join(ctx.records, "decisions"), "DEC-")) {
    const t = readFileSync(f, "utf8");
    const { attrs } = parseFrontmatter(t);
    if ((attrs.status ?? "").toLowerCase() === "provisional") provisional += 1;
  }
  let openIssues = 0;
  const issDir = join(ctx.records, "issues");
  if (existsSync(issDir)) {
    for (const n of readdirSync(issDir)) {
      if (!n.startsWith("ISS-") || !n.endsWith(".md")) continue;
      const { attrs } = parseFrontmatter(readFileSync(join(issDir, n), "utf8"));
      const st = (attrs.status ?? "open").toLowerCase();
      if (st === "open" || st === "in_progress") openIssues += 1;
    }
  }
  const reqCurrent = readCurrent(reqIdx);
  const planCurrent = readCurrent(planIdx);
  let openQuestions = 0;
  if (reqCurrent.file) {
    const body = readFileSync(join(ctx.records, "requirements", reqCurrent.file), "utf8");
    openQuestions = liveClarifications(body);
  }
  const fr = computeFrontier(ctx);
  const proxyAcs = buildTrace(ctx).rows.reduce((n, r) => n + r.proxyAc.length, 0);
  const lines = [
    "keel status",
    `wave: ${typeof cfg.wave === "string" && cfg.wave ? cfg.wave : "unknown"}`,
    `runtime: node+ts ${process.versions.node}`,
    `root: ${ctx.root}`,
    `records_dir: ${ctx.records}`,
    `handoff: ${handoff}`,
    `overview: ${join(ctx.records, "OVERVIEW.md")}`,
    `plan_index: ${planIdx}`,
    `plan_current: ${planCurrent.file ?? ""}`,
    `requirements_current: ${reqCurrent.file ?? ""}`,
    `enforcement_tier: ${tier}`,
    `provisional_decisions: ${provisional}`,
    `open_issues: ${openIssues}`,
    `lesson_candidates: ${pendingCandidates(ctx).length}`,
    `needs_clarification: ${openQuestions}`,
    // DEC-169: what can start now / what waits on whom. DEC-168 review threshold reader.
    `frontier: ${fr.frontier.join(" ")}`,
    `blocked: ${fr.blocked.map((b) => `${b.id} (by ${b.by.join(", ")})`).join("; ")}`,
    `proxy_acs: ${proxyAcs}`,
    "branch_policy: daily→trunk; new major feature→recommend worktree; parallel→C-112 (DEC-155)",
  ];
  return ok(lines.join("\n") + "\n");
}
