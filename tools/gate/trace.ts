import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { readCurrent } from "./indexgen.ts";
import { fail, ok, type CmdResult } from "./result.ts";
import { listFiles } from "./walk.ts";

const REQ = /REQ-\d{3}/g;

export type TraceRow = { req: string; tests: string[]; criteria: number };

function countCriteria(body: string, req: string): number {
  const parts = body.split(/^## /m);
  for (const part of parts) {
    if (!part.startsWith(req)) continue;
    return (part.match(/^\s*-\s+Given\b/gm) ?? []).length;
  }
  return 0;
}

/** REQs of features that have summary.md (completion claim = 验收范围, C-32). */
export function claimedReqs(ctx: Ctx): string[] {
  const feats = join(ctx.records, "features");
  if (!existsSync(feats)) return [];
  const out: string[] = [];
  for (const name of readdirSync(feats)) {
    if (!existsSync(join(feats, name, "summary.md"))) continue;
    const planDir = join(feats, name, "plan");
    if (!existsSync(planDir)) continue;
    for (const p of readdirSync(planDir)) {
      if (!p.endsWith(".md")) continue;
      const text = readFileSync(join(planDir, p), "utf8");
      const m = /^req:\s*(REQ-\d{3})\b/m.exec(text);
      if (m?.[1] && !out.includes(m[1])) out.push(m[1]);
    }
  }
  return out.sort();
}

export function buildTrace(ctx: Ctx): { rows: TraceRow[]; reqFile: string } {
  const cur = readCurrent(join(ctx.records, "requirements", "INDEX.md"));
  const reqFile = cur.file ?? "v1.md";
  const reqPath = join(ctx.records, "requirements", reqFile);
  const reqs: string[] = [];
  if (existsSync(reqPath)) {
    const body = readFileSync(reqPath, "utf8");
    const seen = new Set<string>();
    for (const m of body.matchAll(/## (REQ-\d{3})/g)) {
      const id = m[1] ?? "";
      if (id && !seen.has(id)) {
        seen.add(id);
        reqs.push(id);
      }
    }
  }
  const hits = new Map<string, Set<string>>();
  for (const id of reqs) hits.set(id, new Set());
  const testRoots = [join(ctx.root, "tests")];
  for (const root of testRoots) {
    if (!existsSync(root)) continue;
    for (const f of listFiles(root)) {
      if (!f.endsWith(".ts") && !f.endsWith(".md") && !f.endsWith(".py")) continue;
      let text = "";
      try {
        text = readFileSync(f, "utf8");
      } catch {
        continue;
      }
      const found = text.match(REQ) ?? [];
      for (const id of found) {
        const set = hits.get(id) ?? new Set<string>();
        set.add(f);
        hits.set(id, set);
      }
    }
  }
  const reqBody = existsSync(reqPath) ? readFileSync(reqPath, "utf8") : "";
  const rows: TraceRow[] = reqs.map((req) => ({
    req,
    tests: [...(hits.get(req) ?? [])].sort(),
    criteria: countCriteria(reqBody, req),
  }));
  return { rows, reqFile };
}

export function runTrace(ctx: Ctx): CmdResult {
  const { rows, reqFile } = buildTrace(ctx);
  if (!existsSync(join(ctx.records, "requirements", reqFile))) {
    return fail("requirements current file missing\n");
  }
  const lines = [
    `# trace matrix (generated)`,
    "",
    `- requirements: ${reqFile}`,
    `- generator: gate trace`,
    "",
    "| REQ | tests |",
    "|---|---|",
  ];
  let uncovered = 0;
  for (const r of rows) {
    if (r.tests.length === 0) uncovered += 1;
    const cell = r.tests.length === 0 ? "_none_" : r.tests.map((t) => "`" + t.replace(ctx.root, "").split("\\").join("/").replace(/^\//, "") + "`").join("<br>");
    lines.push(`| ${r.req} | ${cell} |`);
  }
  lines.push("");
  lines.push(`uncovered: ${uncovered} / ${rows.length}`);
  lines.push("");
  return ok(lines.join("\n"));
}
