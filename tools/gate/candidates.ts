import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";

export type Candidate = {
  feature: string;
  line: number;
  text: string;
  /** True when the tag line carries a retro disposition (`→ LES-nnn` / `→ 弃 …`). */
  disposed: boolean;
};

const TAG = "#经验候选";
/** The scaffold's example line — `- `#经验候选` 类型 一句话` — is not a capture. */
const PLACEHOLDER = "类型 一句话";
/**
 * A bare backticked tag (`#经验候选` with the backtick right after it) is prose
 * TALKING ABOUT the tag — templates, skills, progress notes. A real capture puts
 * content behind the tag (`#经验候选 defense failed …`), backticked or not.
 */
const MENTION = "`" + TAG + "`";

/**
 * C-77: capture is one worklog line, zero ceremony; a script aggregates. This is
 * that script — it never existed before 2026-08-26, so tags were written and
 * nothing ever read them (zhaoxi field finding, ISS-042).
 */
export function scanCandidates(ctx: Ctx): Candidate[] {
  const out: Candidate[] = [];
  const feats = join(ctx.records, "features");
  if (!existsSync(feats)) return out;
  let names: string[] = [];
  try {
    names = readdirSync(feats);
  } catch {
    return out;
  }
  for (const name of names) {
    const p = join(feats, name, "worklog.md");
    if (!existsSync(p)) continue;
    const lines = readFileSync(p, "utf8").split(/\n/);
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i] ?? "";
      if (!t.includes(TAG) || t.includes(PLACEHOLDER) || t.includes(MENTION)) continue;
      out.push({ feature: name, line: i + 1, text: t.trim(), disposed: t.includes("→") });
    }
  }
  return out;
}

export function pendingCandidates(ctx: Ctx): Candidate[] {
  return scanCandidates(ctx).filter((c) => !c.disposed);
}

/** Features that have a summary.md — i.e. features whose retro is claimed done. */
export function summarizedFeatures(ctx: Ctx): Set<string> {
  const done = new Set<string>();
  const feats = join(ctx.records, "features");
  if (!existsSync(feats)) return done;
  try {
    for (const name of readdirSync(feats)) {
      if (existsSync(join(feats, name, "summary.md"))) done.add(name);
    }
  } catch {
    /* unreadable dir counts as none */
  }
  return done;
}
