import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { loadConfig } from "./config.ts";
import { sha256Normalized } from "./hash.ts";
import { isAtLeast, MIN_NODE } from "./node-version.ts";
import { recordsDir, repoRootFromGateFile } from "./paths.ts";

function writeOut(text: string): void {
  process.stdout.write(text);
}

function writeErr(text: string): void {
  process.stderr.write(text);
}

function requireNodeVersion(): number {
  const current = process.versions.node;
  if (isAtLeast(current, MIN_NODE)) return 0;
  writeErr(
    `keel: Node ${current} is below ${MIN_NODE} (DEC-150). Refusing to run.\n`,
  );
  return 1;
}

function cmdStatus(root: string): number {
  const records = recordsDir(root);
  const cfg = loadConfig(records);
  const tier =
    typeof cfg.enforcement_tier === "string" ? cfg.enforcement_tier : "unknown";
  writeOut("keel status\n");
  writeOut("wave: W1-stub\n");
  writeOut(`runtime: node+ts ${process.versions.node}\n`);
  writeOut(`root: ${root}\n`);
  writeOut(`records_dir: ${records}\n`);
  writeOut(`handoff: ${join(records, "handoff.md")}\n`);
  writeOut(`overview: ${join(records, "OVERVIEW.md")}\n`);
  writeOut(`plan_index: ${join(records, "plan", "INDEX.md")}\n`);
  writeOut(`enforcement_tier: ${tier}\n`);
  writeOut(
    "note: full gates are W2; this stub prints start-of-session paths (C-27/C-72).\n",
  );
  return 0;
}

function cmdHash(args: string[]): number {
  if (args.length !== 1) {
    writeErr("usage: gate hash <file>\n");
    return 2;
  }
  const target = args[0] ?? "";
  const bytes = readFileSync(target);
  writeOut(`${sha256Normalized(bytes)}\n`);
  return 0;
}

function main(argv: string[]): number {
  const ver = requireNodeVersion();
  if (ver !== 0) return ver;
  const root = repoRootFromGateFile(import.meta.url);
  const args = argv.slice(2);
  if (
    args.length === 0 ||
    args[0] === "-h" ||
    args[0] === "--help" ||
    args[0] === "help"
  ) {
    writeOut("usage: node tools/gate/gate.ts status|hash <file>\n");
    writeOut("W1 stub: status + hash (DEC-144). Other subcommands land in W2.\n");
    return 0;
  }
  const cmd = args[0] ?? "";
  const rest = args.slice(1);
  if (cmd === "status") return cmdStatus(root);
  if (cmd === "hash") return cmdHash(rest);
  writeErr(`unknown command ${cmd}; W1 stub supports: status, hash\n`);
  return 2;
}

process.exitCode = main(process.argv);
