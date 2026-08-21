import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** DEC-145: always use the runtime path API. Never hard-code separators. */
export function repoRootFromGateFile(gateUrl: string): string {
  const here = dirname(fileURLToPath(gateUrl));
  return resolve(here, "..", "..");
}

export function recordsDir(root: string, name = "keel"): string {
  return join(root, name);
}
