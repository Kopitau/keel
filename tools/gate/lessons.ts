import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter, readAttrList } from "./frontmatter.ts";
import { mdFiles } from "./walk.ts";

/** C-80: a planning/review script names LES records whose feature ids occur in the plan. */
export function relevantLessons(ctx: Ctx, planText: string): string[] {
  const out: string[] = [];
  for (const file of mdFiles(join(ctx.records, "lessons"), "LES-")) {
    const { attrs } = parseFrontmatter(readFileSync(file, "utf8"));
    const features = readAttrList(attrs.features);
    if (features.length === 0) continue;
    const relevant = features.some((feature) => new RegExp(`\\b${feature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(planText));
    if (relevant) out.push(attrs.id || basename(file, ".md"));
  }
  return out.sort();
}
