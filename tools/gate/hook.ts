import { existsSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import type { Ctx } from "./ctx.ts";
import { git, gitBranch, gitIdentity } from "./git.ts";
import { isForceUpdate, parsePrePushLine } from "./bypass.ts";
import { fail, ok, usage, type CmdResult } from "./result.ts";

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

export function runHook(ctx: Ctx, args: string[]): CmdResult {
  const name = args[0] ?? "";
  if (name === "pre-push") return runPrePush(ctx, args.slice(1));
  if (name !== "prepare-commit-msg") {
    return usage("usage: gate hook prepare-commit-msg <file> | hook pre-push [refs-file]\n");
  }
  const file = args[1] ?? "";
  if (!file || !existsSync(file)) return fail("commit message file missing\n");
  let text = readFileSync(file, "utf8");
  if (/^Feature:\s/m.test(text)) return ok("");
  const ident = gitIdentity(ctx);
  const branch = gitBranch(ctx);
  const feature = process.env.KEEL_FEATURE || featureFromBranch(branch);
  const agent = process.env.KEEL_AGENT || "unknown";
  const session = process.env.KEEL_SESSION || "unknown";
  const trailers = [
    "",
    `Feature: ${feature}`,
    `Developer: ${ident.name}`,
    `Agent: ${agent}`,
    `Session: ${session}`,
    "",
  ].join("\n");
  if (!text.endsWith("\n")) text += "\n";
  writeFileSync(file, text + trailers, "utf8");
  return ok("");
}
