#!/usr/bin/env node
/**
 * Pure JavaScript entry (DEC-157 / REQ-025 / ISS-022).
 * Check Node, then load the installer CLI as JavaScript — never import .ts
 * from this process (Node refuses type-stripping under node_modules).
 */
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { nodeTooOld, refuseOldNodeMessage } from "./node-age.js";

export { nodeTooOld, refuseOldNodeMessage };

if (nodeTooOld(process.versions.node)) {
  console.error(refuseOldNodeMessage(process.versions.node));
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const cli = pathToFileURL(join(here, "..", "tools", "cli", "main.js")).href;
import(cli)
  .then(function (mod) {
    const terminal = mod.terminalUpdateOptions();
    const result = mod.runCli(process.argv.slice(2), { cwd: process.cwd(), ...terminal });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.code || 0);
  })
  .catch(function (err) {
    console.error(err && err.stack ? err.stack : String(err));
    process.exit(1);
  });
