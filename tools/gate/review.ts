import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { collectBypassFindings } from "./bypass.ts";
import { runCheck } from "./check.ts";
import type { Ctx } from "./ctx.ts";
import { ok, type CmdResult } from "./result.ts";
import { SKILL_CATALOG } from "./skills.ts";

/** The eight checks after CHG-011 (DEC-183). Adding one needs a DEC. */
export const CHECK_IDS = [
  "G-req",
  "G-plan",
  "G-done",
  "G-merge",
  "X-trace",
  "X-evidence",
  "X-bypass",
  "X-apr",
] as const;

export function formatReview(ctx: Ctx): string {
  const findings = collectBypassFindings(ctx);
  const lines = [
    "# gate review inventory (C-105)",
    "",
    `- date: ${new Date().toISOString().slice(0, 10)}`,
    `- node: ${process.versions.node}`,
    `- skills: ${SKILL_CATALOG.length}`,
    `- checks: ${CHECK_IDS.length} (CHG-011)`,
    `- bypass findings: ${findings.length === 0 ? "none" : findings.map((f) => f.code).join(", ")}`,
    "",
    "## check ids",
    "",
  ];
  for (const id of CHECK_IDS) lines.push(`- ${id}`);
  lines.push("");
  return lines.join("\n");
}

export function runReview(ctx: Ctx, args: string[]): CmdResult {
  const live = runCheck(ctx, args.includes("--quick") ? ["--quick"] : []);
  const inv = formatReview(ctx);
  const text = inv + "## live check\n\n" + live.stdout;
  if (args.includes("--write")) {
    const dir = join(ctx.records, "features", "f17-gate");
    mkdirSync(dir, { recursive: true });
    const dest = join(dir, "gate-review-latest.md");
    writeFileSync(dest, text.endsWith("\n") ? text : text + "\n", "utf8");
  }
  return ok(text.endsWith("\n") ? text : text + "\n");
}

export function reviewMentionsAllIds(text: string): string[] {
  return CHECK_IDS.filter((id) => !text.includes(id));
}

export function reviewFileExists(ctx: Ctx, name: string): boolean {
  return existsSync(join(ctx.records, "features", "f17-gate", name));
}
