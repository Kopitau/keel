import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter, readAttrList } from "./frontmatter.ts";

/**
 * DEC-169 (borrowed from wayfinder, RES-904 §1): a feature plan declares
 * `blocked_by: [F1, F3]`. The frontier is what can start now — not done (no
 * summary.md), not claimed (no claim.json), every blocker done. `gate status`
 * prints it; G-plan rejects dangling ids and cycles; `worktree add` warns.
 */
export type FeatureNode = {
  id: string;
  dir: string;
  blockedBy: string[];
  done: boolean;
  claimed: boolean;
  hasBlockedByLine: boolean;
};

export type Frontier = {
  frontier: string[];
  blocked: { id: string; by: string[] }[];
  claimed: string[];
  done: string[];
  problems: string[];
};

export function normalizeFeatureId(raw: string): string | null {
  const m = /^F-?0*(\d+)$/i.exec(raw.trim());
  return m ? `F${Number(m[1])}` : null;
}

function num(id: string): number {
  return Number(id.slice(1));
}

export function featureNodes(ctx: Ctx): FeatureNode[] {
  const feats = join(ctx.records, "features");
  if (!existsSync(feats)) return [];
  const out: FeatureNode[] = [];
  for (const name of readdirSync(feats).sort()) {
    const dir = join(feats, name);
    try {
      if (!statSync(dir).isDirectory()) continue;
    } catch {
      continue;
    }
    const m = /^f0*(\d+)-/.exec(name);
    let id: string | null = m ? `F${Number(m[1])}` : null;
    const blockedBy: string[] = [];
    let hasBlockedByLine = false;
    const planDir = join(dir, "plan");
    if (existsSync(planDir)) {
      const plans = readdirSync(planDir).filter((p) => p.endsWith(".md")).sort();
      const latest = plans[plans.length - 1];
      if (latest) {
        const { attrs } = parseFrontmatter(readFileSync(join(planDir, latest), "utf8"));
        if (attrs.feature) id = normalizeFeatureId(attrs.feature) ?? id;
        if ("blocked_by" in attrs) {
          hasBlockedByLine = true;
          for (const b of readAttrList(attrs.blocked_by)) blockedBy.push(b);
        }
      }
    }
    if (!id) continue;
    out.push({
      id,
      dir: name,
      blockedBy,
      done: existsSync(join(dir, "summary.md")),
      claimed: existsSync(join(dir, "claim.json")),
      hasBlockedByLine,
    });
  }
  return out.sort((a, b) => num(a.id) - num(b.id));
}

export function computeFrontier(ctx: Ctx): Frontier {
  const nodes = featureNodes(ctx);
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const problems: string[] = [];
  const deps = new Map<string, string[]>();
  for (const n of nodes) {
    const list: string[] = [];
    for (const raw of n.blockedBy) {
      const id = normalizeFeatureId(raw);
      if (!id) {
        problems.push(`${n.id}: blocked_by "${raw}" is not a feature id`);
        continue;
      }
      if (id === n.id) {
        problems.push(`${n.id}: blocked_by itself`);
        continue;
      }
      if (!byId.has(id)) {
        problems.push(`${n.id}: blocked_by ${id} names no feature`);
        continue;
      }
      if (!list.includes(id)) list.push(id);
    }
    deps.set(n.id, list);
  }
  // cycles
  const color = new Map<string, 1 | 2>();
  const visit = (id: string, stack: string[]): void => {
    color.set(id, 1);
    stack.push(id);
    for (const d of deps.get(id) ?? []) {
      if (color.get(d) === 1) {
        problems.push(`blocked_by cycle: ${[...stack.slice(stack.indexOf(d)), d].join(" -> ")}`);
      } else if (!color.get(d)) {
        visit(d, stack);
      }
    }
    stack.pop();
    color.set(id, 2);
  };
  for (const n of nodes) if (!color.get(n.id)) visit(n.id, []);

  const frontier: string[] = [];
  const blocked: { id: string; by: string[] }[] = [];
  const claimed: string[] = [];
  const done: string[] = [];
  for (const n of nodes) {
    if (n.done) {
      done.push(n.id);
      continue;
    }
    const open = (deps.get(n.id) ?? []).filter((d) => !byId.get(d)?.done);
    if (n.claimed) {
      claimed.push(n.id);
      continue;
    }
    if (open.length > 0) {
      blocked.push({ id: n.id, by: open });
      continue;
    }
    frontier.push(n.id);
  }
  return { frontier, blocked, claimed, done, problems };
}
