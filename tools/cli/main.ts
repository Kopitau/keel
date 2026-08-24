import { existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fail, ok, type CmdResult } from "../gate/result.ts";
import { installerRoot } from "./layout.ts";
import { initFromArgs } from "./init.ts";
import { runUpdate } from "./update.ts";
import { runUninstall } from "./uninstall.ts";
import { runDoctor } from "./doctor.ts";

export type CliOpts = { cwd?: string; source?: string };

function help(): CmdResult {
  return ok(
    [
      "usage: keel <command>",
      "project commands (current directory):",
      "  init [--name n] [--tier local|github|gitee] [--human 'Name <email>']",
      "  update [--force]",
      "  uninstall",
      "  doctor",
      "other commands run the project copy at tools/gate/gate.ts",
      "",
    ].join("\n") + "\n",
  );
}

function forward(cwd: string, args: string[]): CmdResult {
  const gate = join(cwd, "tools", "gate", "gate.ts");
  if (!existsSync(gate)) {
    return fail("not a keel project (missing tools/gate/gate.ts); run keel init\n");
  }
  const r = spawnSync(process.execPath, [gate, ...args], { encoding: "utf8", cwd });
  return {
    code: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

export function runCli(args: string[], opts: CliOpts = {}): CmdResult {
  const cwd = opts.cwd ?? process.cwd();
  const source = opts.source ?? installerRoot(import.meta.url);
  const cmd = args[0] ?? "";
  const rest = args.slice(1);
  if (!cmd || cmd === "-h" || cmd === "--help" || cmd === "help") return help();
  if (cmd === "init") return initFromArgs(cwd, source, rest);
  if (cmd === "update") return runUpdate(cwd, source, rest);
  if (cmd === "uninstall") return runUninstall(cwd);
  if (cmd === "doctor") return runDoctor(cwd, source);
  return forward(cwd, args);
}
