import { existsSync, mkdirSync, cpSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { fail, ok, type CmdResult } from "./result.ts";

/** DEC-147: always copy, never symlink. */
export function runSync(ctx: Ctx): CmdResult {
  const src = join(ctx.root, ".agents", "skills");
  const dest = join(ctx.root, ".claude", "skills");
  if (!existsSync(src)) return fail("missing .agents/skills\n");
  mkdirSync(dest, { recursive: true });
  try {
    cpSync(src, dest, { recursive: true, force: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail(`sync copy failed: ${msg}\n`);
  }
  return ok("synced .agents/skills -> .claude/skills (copy)\n");
}
