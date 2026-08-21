import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { runApprove } from "./approve.ts";
import { runCheck } from "./check.ts";
import { makeCtx } from "./ctx.ts";
import { sha256Normalized } from "./hash.ts";
import { runHook } from "./hook.ts";
import { runIndex } from "./indexgen.ts";
import { runNew } from "./new.ts";
import { isAtLeast, MIN_NODE } from "./node-version.ts";
import { repoRootFromGateFile } from "./paths.ts";
import { fail, ok, usage, type CmdResult } from "./result.ts";
import { runStatus } from "./status.ts";
import { runSync } from "./sync.ts";
import { runTrace } from "./trace.ts";
import { runTriggers } from "./triggers.ts";
import { runReview } from "./review.ts";
import { runVerify } from "./verify.ts";
import { runWorktree } from "./worktree.ts";

function writeOut(text: string): void {
  if (text) process.stdout.write(text);
}

function writeErr(text: string): void {
  if (text) process.stderr.write(text);
}

function requireNodeVersion(): CmdResult | null {
  const current = process.versions.node;
  if (isAtLeast(current, MIN_NODE)) return null;
  return fail(
    `keel: Node ${current} is below ${MIN_NODE} (DEC-150). Refusing to run.\n`,
  );
}

function parseRoot(argv: string[]): { root: string; rest: string[] } {
  const rest: string[] = [];
  let root = repoRootFromGateFile(import.meta.url);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--root" && argv[i + 1]) {
      root = argv[i + 1] ?? root;
      i += 1;
      continue;
    }
    rest.push(argv[i] ?? "");
  }
  return { root, rest };
}

function cmdHash(root: string, args: string[]): CmdResult {
  if (args.length !== 1) return usage("usage: gate hash <file>\n");
  const target = args[0] ?? "";
  const abs = /^[A-Za-z]:[\\/]/.test(target) || target.startsWith("/")
    ? target
    : join(root, target);
  return ok(`${sha256Normalized(readFileSync(abs))}\n`);
}

function help(): CmdResult {
  return ok(
    [
      "usage: node tools/gate/gate.ts <command>",
      "commands:",
      "  status                  session start paths + counters (C-27/C-72)",
      "  check [--quick]         six gates + budget/casefold/ids/types/hooks",
      "  new <kind> <title>      allocate id and copy a template",
      "  index                   regenerate INDEX.md files",
      "  trace                   REQ ↔ test matrix (C-32)",
      "  sync                    copy .agents/skills -> .claude/skills (DEC-147)",
      "  worktree add|rm Fnn     one feature, one branch, one worktree (C-112)",
      "  approve APR-nnn         hash artifacts; human identity only (C-107)",
      "  hash <file>             SHA-256 of normalized text (DEC-144)",
      "  verify                  rerun tests, write evidence JSON bound to tree hash (C-33)",
      "  triggers [--write]      probe harness CLIs; skill trigger ledger (W5)",
      "  review [--quick] [--write]  C-105 gate checklist inventory",
      "  hook prepare-commit-msg <file> | hook pre-push [refs-file]",
      "",
    ].join("\n") + "\n",
  );
}

function dispatch(root: string, args: string[]): CmdResult {
  const ctx = makeCtx(root);
  const cmd = args[0] ?? "";
  const rest = args.slice(1);
  if (!cmd || cmd === "-h" || cmd === "--help" || cmd === "help") return help();
  if (cmd === "status") return runStatus(ctx);
  if (cmd === "check") return runCheck(ctx, rest);
  if (cmd === "new") return runNew(ctx, rest);
  if (cmd === "index") return runIndex(ctx);
  if (cmd === "trace") return runTrace(ctx);
  if (cmd === "sync") return runSync(ctx);
  if (cmd === "worktree") return runWorktree(ctx, rest);
  if (cmd === "approve") return runApprove(ctx, rest);
  if (cmd === "hash") return cmdHash(root, rest);
  if (cmd === "verify") return runVerify(ctx);
  if (cmd === "triggers") return runTriggers(ctx, rest);
  if (cmd === "review") return runReview(ctx, rest);
  if (cmd === "hook") return runHook(ctx, rest);
  return usage(`unknown command ${cmd}; see --help\n`);
}

function main(argv: string[]): number {
  const ver = requireNodeVersion();
  if (ver) {
    writeErr(ver.stderr);
    return ver.code;
  }
  const { root, rest } = parseRoot(argv.slice(2));
  const result = dispatch(root, rest);
  writeOut(result.stdout);
  writeErr(result.stderr);
  return result.code;
}

process.exitCode = main(process.argv);
