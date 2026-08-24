import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { makeCtx } from "../gate/ctx.ts";
import { EXEC_REQUIRED } from "../gate/execmode.ts";
import { runSync } from "../gate/sync.ts";
import { isAtLeast } from "../gate/node-version.ts";
import { fail, ok, type CmdResult } from "../gate/result.ts";
import { INIT_COPY, flag, hasFlag, readInstallerVersion } from "./layout.ts";

function git(cwd: string, args: string[]): void {
  spawnSync("git", args, { encoding: "utf8", cwd });
}

export function runUpdate(cwd: string, source: string, args: string[]): CmdResult {
  const cfgPath = join(cwd, "keel", "config.json");
  if (!existsSync(cfgPath)) return fail("not a keel project; run keel init\n");
  let cfg: { keel_version?: string };
  try {
    cfg = JSON.parse(readFileSync(cfgPath, "utf8")) as { keel_version?: string };
  } catch {
    return fail("keel/config.json is not valid JSON\n");
  }
  const cliVer = readInstallerVersion(source);
  const projVer = cfg.keel_version || "0.0.0";
  if (!isAtLeast(cliVer, projVer) && !hasFlag(args, "force")) {
    return fail(
      `global CLI ${cliVer} is older than project keel_version ${projVer}; pass --force to continue\n`,
    );
  }
  for (const rel of INIT_COPY) {
    const src = join(source, rel);
    if (!existsSync(src)) continue;
    if (rel === "AGENTS.md" || rel === "CONTEXT.md") continue;
    cpSync(src, join(cwd, rel), { recursive: true, force: true });
  }
  cfg.keel_version = cliVer;
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
  runSync(makeCtx(cwd));
  if (existsSync(join(cwd, ".git"))) {
    git(cwd, ["add", "-A"]);
    git(cwd, ["update-index", "--chmod=+x", "--", ...EXEC_REQUIRED]);
  }
  return ok(`keel update applied ${cliVer}${hasFlag(args, "force") ? " (--force)" : ""}\n`);
}

export { flag };
