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
  /** Whether the owner feature has summary.md and therefore enters C-32 enforcement scope. */
  claimed: boolean;
  /** AC-index-aligned values declared by the requirements verification protocol (DEC-174). */
  verification: string[];
  tests: string[];
  criteria: number;
  uncoveredAc: number[];
  /** ACs whose only coverage is a `[proxy:...]` name — WARN, never PASS (DEC-168). */
  proxyAc: { ac: number; note: string }[];
  /** white-box names (ISS-/DEC-/fp:) that carry an AC marker for this REQ — WARN now, FAIL in a later DEC. */
  whiteboxAc: { ac: number; name: string }[];
};

export const VERIFICATION_TYPES = ["auto", "machine-doc", "manual"] as const;
export type VerificationType = (typeof VERIFICATION_TYPES)[number];

export type RequirementProtocol = {
  req: string;
  acceptance: string[];
  verification: string[];
  verificationPresent: boolean;
  verificationMalformed: boolean;
  verificationFields: number;
};

export type VerificationInspection = {
  active: boolean;
  entries: RequirementProtocol[];
  gaps: string[];
};

function acceptanceItems(section: string): string[] {
  const out: string[] = [];
  let inAcceptance = false;
  for (const line of section.split(/\r?\n/)) {
    if (/^-\s+\*\*acceptance\*\*:\s*$/.test(line)) {
      inAcceptance = true;
      continue;
    }
    if (/^-\s+\*\*[^*]+\*\*:\s*/.test(line)) {
      inAcceptance = false;
      continue;
    }
    if (!inAcceptance) continue;
    const item = line.match(/^\s+-\s+(.+?)\s*$/)?.[1];
    if (item) out.push(item);
  }
  return out;
}

