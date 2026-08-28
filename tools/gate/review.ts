import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { measureAutoload } from "./autoload.ts";
import { collectBypassFindings } from "./bypass.ts";
import { runCheck } from "./check.ts";
import type { Ctx } from "./ctx.ts";
import { countKnowledge } from "./knowledge.ts";
import { inspectOss } from "./osscheck.ts";
import { ok, type CmdResult } from "./result.ts";
import { SKILL_CATALOG } from "./skills.ts";

export const CHECK_IDS = [
  "G-req",
  "G-research",
  "G-plan",
  "G-done",
  "G-merge",
  "G-retro",
  "X-budget",
  "X-skills",
  "X-casefold",
  "X-ids",
  "X-types",
  "X-hooks",
  "X-evidence",
  "X-bypass",
  "X-oss",
  "X-knowledge",
  "X-trace",
  "X-tests",
  "X-full",
  "X-apr",
  "X-owners",
  "X-decisions",
] as const;

export function formatReview(ctx: Ctx): string {
  const budget = (ctx.config.budget ?? {}) as {
    autoload_max_bytes?: number;
    skill_count_cap?: number;
  };
  const auto = measureAutoload(ctx.root);
  const oss = inspectOss(ctx);
  const kn = countKnowledge();
  const cap = typeof ctx.config.knowledge_cap === "number" ? ctx.config.knowledge_cap : 100;
  const days = typeof ctx.config.oss_review_days === "number" ? ctx.config.oss_review_days : 28;
  const rules = ctx.config.rules_area_cap;
  const findings = collectBypassFindings(ctx);
  const lines = [
    "# gate review inventory (C-105)",
    "",
    `- date: ${new Date().toISOString().slice(0, 10)}`,
    `- node: ${process.versions.node}`,
    `- autoload: ${auto.total} / ${budget.autoload_max_bytes ?? 10240} bytes (agents ${auto.agents} + claude ${auto.claude} + catalog ${auto.catalog})`,
    `- skills: ${SKILL_CATALOG.length} / ${budget.skill_count_cap ?? 16}`,
    `- oss_review_days: ${days}; due: ${oss.due.length}; missing: ${oss.missing.join(", ") || "none"}`,
    `- knowledge: ${kn.exists ? kn.count : "dir absent"} / ${cap}`,
    `- rules_area_cap: ${rules === null || rules === undefined ? "null (no rules dir in this repo)" : String(rules)}`,
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
