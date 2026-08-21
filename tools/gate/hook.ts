import { existsSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import type { Ctx } from "./ctx.ts";
import { gitBranch, gitIdentity } from "./git.ts";
import { fail, ok, usage, type CmdResult } from "./result.ts";

function featureFromBranch(branch: string): string {
  const m = /F-?(\d+)/i.exec(branch);
  return m ? `F${m[1]}` : "unknown";
}

export function runHook(ctx: Ctx, args: string[]): CmdResult {
  const name = args[0] ?? "";
  if (name !== "prepare-commit-msg") {
    return usage("usage: gate hook prepare-commit-msg <file>\n");
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