/** Parse the requirements v4 AC↔verification protocol once for G-req and trace. */
export function parseRequirementProtocols(body: string): RequirementProtocol[] {
  const headings = [...body.matchAll(/^##\s+(REQ-\d{3})\b[^\r\n]*$/gm)];
  const out: RequirementProtocol[] = [];
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const req = heading?.[1] ?? "";
    if (!req) continue;
    const start = heading?.index ?? 0;
    const end = headings[index + 1]?.index ?? body.length;
    const section = body.slice(start, end);
    const fields = [...section.matchAll(/^-\s+\*\*verification\*\*:\s*(.*?)\s*$/gm)];
    const raw = fields[0]?.[1]?.trim() ?? "";
    const bracketed = /^\[(.*)\]$/.exec(raw);
    const inner = (bracketed?.[1] ?? "").trim();
    const verification = bracketed && inner ? inner.split(",").map((value) => value.trim()) : [];
    out.push({
      req,
      acceptance: acceptanceItems(section),
      verification,
      verificationPresent: fields.length > 0,
      verificationMalformed: fields.length > 0 && !bracketed,
      verificationFields: fields.length,
    });
  }
  return out;
}

export function inspectVerificationProtocol(body: string): VerificationInspection {
  const entries = parseRequirementProtocols(body);
  const active = /^##\s+验证方式\b/m.test(body) || entries.some((entry) => entry.verificationPresent);
  const gaps: string[] = [];
  if (!active) return { active, entries, gaps };

  const allowed = new Set<string>(VERIFICATION_TYPES);
  for (const entry of entries) {
    if (entry.verificationFields > 1) {
      gaps.push(`${entry.req} has ${entry.verificationFields} verification fields`);
    }
    if (entry.verificationMalformed) {
      gaps.push(`${entry.req} verification must be a bracketed array`);
    }
    const invalid = [...new Set(entry.verification.filter((value) => !allowed.has(value)))];
    if (invalid.length > 0) {
      gaps.push(
        `${entry.req} invalid verification type(s): ${invalid.map((value) => value || "<empty>").join(", ")}`,
      );
    }
    if (entry.acceptance.length !== entry.verification.length) {
      gaps.push(
        `${entry.req} acceptance ${entry.acceptance.length} != verification ${entry.verification.length}`,
      );
    }
  }
  return { active, entries, gaps };
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

/** REQ ids on a plan's `req:` front-matter line: `req: REQ-001` or `req: [REQ-001, REQ-002]`. */
function planReqs(text: string): string[] {
  const m = /^req:\s*(.+)$/m.exec(text);
  return [...new Set((m?.[1] ?? "").match(/REQ-\d{3}/g) ?? [])];
}

/** Feature dirs that carry a summary.md: the completion claim (C-32 scope = 验收范围). */
function claimedFeatures(ctx: Ctx): { name: string; reqs: string[] }[] {
  const feats = join(ctx.records, "features");
  if (!existsSync(feats)) return [];
  const out: { name: string; reqs: string[] }[] = [];
  for (const name of readdirSync(feats).sort()) {
    if (!existsSync(join(feats, name, "summary.md"))) continue;
    const planDir = join(feats, name, "plan");
    const reqs: string[] = [];
    if (existsSync(planDir)) {
      for (const p of readdirSync(planDir)) {
        if (!p.endsWith(".md")) continue;
        for (const id of planReqs(readFileSync(join(planDir, p), "utf8"))) {
          if (!reqs.includes(id)) reqs.push(id);
        }
      }
    }
    out.push({ name, reqs });
  }
  return out;
}

/** REQs of features that have summary.md (completion claim = 验收范围, C-32). */
export function claimedReqs(ctx: Ctx): string[] {
  const out: string[] = [];
  for (const f of claimedFeatures(ctx)) {
    for (const id of f.reqs) if (!out.includes(id)) out.push(id);
  }
  return out.sort();
}

/**
 * ISS-044: a feature that claims done (summary.md) but whose plan names no REQ.
 * Before this existed such a feature made X-trace answer "no claimed-done
 * features" — the template and `gate new feature` never wrote `req:`, so C-32
 * never bound in a consumer project.
 */
export function claimedWithoutReq(ctx: Ctx): string[] {
  return claimedFeatures(ctx).filter((f) => f.reqs.length === 0).map((f) => f.name);
}

export function buildTrace(ctx: Ctx): { rows: TraceRow[]; reqFile: string } {
  const cur = readCurrent(join(ctx.records, "requirements", "INDEX.md"));
  const reqFile = cur.file ?? "v1.md";
  const reqPath = join(ctx.records, "requirements", reqFile);
  const reqBody = existsSync(reqPath) ? readFileSync(reqPath, "utf8") : "";
  const protocols = parseRequirementProtocols(reqBody);
  const reqs: string[] = [];
  for (const protocol of protocols) {
    if (!reqs.includes(protocol.req)) reqs.push(protocol.req);
  }
  const claimed = new Set(claimedReqs(ctx));
  const infos = testNameInfos(ctx);
  const rows: TraceRow[] = reqs.map((req) => {
    const protocol = protocols.find((entry) => entry.req === req);
    const mine = infos.filter((t) => t.reqs.includes(req));
    const tests = [...new Set(mine.map((t) => t.file))].sort();
    const n = protocol?.acceptance.length ?? 0;
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
    return {
      req,
      claimed: claimed.has(req),
      verification: protocol?.verification ?? [],
      tests,
      criteria: n,
      uncoveredAc,
      proxyAc,
      whiteboxAc,
    };
  });
  return { rows, reqFile };
}

/** Claimed REQs missing REQ-id hits or missing REQ-nnn/AC-i markers (C-32). */
export function uncoveredClaimed(ctx: Ctx): string[] {
  const claimed = claimedReqs(ctx);
  const { rows } = buildTrace(ctx);
  const missing: string[] = claimedWithoutReq(ctx).map((f) => `${f}: summary.md but plan has no req:`);
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
    `- enforcement scope: claimed means the owner feature has summary.md (DEC-174)`,
    "",
    "| REQ | scope | verification | tests | criteria | uncovered AC | proxy AC |",
    "|---|---|---|---|---|---|---|",
  ];
  let uncovered = 0;
  let proxies = 0;
  let claimed = 0;
  let claimedUncovered = 0;
  const whitebox: string[] = [];
  for (const r of rows) {
    const acGap = r.criteria > 0 ? r.uncoveredAc.length > 0 : r.tests.length === 0;
    if (acGap) uncovered += 1;
    if (r.claimed) {
      claimed += 1;
      if (acGap) claimedUncovered += 1;
    }
    proxies += r.proxyAc.length;
    for (const w of r.whiteboxAc) whitebox.push(`${r.req}/AC-${w.ac} <- "${w.name}"`);
    const cell = r.tests.length === 0
      ? "_none_"
      : r.tests.map((t) => "`" + posixRel(ctx.root, t) + "`").join("<br>");
    const verification = r.verification.length === 0
      ? "—"
      : r.verification.map((value, index) => `AC-${index + 1}=${value}`).join("<br>");
    const ac = r.uncoveredAc.length === 0 ? "—" : r.uncoveredAc.map((n) => `AC-${n}`).join(", ");
    const px = r.proxyAc.length === 0
      ? "—"
      : r.proxyAc.map((p) => `AC-${p.ac}${p.note ? ` [${p.note}]` : ""}`).join(", ");
    lines.push(
      `| ${r.req} | ${r.claimed ? "claimed" : "not claimed"} | ${verification} | ${cell} | ${r.criteria} | ${ac} | ${px} |`,
    );
  }
  lines.push("");
  lines.push(`claimed: ${claimed} / ${rows.length} REQ(s)`);
  lines.push(`claimed uncovered: ${claimedUncovered} REQ(s)`);
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
