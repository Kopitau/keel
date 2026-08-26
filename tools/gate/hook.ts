import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import type { Ctx } from "./ctx.ts";
import { git, gitBranch, gitDir, gitIdentity, gitStagedContent } from "./git.ts";
import { isForceUpdate, parsePrePushLine } from "./bypass.ts";
import { fail, ok, usage, type CmdResult } from "./result.ts";
import { detectHarness, type EnvMap } from "./harness.ts";
import { parseFrontmatter } from "./frontmatter.ts";

/**
 * DEC-166 commit-time guard: validate the approval commit BEING MADE, which the
 * history-based X-apr can only judge after the fact. An agent may land an APR
 * commit on the user's explicit instruction — but then the APR file itself must
 * carry that instruction (`delegated:` non-empty), and an agent git identity
 * still never lands approvals (C-107).
 */
export function precommitAprGaps(ctx: Ctx, env: EnvMap = process.env): string[] {
  const staged = git(ctx, ["diff", "--cached", "--name-only"]).stdout
    .split(/\n/)
    .map((s) => s.trim().replace(/\\/g, "/"))
    .filter((s) => /\/approvals\/APR-\d+.*\.md$/.test(s));
  const gaps: string[] = [];
  if (staged.length === 0) return gaps;
  const ident = gitIdentity(ctx);
  const agents = ((ctx.config.identities ?? {}) as { agents?: { name?: string; email?: string }[] })
    .agents ?? [];
  const agentIdentity = agents.some(
    (a) =>
      (a.email && a.email.toLowerCase() === ident.email.toLowerCase()) ||
      (a.name && a.name.toLowerCase() === ident.name.toLowerCase()),
  );
  const harness = detectHarness(env);
  for (const rel of staged) {
    const text = gitStagedContent(ctx, rel);
    if (!text) continue;
    const { attrs } = parseFrontmatter(text);
    if ((attrs.status ?? "") !== "approved") continue;
    if (agentIdentity) {
      gaps.push(`${rel}: approval commit under agent git identity ${ident.name} (C-107)`);
    }
    if (harness && !(attrs.delegated ?? "").trim()) {
      gaps.push(
        `${rel}: committed from ${harness.agent} but the APR records no delegation — add 'delegated: <用户原话+日期>' (DEC-166)`,
      );
    }
  }
  return gaps;
}

function runPrecommitApr(ctx: Ctx): CmdResult {
  const gaps = precommitAprGaps(ctx);
  if (gaps.length === 0) return ok("pre-commit-apr: ok\n");
  return fail(gaps.map((g) => `refuse: ${g}`).join("\n") + "\n");
}

function featureFromBranch(branch: string): string {
  const m = /F-?(\d+)/i.exec(branch);
  return m ? `F${m[1]}` : "unknown";
}

function readHookStdin(): string {
  if (process.stdin.isTTY) return "";
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function runPrePush(ctx: Ctx, args: string[]): CmdResult {
  const fromFile = args[0] && args[0] !== "-" ? args[0] : "";
  const raw = fromFile && existsSync(fromFile) ? readFileSync(fromFile, "utf8") : readHookStdin();
  const warns: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const refs = parsePrePushLine(line);
    if (!refs) continue;
    const anc = git(ctx, ["merge-base", "--is-ancestor", refs.remoteSha, refs.localSha]);
    if (isForceUpdate(refs.remoteSha, refs.localSha, anc.status === 0)) {
      warns.push(`force-push reminder: ${refs.localRef} would replace ${refs.remoteRef} (C-105)`);
    }
  }
  if (warns.length === 0) return ok("pre-push: no force-push reminder\n");
  return ok(warns.join("\n") + "\n");
}

export function precommitStampPath(ctx: Ctx): string {
  const dir = gitDir(ctx);
  return dir ? join(dir, "keel-precommit-stamp") : "";
}

function writeStamp(ctx: Ctx): CmdResult {
  const p = precommitStampPath(ctx);
  if (!p) return fail("git dir missing; cannot stamp pre-commit\n");
  writeFileSync(p, `ok ${new Date().toISOString()}\n`, "utf8");
  return ok("pre-commit stamp written\n");
}

function applyPrecommitTrailer(ctx: Ctx, text: string): string {
  let next = text;
  if (!/^Keel-Precommit:\s/m.test(next)) {
    const stamp = precommitStampPath(ctx);
    const ran = Boolean(stamp && existsSync(stamp));
    if (!next.endsWith("\n")) next += "\n";
    next += `Keel-Precommit: ${ran ? "ok" : "skipped"}\n`;
    if (ran && stamp) {
      try {
        unlinkSync(stamp);
      } catch {
        /* ignore */
      }
    }
  }
  return next;
}

export function runHook(ctx: Ctx, args: string[]): CmdResult {
  const name = args[0] ?? "";
  if (name === "pre-push") return runPrePush(ctx, args.slice(1));
  if (name === "pre-commit-stamp") return writeStamp(ctx);
  if (name === "pre-commit-apr") return runPrecommitApr(ctx);
  if (name !== "prepare-commit-msg") {
    return usage(
      "usage: gate hook prepare-commit-msg <file> | hook pre-push [refs-file] | hook pre-commit-stamp | hook pre-commit-apr\n",
    );
  }
  const file = args[1] ?? "";
  if (!file || !existsSync(file)) return fail("commit message file missing\n");
  let text = readFileSync(file, "utf8");
  text = applyPrecommitTrailer(ctx, text);
  if (!/^Feature:\s/m.test(text)) {
    const ident = gitIdentity(ctx);
    const branch = gitBranch(ctx);
    const agents = ((ctx.config.identities ?? {}) as { agents?: { name?: string; email?: string }[] })
      .agents ?? [];
    const listed = agents.find(
      (a) => a.email && a.email.toLowerCase() === ident.email.toLowerCase(),
    );
    // DEC-166: an agent environment self-identifies instead of stamping
    // "unknown" while the harness writes its own truthful trailer next door.
    const detected = detectHarness();
    const agent = process.env.KEEL_AGENT || listed?.name || detected?.agent || "unknown";
    const feature =
      process.env.KEEL_FEATURE ||
      (featureFromBranch(branch) !== "unknown"
        ? featureFromBranch(branch)
        : /^(master|main)$/.test(branch)
          ? "trunk"
          : "unknown");
    const session = process.env.KEEL_SESSION || detected?.session || "unknown";
    const trailers = [
      `Feature: ${feature}`,
      `Developer: ${ident.name}`,
      `Agent: ${agent}`,
      `Session: ${session}`,
      "",
    ].join("\n");
    if (!text.endsWith("\n")) text += "\n";
    text += trailers;
  }
  writeFileSync(file, text, "utf8");
  return ok("");
}
