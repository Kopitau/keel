import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { approvalBinding, declaredStatusOf, declaresConfirmed } from "./changechain.ts";
import { posixRel } from "./walk.ts";
import { mdFiles } from "./walk.ts";
import { ok, type CmdResult } from "./result.ts";
import { liveClarifications } from "./check.ts";
import { readCurrent } from "./indexgen.ts";
import { runCheck } from "./check.ts";
import { computeFrontier, type Frontier } from "./frontier.ts";
import { buildTrace } from "./trace.ts";
import { isAtLeast } from "./node-version.ts";
import { planComplete } from "./reviewloop.ts";

export type StatusShape = {
  hasBaseline: boolean;
  hasPlan: boolean;
  /** CHG-016: the current requirements or overview is drafted (status proposed) but no approved APR binds it. */
  unapprovedBaseline?: boolean;
  frontier: string[];
  blocked: Frontier["blocked"];
  /** Features with a claim.json and no summary — someone is on them (ISS-065). */
  claimed: string[];
  planDone: boolean;
};

/**
 * ISS-060 / REQ-012 AC-5: the `next:` line is the one sentence a fresh session acts
 * on. An empty project used to read "no unblocked feature left — plan-level review",
 * which a pilot's model took as "the plan is finished" before any baseline existed.
 */
/** CHG-016: a current baseline file that says proposed and has no approved APR behind it. */
function unapproved(ctx: Ctx, dir: string, file: string | null | undefined): boolean {
  if (!file) return false;
  const abs = join(ctx.records, dir, file);
  if (!existsSync(abs)) return false;
  const status = declaredStatusOf(readFileSync(abs, "utf8"));
  if (!status || declaresConfirmed(status)) return false;
  // Only a file that calls itself proposed / draft, in a project that records approvals
  // (taotie's baseline sat like this for a day while `next:` said "start F1").
  if (!/^(proposed|draft|提议|草稿)/i.test(status)) return false;
  if (!existsSync(join(ctx.records, "approvals"))) return false;
  return approvalBinding(ctx, posixRel(ctx.root, abs)).boundBy.length === 0;
}

export function nextLine(shape: StatusShape, handoff: string): string {
  if (!shape.hasBaseline) return "no baseline yet — run k-new (interview → research → decisions → unified plan)";
  if (!shape.hasPlan) return "requirements baselined, plan missing — finish k-new step 4 (unified plan + APR), then k-impl";
  if (shape.unapprovedBaseline) {
    return "requirements/plan drafted but not approved — finish k-new step 5 (APR on the user's words), then k-impl";
  }
  if (shape.frontier.length > 0) return `start ${shape.frontier[0]} (frontier); then read ${handoff}`;
  if (shape.planDone) return `all features have summary.md — plan-level review (k-review), then acceptance (k-accept); read ${handoff}`;
  if (shape.claimed.length > 0) {
    return `claimed and in progress: ${shape.claimed.join(", ")} — continue in its worktree or release the claim (gate worktree rm); read ${handoff}`;
  }
  if (shape.blocked.length > 0) {
    const waiting = shape.blocked.map((b) => `${b.id} (by ${b.by.join(", ")})`).join("; ");
    return `no unblocked feature — waiting on blockers: ${waiting}; read ${handoff}`;
  }
  return `no feature planned yet — add feature plans (k-new step 4); read ${handoff}`;
}

