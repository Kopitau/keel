import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fail, ok, type CmdResult } from "../gate/result.ts";
import { MACHINE_PATHS } from "./layout.ts";

export function runUninstall(cwd: string): CmdResult {
  if (!existsSync(join(cwd, "keel"))) {
    return fail("no keel/ directory; nothing to uninstall\n");
  }
  for (const rel of MACHINE_PATHS) {
    const p = join(cwd, rel);
    if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  }
  if (!existsSync(join(cwd, "keel"))) {
    return fail("internal error: keel/ records directory missing after uninstall\n");
  }
  return ok("keel uninstall removed machine files; keel/ records kept\n");
}
