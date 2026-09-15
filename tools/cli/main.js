import { existsSync, readFileSync, readSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fail, ok } from "./result.js";
import { installerRoot } from "./layout.js";
import { initFromArgs } from "./init.js";
import { runUpdate } from "./update.js";
import { runUninstall } from "./uninstall.js";
import { runDoctor } from "./doctor.js";

/** The version consumers compare against their config keel_version (DEC-173). */
export function installerVersion(source) {
  try {
    const pkg = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));
    return typeof pkg.version === "string" && pkg.version ? pkg.version : "unknown";
  } catch {
    return "unknown";
  }
}

function help() {
  return ok(
    [
      "usage: keel <command>",
      "project commands (current directory):",
      "  init [--name n] [--tier local|github|gitee] [--human 'Name <email>']",
      "  update [--force] [--yes]",
      "  uninstall",
      "  doctor",
      "  --version   print the installer version (package.json)",
      "other commands run the project copy at tools/gate/gate.ts",
      "",
    ].join("\n") + "\n",
  );
}

function forward(cwd, args) {
  const gate = join(cwd, "tools", "gate", "gate.ts");
  if (!existsSync(gate)) {
    return fail("not a keel project (missing tools/gate/gate.ts); run keel init\n");
  }
  const r = spawnSync(process.execPath, [gate].concat(args), { encoding: "utf8", cwd: cwd });
  return {
    code: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

export function runCli(args, opts) {
  opts = opts || {};
  const cwd = opts.cwd || process.cwd();
  const source = opts.source || installerRoot(import.meta.url);
  const cmd = args[0] || "";
  const rest = args.slice(1);
  if (!cmd || cmd === "-h" || cmd === "--help" || cmd === "help") return help();
  if (cmd === "--version" || cmd === "-v" || cmd === "version") return ok(`${installerVersion(source)}
`);
  if (cmd === "init") return initFromArgs(cwd, source, rest);
  if (cmd === "update") return runUpdate(cwd, source, rest, opts);
  if (cmd === "uninstall") return runUninstall(cwd);
  if (cmd === "doctor") return runDoctor(cwd, source);
  return forward(cwd, args);
}

/**
 * Interactive adapter kept outside the update planner so tests and headless
 * callers can prove EOF/non-interactive cancellation without faking a TTY.
 */
export function terminalUpdateOptions(input = process.stdin, output = process.stdout) {
  const canConfirmUpdate = !!input && input.isTTY === true && typeof input.fd === "number";
  return {
    canConfirmUpdate,
    emitUpdatePreview(text) {
      output.write(text);
    },
    confirmUpdate() {
      if (!canConfirmUpdate) return null;
      const buffer = Buffer.alloc(1024);
      const count = readSync(input.fd, buffer, 0, buffer.length, null);
      return count > 0 ? buffer.subarray(0, count).toString("utf8") : null;
    },
  };
}
