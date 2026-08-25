import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fail, ok } from "./result.js";
import { EXEC_REQUIRED, INIT_COPY, hasFlag, readInstallerVersion } from "./layout.js";
import { isAtLeast } from "./layout.js";

function git(cwd, args) {
  spawnSync("git", args, { encoding: "utf8", cwd: cwd });
}

function syncSkills(cwd) {
  const src = join(cwd, ".agents", "skills");
  const dest = join(cwd, ".claude", "skills");
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
}

export function runUpdate(cwd, source, args) {
  const cfgPath = join(cwd, "keel", "config.json");
  if (!existsSync(cfgPath)) return fail("not a keel project; run keel init\n");
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  } catch {
    return fail("keel/config.json is not valid JSON\n");
  }
  const cliVer = readInstallerVersion(source);
  const projVer = cfg.keel_version || "0.0.0";
  if (!isAtLeast(cliVer, projVer) && !hasFlag(args, "force")) {
    return fail(
      "global CLI " + cliVer + " is older than project keel_version " + projVer + "; pass --force to continue\n",
    );
  }
  for (let i = 0; i < INIT_COPY.length; i++) {
    const rel = INIT_COPY[i];
    const src = join(source, rel);
    if (!existsSync(src)) continue;
    if (rel === "AGENTS.md" || rel === "CONTEXT.md") continue;
    cpSync(src, join(cwd, rel), { recursive: true, force: true });
  }
  cfg.keel_version = cliVer;
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
  syncSkills(cwd);
  if (existsSync(join(cwd, ".git"))) {
    git(cwd, ["add", "-A"]);
    git(cwd, ["update-index", "--chmod=+x", "--"].concat(EXEC_REQUIRED));
  }
  return ok("keel update applied " + cliVer + (hasFlag(args, "force") ? " (--force)" : "") + "\n");
}
