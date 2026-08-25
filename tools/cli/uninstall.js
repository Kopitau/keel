import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fail, ok } from "./result.js";
import { MACHINE_PATHS } from "./layout.js";

export function runUninstall(cwd) {
  if (!existsSync(join(cwd, "keel"))) {
    return fail("no keel/ directory; nothing to uninstall\n");
  }
  for (let i = 0; i < MACHINE_PATHS.length; i++) {
    const p = join(cwd, MACHINE_PATHS[i]);
    if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  }
  if (!existsSync(join(cwd, "keel"))) {
    return fail("internal error: keel/ records directory missing after uninstall\n");
  }
  return ok("keel uninstall removed machine files; keel/ records kept\n");
}
