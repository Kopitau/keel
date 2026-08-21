import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";

export function plannedFiles(planText: string): string[] {
  const lines = planText.split(/\n/);
  const out: string[] = [];
  let inSection = false;
  for (const line of lines) {
    if (/^##\s+预计触碰文件/.test(line) || /^##\s+Files/i.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^##\s+/.test(line)) break;
    if (!inSection) continue;
    const m = line.match(/`([^`]+)`/) || line.match(/^\s*-\s+(\S+)/);
    if (m && m[1]) out.push(m[1].replace(/\\/g, "/"));
  }
  return out;
}

export function currentPlanFile(featureDir: string): string | null {
  const dir = join(featureDir, "plan");
  if (!existsSync(dir)) return null;
  const names = readdirSync(dir)
    .filter((n) => /^v\d+\.md$/.test(n))
    .sort();
  if (names.length === 0) return null;
  return join(dir, names[names.length - 1] ?? "");
}

export function claimedFeatures(ctx: Ctx): string[] {
  const dir = join(ctx.records, "features");
  if (!existsSync(dir)) return [];
  const claimed: string[] = [];
  for (const name of readdirSync(dir)) {
    const claim = join(dir, name, "claim.json");
    if (existsSync(claim)) claimed.push(join(dir, name));
  }
  return claimed;
}

export function overlapWith(ctx: Ctx, featureDir: string): string[] {
  const minePlan = currentPlanFile(featureDir);
  const mine = new Set(minePlan && existsSync(minePlan) ? plannedFiles(readFileSync(minePlan, "utf8")) : []);
  const hits: string[] = [];
  for (const other of claimedFeatures(ctx)) {
    if (other === featureDir) continue;
    const p = currentPlanFile(other);
    if (!p) continue;
    const theirs = plannedFiles(readFileSync(p, "utf8"));
    for (const f of theirs) {
      if (mine.has(f)) hits.push(`${other} : ${f}`);
    }
  }
  return hits;
}
