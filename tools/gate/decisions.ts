import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { git, gitDir } from "./git.ts";
import { mdFiles, posixRel } from "./walk.ts";

const VALID = new Set(["proposed", "confirmed", "provisional", "deferred", "superseded"]);

export type DecisionTransitionInspection = {
  checked: number;
  gaps: string[];
};

/**
 * C-14 only gives two terminal-state rollback rules. Keep this judge narrow:
 * it rejects unknown states, confirmed -> nonterminal, and superseded -> any
 * other state without inventing a fuller workflow the user has not confirmed.
 */
export function inspectDecisionTransitions(ctx: Ctx): DecisionTransitionInspection {
  const gaps: string[] = [];
  let checked = 0;
  const hasGit = Boolean(gitDir(ctx));
  const decisionsRel = posixRel(ctx.root, join(ctx.records, "decisions"));
  const changed = hasGit
    ? new Set(git(ctx, ["diff", "--name-only", "HEAD", "--", decisionsRel]).stdout.split(/\n/).filter(Boolean).map((rel) => rel.replace(/\\/g, "/")))
    : new Set<string>();
  for (const file of mdFiles(join(ctx.records, "decisions"), "DEC-")) {
    const current = parseFrontmatter(readFileSync(file, "utf8")).attrs;
    const id = current.id || file.split(/[\\/]/).pop()?.replace(/\.md$/, "") || "DEC-?";
    const next = (current.status ?? "").toLowerCase();
    checked += 1;
    if (!VALID.has(next)) {
      gaps.push(`${id} invalid status ${next || "(missing)"}`);
      continue;
    }
    if (!hasGit) continue;
    const rel = posixRel(ctx.root, file);
    if (!changed.has(rel)) continue;
    const oldText = git(ctx, ["show", `HEAD:${rel}`]);
    if (oldText.status !== 0 || !oldText.stdout) continue;
    const old = (parseFrontmatter(oldText.stdout).attrs.status ?? "").toLowerCase();
    if (old === "confirmed" && next !== "confirmed" && next !== "superseded") {
      gaps.push(`${id} illegal transition confirmed -> ${next}`);
    }
    if (old === "superseded" && next !== "superseded") {
      gaps.push(`${id} illegal transition superseded -> ${next}`);
    }
  }
  return { checked, gaps };
}
