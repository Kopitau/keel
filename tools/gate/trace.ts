import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { readCurrent } from "./indexgen.ts";
import { fail, ok, type CmdResult } from "./result.ts";
import { listFiles } from "./walk.ts";

const REQ = /REQ-\d{3}/g;

export type TraceRow = {
  req: string;
  tests: string[];
  criteria: number;
  uncoveredAc: number[];
};

function criteriaLines(body: string, req: string): string[] {
  const parts = body.split(/^## /m);
  for (const part of parts) {
    if (!part.startsWith(req)) continue;
    return (part.match(/^\s*-\s+Given\b.*$/gm) ?? []).map((l) => l.trim());
  }
  return [];
}

function countCriteria(body: string, req: string): number {
  return criteriaLines(body, req).length;
}

export function acCoveredIn(text: string, req: string, ac: number): boolean {
  const re = new RegExp(`${req}(?:\\/AC-|\\s+AC-)${ac}\\b`);
  return re.test(text);
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
  const rows: TraceRow[] = reqs.map((req) => {
    const tests = [...(hits.get(req) ?? [])].sort();
    const n = countCriteria(reqBody, req);
    const blob = tests.map((f) => {
      try {
        return readFileSync(f, "utf8");
      } catch {
        return "";
      }
    }).join("\n");
    const uncoveredAc: number[] = [];
    for (let i = 1; i <= n; i++) {
      if (!acCoveredIn(blob, req, i)) uncoveredAc.push(i);
    }
    return { req, tests, criteria: n, uncoveredAc };
  });
  return { rows, reqFile };
}

/** Claimed REQs missing REQ-id hits or missing REQ-nnn/AC-i markers (C-32). */
export function uncoveredClaimed(ctx: Ctx): string[] {
  const claimed = claimedReqs(ctx);
  const { rows } = buildTrace(ctx);
  const missing: string[] = [];
  for (const id of claimed) {
    const row = rows.find((r) => r.req === id);
    if (!row) {
      missing.push(id);
      continue;
    }
    if (row.criteria > 0) {
      for (const ac of row.uncoveredAc) missing.push(`${id}/AC-${ac}`);
    } else if (row.tests.length === 0) {
      missing.push(id);
    }
  }
  return missing;
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
    "| REQ | tests | criteria | uncovered AC |",
    "|---|---|---|---|",
  ];
  let uncovered = 0;
  for (const r of rows) {
    const acGap = r.criteria > 0 ? r.uncoveredAc.length > 0 : r.tests.length === 0;
    if (acGap) uncovered += 1;
    const cell = r.tests.length === 0 ? "_none_" : r.tests.map((t) => "`" + t.replace(ctx.root, "").split("\\").join("/").replace(/^\//, "") + "`").join("<br>");
    const ac = r.uncoveredAc.length === 0 ? "—" : r.uncoveredAc.map((n) => `AC-${n}`).join(", ");
    lines.push(`| ${r.req} | ${cell} | ${r.criteria} | ${ac} |`);
  }
  lines.push("");
  lines.push(`uncovered: ${uncovered} / ${rows.length}`);
  lines.push("");
  return ok(lines.join("\n"));
}