/** CHG-011: the first three lines answer the only three questions a session has. */
function humanLines(ctx: Ctx, shape: StatusShape, handoff: string): string[] {
  const quick = runCheck(ctx, ["--quick"]);
  const fails = quick.stdout.split("\n").filter((l) => l.startsWith("FAIL "));
  const warns = quick.stdout.split("\n").filter((l) => l.startsWith("WARN "));
  const commit =
    fails.length === 0
      ? `yes — quick check green${warns.length > 0 ? ` (${warns.length} warn)` : ""}`
      : `no — ${fails.map((l) => l.replace(/^FAIL /, "")).join("; ")}`;
  // CHG-016: the proxy list is gate trace's job; here a count keeps the line readable.
  const condense = (l: string): string =>
    l
      .replace(/^(FAIL|WARN) /, "")
      .replace(/proxy coverage, WARN not PASS: ([^;]+)/, (_m, list: string) => `proxy coverage: ${list.split(", ").length} AC(s) are stand-ins (gate trace lists them)`);
  const humans = ((ctx.config.identities ?? {}) as { humans?: unknown[] }).humans ?? [];
  const humanNote = humans.length === 0 ? "humans: none in config identities.humans — gate approve will refuse (keel init --human)" : "";
  const items = [...(humanNote ? [humanNote] : []), ...[...fails, ...warns].map(condense)];
  const missing = items.length === 0 ? "nothing" : items.join("; ");
  return [`commit: ${commit}`, `missing: ${missing}`, `next: ${nextLine(shape, handoff)}`];
}

function readPackageVersion(dir: string): string {
  const pkg = join(dir, "package.json");
  if (!existsSync(pkg)) return "";
  try {
    const j = JSON.parse(readFileSync(pkg, "utf8")) as { version?: unknown };
    return typeof j.version === "string" ? j.version : "";
  } catch {
    return "";
  }
}

/**
 * REQ-025 AC-10: the globally installed keel, if it can be found cheaply.
 * `KEEL_INSTALLER_ROOT` names it (or `none` to skip); otherwise `npm root -g`.
 * A pilot spent two days hardening a mechanism upstream had deleted the same
 * afternoon because nothing ever said "a newer keel is installed".
 */
export function installerVersion(env: { [k: string]: string | undefined } = process.env): string {
  const explicit = (env.KEEL_INSTALLER_ROOT ?? "").trim();
  if (explicit) {
    if (/^(none|0|off)$/i.test(explicit)) return "";
    return readPackageVersion(explicit);
  }
  try {
    const r = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["root", "-g"], {
      encoding: "utf8",
      timeout: 4000,
      shell: process.platform === "win32",
    });
    const root = (r.stdout || "").trim().split(/\r?\n/).pop() ?? "";
    if (r.status !== 0 || !root) return "";
    return readPackageVersion(join(root, "keel"));
  } catch {
    return "";
  }
}

export function versionLine(projectVersion: string, installer: string): string {
  const project = projectVersion || "unknown";
  if (!installer) return `keel: ${project}`;
  if (projectVersion && isAtLeast(projectVersion, installer)) return `keel: ${project} (installer ${installer})`;
  return `keel: ${project} (installer ${installer} — run keel update)`;
}

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
  const shape: StatusShape = {
    hasBaseline: Boolean(reqCurrent.file) && existsSync(join(ctx.records, "requirements", reqCurrent.file ?? "")),
    hasPlan: Boolean(planCurrent.file) && existsSync(join(ctx.records, "plan", planCurrent.file ?? "")),
    unapprovedBaseline: unapproved(ctx, "requirements", reqCurrent.file) || unapproved(ctx, "plan", planCurrent.file),
    frontier: fr.frontier,
    blocked: fr.blocked,
    claimed: fr.claimed,
    planDone: planComplete(ctx),
  };
  const lines = [
    "keel status",
    ...humanLines(ctx, shape, handoff),
    versionLine(typeof cfg.keel_version === "string" ? cfg.keel_version : "", installerVersion()),
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
    `needs_clarification: ${openQuestions}`,
    // DEC-169: what can start now / what waits on whom. DEC-168 review threshold reader.
    `frontier: ${fr.frontier.join(" ")}`,
    `blocked: ${fr.blocked.map((b) => `${b.id} (by ${b.by.join(", ")})`).join("; ")}`,
    `proxy_acs: ${proxyAcs}`,
    "branch_policy: daily→trunk; new major feature→recommend worktree; parallel→C-112 (DEC-155)",
  ];
  return ok(lines.join("\n") + "\n");
}
