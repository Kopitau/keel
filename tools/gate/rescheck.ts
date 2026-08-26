import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { mdFiles } from "./walk.ts";

export type ResGap = { id: string; gap: string };

const DEPTHS = new Set(["深度", "标准", "本地", "deep", "standard", "local"]);
const CITED_DEPTHS = new Set(["深度", "标准", "deep", "standard"]);

/**
 * C-08/C-09: research declares its tier and carries substance, not just a file.
 *
 * Judge substance, not layout (the ISS-038 lesson, applied before shipping this
 * time). Real records in this repo alone use `depth:` and `level:` for the same
 * field, `## 检索范围` and `## 检索范围与方法` for the same section, `## 证据`
 * and `## 逐项证据` for the same evidence block. So: either field name, prefix
 * match on headings, and only the four load-bearing sections — question, scope,
 * evidence, conclusion. The six-section template stays the guide; this is the
 * floor.
 */
export function inspectResSubstance(ctx: Ctx): ResGap[] {
  const out: ResGap[] = [];
  for (const f of mdFiles(join(ctx.records, "research"), "RES-")) {
    const { attrs, body } = parseFrontmatter(readFileSync(f, "utf8"));
    const id = (attrs.id ?? "").trim() || basename(f, ".md");
    const depthRaw = (attrs.depth ?? attrs.level ?? "").trim();
    const depth = depthRaw.toLowerCase();
    if (!depthRaw) {
      out.push({ id, gap: "no depth/level field (C-08 三档自选并声明)" });
    } else if (!DEPTHS.has(depth)) {
      out.push({ id, gap: `depth "${depthRaw}" not 深度/标准/本地 (C-08)` });
    }
    if ((attrs.bootstrap ?? "") === "true") {
      // Migrated wrapper: the substance lives in the source report it points at.
      const src = (attrs.source_path ?? "").trim();
      if (!src) {
        out.push({ id, gap: "bootstrap wrapper without source_path" });
        continue;
      }
      const p = join(ctx.root, src);
      if (!existsSync(p)) out.push({ id, gap: `source_path missing on disk: ${src}` });
      else if (readFileSync(p, "utf8").length < 1024) out.push({ id, gap: `source ${src} under 1KB — not a report` });
      continue;
    }
    if (!/^##\s+调研问题/m.test(body)) out.push({ id, gap: "no 调研问题 section (C-09)" });
    if (!/^##\s+(检索范围|方法)/m.test(body)) out.push({ id, gap: "no 检索范围/方法 section (C-09)" });
    if (!/^##\s+(逐项)?证据/m.test(body)) out.push({ id, gap: "no 证据 section (C-09)" });
    if (!/^##\s+结论/m.test(body)) out.push({ id, gap: "no 结论 section (C-09)" });
    if (CITED_DEPTHS.has(depth) && !/https?:\/\//.test(body)) {
      out.push({ id, gap: "标准/深度 tier with zero citations (C-09/C-12 离线不豁免)" });
    }
  }
  return out;
}
