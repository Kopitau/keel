import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { readCurrent } from "./indexgen.ts";
import { fail, ok, type CmdResult } from "./result.ts";
import { parseTestInventory } from "./testbase.ts";
import { listFiles, posixRel } from "./walk.ts";

const REQ = /REQ-\d{3}/g;
const AC_MARK = /(REQ-\d{3})(?:\/AC-|\s+AC-)(\d+)\b/g;
/** DEC-168: white-box (regression / guard) names. They may cite a REQ but never certify an AC. */
const WHITEBOX_PREFIX = /^\s*(?:ISS-\d+|DEC-\d+|fp:)/;
/** DEC-168: a black-box name that admits it stands in for the real acceptance test. */
const PROXY = /\[proxy:([^\]]*)\]/;

export type TestKind = "blackbox" | "whitebox" | "proxy";

export type TestNameInfo = {
  file: string;
  name: string;
  kind: TestKind;
  /** release condition written inside `[proxy:...]` */
  proxyNote: string;
  acs: { req: string; ac: number }[];
  reqs: string[];
};

export type TraceRow = {
  req: string;
  tests: string[];
  criteria: number;
  uncoveredAc: number[];
  /** ACs whose only coverage is a `[proxy:...]` name — WARN, never PASS (DEC-168). */
  proxyAc: { ac: number; note: string }[];
  /** white-box names (ISS-/DEC-/fp:) that carry an AC marker for this REQ — WARN now, FAIL in a later DEC. */
  whiteboxAc: { ac: number; name: string }[];
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

/** Does this text carry the `REQ-nnn/AC-i` (or `REQ-nnn AC-i`) marker? */
export function acCoveredIn(text: string, req: string, ac: number): boolean {
  const re = new RegExp(`${req}(?:\\/AC-|\\s+AC-)${ac}\\b`);
  return re.test(text);
}

/** DEC-168 naming kinds. `[proxy:...]` wins over the prefix so a stand-in is never read as a guard. */
export function classifyTestName(name: string): { kind: TestKind; proxyNote: string } {
  const p = PROXY.exec(name);
  if (p) return { kind: "proxy", proxyNote: (p[1] ?? "").trim() };
  if (WHITEBOX_PREFIX.test(name)) return { kind: "whitebox", proxyNote: "" };
  return { kind: "blackbox", proxyNote: "" };
}

export function acMarkers(name: string): { req: string; ac: number }[] {
  const out: { req: string; ac: number }[] = [];
  for (const m of name.matchAll(AC_MARK)) out.push({ req: m[1] ?? "", ac: Number(m[2]) });
  return out;
}

/**
 * Test names in one file. JS/TS: the C-34 inventory parser (comments stripped).
 * Python: `def test_...` and `@pytest.mark...` lines. Nothing else counts — a REQ
 * id in a comment, a fixture string or a trace table is not coverage (DEC-168).
 */
export function testNamesIn(file: string, text: string): string[] {
  if (/\.(ts|js|mjs|cjs)$/.test(file)) return parseTestInventory(text).names;
  if (file.endsWith(".py")) {
    return text
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => /^(def\s+test_|@pytest\.mark\.)/.test(l));
  }
  return [];
}

