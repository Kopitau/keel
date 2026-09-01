import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import type { Ctx } from "./ctx.ts";
import { git, gitBranch, gitDir, gitIdentity, gitStagedContent } from "./git.ts";
import { isForceUpdate, parsePrePushLine } from "./bypass.ts";
import { fail, ok, usage, type CmdResult } from "./result.ts";
import { ancestorProcessNames, detectHarness, detectHost, type DetectOptions, type EnvMap } from "./harness.ts";
import { parseFrontmatter } from "./frontmatter.ts";

const DEFAULT_DETECT: DetectOptions = { ancestors: ancestorProcessNames };

function stagedApprovals(ctx: Ctx): string[] {
  return git(ctx, ["diff", "--cached", "--name-only"]).stdout
    .split(/\n/)
    .map((s) => s.trim().replace(/\\/g, "/"))
    .filter((s) => /\/approvals\/APR-\d+.*\.md$/.test(s));
}

/**
 * DEC-190 commit-time guard: an APR being committed as `approved` must carry the
 * user's verbatim words (`delegated:`). That is the whole rule — the git identity
 * of the committer and the harness it runs in are not judged any more (C-107's
 * identity clause retired; the pilots showed it stalled every approval and
 * proved nothing).
 */
export function precommitAprGaps(ctx: Ctx, _env: EnvMap = process.env, _opts: DetectOptions = DEFAULT_DETECT): string[] {
  const gaps: string[] = [];
  for (const rel of stagedApprovals(ctx)) {
    const text = gitStagedContent(ctx, rel);
    if (!text) continue;
    const { attrs } = parseFrontmatter(text);
    if ((attrs.status ?? "") !== "approved") continue;
    if (!(attrs.delegated ?? "").trim()) {
      gaps.push(`${rel}: approved but records no delegation — add 'delegated: "「用户原话」(YYYY-MM-DD)"'; who commits does not matter (DEC-190)`);
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

const TRAILER_LINE = /^[A-Za-z][A-Za-z0-9-]*:\s/;

/**
 * ISS-058: git reads "everything up to the first blank line" as the subject, so
 * trailers glued to a one-line message became part of the subject in both pilot
 * repositories. Trailers go into their own final paragraph — after a blank line,
 * or appended to an existing trailer paragraph the author already wrote — and
 * git's trailing `#` comment block (interactive commits) stays last.
 */
export function insertTrailers(text: string, trailers: string[]): string {
  if (trailers.length === 0) return text;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let cut = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i] ?? "";
    if (l.startsWith("#") || l.trim() === "") {
      cut = i;
      continue;
    }
    break;
  }
  const head = lines.slice(0, cut);
  const comments = lines.slice(cut).filter((l) => l.startsWith("#"));
  const headText = head.join("\n").replace(/\s+$/, "");
  const parts: string[] = [];
  if (!headText) {
    // ISS-066: an interactive commit hands us an empty message plus git's comment
    // block. Leave line 1 for the subject the human is about to type and a blank
    // line after it, so the trailers stay their own paragraph.
    parts.push("", "");
  }
  if (headText) {
    parts.push(headText);
    const lastParagraph = headText.split(/\n\s*\n/).pop() ?? "";
    const paragraphLines = lastParagraph.split("\n");
    // A subject alone is never a trailer paragraph; only a multi-line trailer block, or a
    // body paragraph made of `Key: value` lines after a subject, is extended in place.
    const isTrailerParagraph =
      paragraphLines.every((l) => TRAILER_LINE.test(l)) && headText.includes("\n");
    if (!isTrailerParagraph) parts.push("");
  }
  parts.push(...trailers);
  let out = parts.join("\n") + "\n";
  if (comments.length > 0) out += "\n" + comments.join("\n") + "\n";
  return out;
}

function precommitTrailer(ctx: Ctx, text: string): string[] {
  if (/^Keel-Precommit:\s/m.test(text)) return [];
  const stamp = precommitStampPath(ctx);
  const ran = Boolean(stamp && existsSync(stamp));
  if (ran && stamp) {
    try {
      unlinkSync(stamp);
    } catch {
      /* ignore */
    }
  }
  return [`Keel-Precommit: ${ran ? "ok" : "skipped"}`];
}

function identityTrailers(ctx: Ctx, text: string, env: EnvMap, opts: DetectOptions): string[] {
  if (/^Feature:\s/m.test(text)) return [];
  const ident = gitIdentity(ctx);
  const branch = gitBranch(ctx);
  const agents = ((ctx.config.identities ?? {}) as { agents?: { name?: string; email?: string }[] })
    .agents ?? [];
  const listed = agents.find((a) => a.email && a.email.toLowerCase() === ident.email.toLowerCase());
  // DEC-166: an agent environment self-identifies instead of stamping "unknown"
  // while the harness writes its own truthful trailer next door (ISS-059).
  const detected = detectHarness(env, opts);
  const agent = env.KEEL_AGENT || listed?.name || detected?.agent || "unknown";
  const feature =
    env.KEEL_FEATURE ||
    (featureFromBranch(branch) !== "unknown"
      ? featureFromBranch(branch)
      : /^(master|main)$/.test(branch)
        ? "trunk"
        : "unknown");
  const session = env.KEEL_SESSION || detected?.session || "unknown";
  const out = [`Feature: ${feature}`, `Developer: ${ident.name}`, `Agent: ${agent}`, `Session: ${session}`];
  if (agent === "unknown") {
    const host = detectHost(env, opts);
    if (host) out.push(`Host: ${host.host}`);
  }
  return out;
}

export function runHook(ctx: Ctx, args: string[], env: EnvMap = process.env, opts: DetectOptions = DEFAULT_DETECT): CmdResult {
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
  const text = readFileSync(file, "utf8");
  const trailers = [...precommitTrailer(ctx, text), ...identityTrailers(ctx, text, env, opts)];
  writeFileSync(file, insertTrailers(text, trailers), "utf8");
  return ok("");
}
