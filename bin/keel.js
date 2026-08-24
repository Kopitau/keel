#!/usr/bin/env node
/**
 * Pure JavaScript entry (DEC-157 / REQ-025).
 * Check Node before importing TypeScript. No TypeScript syntax in this file.
 */
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { nodeTooOld, refuseOldNodeMessage } from "./node-age.js";

export { nodeTooOld, refuseOldNodeMessage };

if (nodeTooOld(process.versions.node)) {
  console.error(refuseOldNodeMessage(process.versions.node));
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const self = fileURLToPath(import.meta.url);
const arg = process.argv[1] ? resolve(process.argv[1]) : "";
const isMain = self.toLowerCase() === arg.toLowerCase();

if (isMain) {
  const cli = pathToFileURL(join(here, "..", "tools", "cli", "main.ts")).href;
  import(cli)
    .then(function (mod) {
      const result = mod.runCli(process.argv.slice(2), { cwd: process.cwd() });
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      process.exit(result.code || 0);
    })
    .catch(function (err) {
      console.error(err && err.stack ? err.stack : String(err));
      process.exit(1);
    });
}