export function testNameInfos(ctx: Ctx): TestNameInfo[] {
  const root = join(ctx.root, "tests");
  if (!existsSync(root)) return [];
  const out: TestNameInfo[] = [];
  for (const f of listFiles(root)) {
    if (!/\.(ts|js|mjs|cjs|py)$/.test(f) || f.endsWith(".d.ts")) continue;
    let text = "";
    try {
      text = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    for (const name of testNamesIn(f, text)) {
      const { kind, proxyNote } = classifyTestName(name);
      out.push({
        file: f,
        name,
        kind,
        proxyNote,
        acs: acMarkers(name),
        reqs: [...new Set(name.match(REQ) ?? [])],
      });
    }
  }
  return out;
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
  const reqBody = existsSync(reqPath) ? readFileSync(reqPath, "utf8") : "";
  const seen = new Set<string>();
  for (const m of reqBody.matchAll(/## (REQ-\d{3})/g)) {
    const id = m[1] ?? "";
    if (id && !seen.has(id)) {
      seen.add(id);
      reqs.push(id);
    }
  }
  const infos = testNameInfos(ctx);
  const rows: TraceRow[] = reqs.map((req) => {
    const mine = infos.filter((t) => t.reqs.includes(req));
    const tests = [...new Set(mine.map((t) => t.file))].sort();
    const n = countCriteria(reqBody, req);
    const uncoveredAc: number[] = [];
    const proxyAc: { ac: number; note: string }[] = [];
    const whiteboxAc: { ac: number; name: string }[] = [];
    for (let i = 1; i <= n; i++) {
      const hits = mine.filter((t) => t.acs.some((a) => a.req === req && a.ac === i));
      const black = hits.filter((h) => h.kind === "blackbox");
      const proxy = hits.filter((h) => h.kind === "proxy");
      const white = hits.filter((h) => h.kind === "whitebox");
      for (const w of white) whiteboxAc.push({ ac: i, name: w.name });
      if (black.length > 0) continue;
      if (proxy.length > 0) {
        proxyAc.push({ ac: i, note: proxy[0]?.proxyNote ?? "" });
        continue;
      }
      // Transitional (DEC-168): a white-box name still counts this version, flagged above.
      if (white.length > 0) continue;
      uncoveredAc.push(i);
    }
    return { req, tests, criteria: n, uncoveredAc, proxyAc, whiteboxAc };
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

/**
 * DEC-168 warnings. Proxy coverage is reported for claimed REQs (that is where
 * coverage is certified); a white-box name carrying an AC marker is a naming
 * violation wherever it sits.
 */
export function traceWarnings(ctx: Ctx, claimed: string[]): { proxies: string[]; whitebox: string[] } {
  const { rows } = buildTrace(ctx);
  const proxies: string[] = [];
  const whitebox: string[] = [];
  for (const r of rows) {
    if (claimed.includes(r.req)) {
      for (const p of r.proxyAc) proxies.push(`${r.req}/AC-${p.ac}${p.note ? ` [${p.note}]` : ""}`);
    }
    for (const w of r.whiteboxAc) whitebox.push(`${r.req}/AC-${w.ac} <- "${w.name}"`);
  }
  return { proxies, whitebox: [...new Set(whitebox)] };
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
    `- counts black-box test names only (DEC-168); [proxy:...] is a stand-in, not coverage`,
    "",
    "| REQ | tests | criteria | uncovered AC | proxy AC |",
    "|---|---|---|---|---|",
  ];
  let uncovered = 0;
  let proxies = 0;
  const whitebox: string[] = [];
  for (const r of rows) {
    const acGap = r.criteria > 0 ? r.uncoveredAc.length > 0 : r.tests.length === 0;
    if (acGap) uncovered += 1;
    proxies += r.proxyAc.length;
    for (const w of r.whiteboxAc) whitebox.push(`${r.req}/AC-${w.ac} <- "${w.name}"`);
    const cell = r.tests.length === 0
      ? "_none_"
      : r.tests.map((t) => "`" + posixRel(ctx.root, t) + "`").join("<br>");
    const ac = r.uncoveredAc.length === 0 ? "—" : r.uncoveredAc.map((n) => `AC-${n}`).join(", ");
    const px = r.proxyAc.length === 0
      ? "—"
      : r.proxyAc.map((p) => `AC-${p.ac}${p.note ? ` [${p.note}]` : ""}`).join(", ");
    lines.push(`| ${r.req} | ${cell} | ${r.criteria} | ${ac} | ${px} |`);
  }
  lines.push("");
  lines.push(`uncovered: ${uncovered} / ${rows.length}`);
  lines.push(`proxy: ${proxies} AC(s) covered only by a stand-in`);
  if (whitebox.length > 0) {
    lines.push("");
    lines.push("white-box names carrying an AC marker (DEC-168: WARN now, FAIL later):");
    for (const w of [...new Set(whitebox)]) lines.push(`- ${w}`);
  }
  lines.push("");
  return ok(lines.join("\n"));
}
