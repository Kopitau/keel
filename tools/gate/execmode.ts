import type { Ctx } from "./ctx.ts";
import { git } from "./git.ts";

export const EXEC_REQUIRED = [
  ".githooks/pre-commit",
  ".githooks/pre-push",
  ".githooks/prepare-commit-msg",
  "tools/gate/gate.sh",
  "tools/gate/ci-trunk.sh",
];

export function gitIndexMode(ctx: Ctx, rel: string): string {
  const r = git(ctx, ["ls-files", "-s", "--", rel]);
  const m = /^([0-7]{6})\s/.exec(r.stdout);
  return m?.[1] ?? "";
}

export function execModeGaps(ctx: Ctx): string[] {
  const gaps: string[] = [];
  for (const rel of EXEC_REQUIRED) {
    const mode = gitIndexMode(ctx, rel);
    if (!mode) continue;
    if (mode !== "100755") gaps.push(`${rel} is ${mode}, want 100755`);
  }
  return gaps;
}
