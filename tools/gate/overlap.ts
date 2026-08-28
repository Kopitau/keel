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
    const quoted = [...line.matchAll(/`([^`]+)`/g)];
    if (quoted.length > 0) {
      for (const match of quoted) {
        if (match[1]) out.push(normalizePlannedPath(match[1]));
      }
      continue;
    }
    const bullet = line.match(/^\s*-\s+(\S+)/);
    if (bullet?.[1]) out.push(normalizePlannedPath(bullet[1]));
  }
  return out;
}

export function currentPlanFile(featureDir: string): string | null {
  const dir = join(featureDir, "plan");
  if (!existsSync(dir)) return null;
  const names = readdirSync(dir)
    .filter((n) => /^v\d+\.md$/.test(n))
    .sort((a, b) => planVersion(a) - planVersion(b));
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
  const mine = minePlan && existsSync(minePlan) ? plannedFiles(readFileSync(minePlan, "utf8")) : [];
  const hits: string[] = [];
  for (const other of claimedFeatures(ctx)) {
    if (other === featureDir) continue;
    const p = currentPlanFile(other);
    if (!p) continue;
    const theirs = plannedFiles(readFileSync(p, "utf8"));
    for (const theirFile of theirs) {
      for (const myFile of mine) {
        if (pathsOverlap(myFile, theirFile)) hits.push(`${other} : ${myFile} <> ${theirFile}`);
      }
    }
  }
  return hits;
}

function normalizePlannedPath(value: string): string {
  return value.trim().replace(/\\/g, "/").replace(/^\.\//, "");
}

function planVersion(name: string): number {
  return Number.parseInt(/^v(\d+)\.md$/.exec(name)?.[1] ?? "0", 10);
}

function pathCovers(pattern: string, candidate: string): boolean {
  if (pattern === candidate) return true;
  if (pattern.endsWith("/")) return candidate.startsWith(pattern);
  const wildcard = pattern.indexOf("*");
  return wildcard >= 0 && candidate.startsWith(pattern.slice(0, wildcard));
}

export function pathsOverlap(left: string, right: string): boolean {
  const a = normalizePlannedPath(left);
  const b = normalizePlannedPath(right);
  return pathCovers(a, b) || pathCovers(b, a);
}
