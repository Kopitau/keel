import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { git } from "./git.ts";
import { readEvidence } from "./evidence.ts";
import { listFiles, mdFiles, posixRel } from "./walk.ts";
import { basename } from "node:path";

/** Committed C-34 lockfile (not gitignored; verify must not overwrite it). */
export const BASELINE_NAME = "test-baseline.json";

export type TestInventory = { names: string[]; skipped: number };

export function baselinePath(ctx: Ctx): string {
  return join(ctx.records, BASELINE_NAME);
}

export function formatBaseline(names: string[]): string {
  const unique = [...new Set(names)].sort();
  return JSON.stringify({ schema_version: 1, names: unique }, null, 2) + "\n";
}

export function parseBaseline(text: string): string[] | null {
  try {
    const j = JSON.parse(text) as { names?: unknown };
    if (!Array.isArray(j.names)) return null;
    const names = j.names.filter((n): n is string => typeof n === "string");
    return [...new Set(names)].sort();
  } catch {
    return null;
  }
}

/** Strip comments then collect test('name') / test.skip('name') in tests/. */
export function parseTestInventory(text: string): TestInventory {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
  const names: string[] = [];
  let skipped = 0;
  const re = /^[ \t]*(test|it)\s*(\.skip|\.todo)?\s*\(\s*(['"])((?:\\.|[^\\])*?)\3/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped))) {
    const name = (m[4] ?? "").replace(/\\(['"])/g, "$1");
    names.push(name);
    if (m[2]) {
      skipped += 1;
      continue;
    }
    const after = stripped.slice(m.index + m[0].length, m.index + m[0].length + 80);
    if (/^\s*,\s*\{[^}]{0,80}\bskip\s*:/.test(after)) skipped += 1;
  }
  return { names, skipped };
}

export function testFileInventory(root: string): TestInventory {
  const dir = join(root, "tests");
  const nameSet = new Set<string>();
  let skipped = 0;
  for (const f of listFiles(dir)) {
    if (!/\.(cjs|mjs|js|ts)$/.test(f)) continue;
    if (f.endsWith(".d.ts")) continue;
    const inv = parseTestInventory(readFileSync(f, "utf8"));
    for (const n of inv.names) nameSet.add(n);
    skipped += inv.skipped;
  }
  return { names: [...nameSet].sort(), skipped };
}

export function worktreeBaseline(ctx: Ctx): string[] | null {
  const p = baselinePath(ctx);
  if (!existsSync(p)) return null;
  return parseBaseline(readFileSync(p, "utf8"));
}

export function headBaseline(ctx: Ctx): string[] | null {
  const rel = posixRel(ctx.root, baselinePath(ctx));
  const r = git(ctx, ["show", `HEAD:${rel}`]);
  if (r.status !== 0 || !r.stdout) return null;
  return parseBaseline(r.stdout);
}

function recordExists(ctx: Ctx, ref: string): boolean {
  if (ref.startsWith("ISS-")) {
    return mdFiles(join(ctx.records, "issues"), "ISS-").some((f) => basename(f).startsWith(ref));
  }
  if (ref.startsWith("DEC-")) {
    return mdFiles(join(ctx.records, "decisions"), "DEC-").some((f) => basename(f).startsWith(ref));
  }
  return false;
}

const CITE_RE = /\b(?:C-34|test-baseline|test-shrink):\s*ref=(ISS-\d+|DEC-\d+)/;

function addedDiffText(diff: string): string {
  return diff
    .split(/\n/)
    .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
    .join("\n");
}

/** New worklog lines vs HEAD, plus HEAD commit body (ISS-005-style real ref). */
export function c34Citation(ctx: Ctx): string | null {
  const blobs: string[] = [];
  blobs.push(addedDiffText(git(ctx, ["diff", "HEAD"]).stdout));
  blobs.push(addedDiffText(git(ctx, ["diff", "--cached"]).stdout));
  const log = git(ctx, ["log", "-1", "--format=%B"]);
  if (log.status === 0 && log.stdout) blobs.push(log.stdout);
  const st = git(ctx, ["status", "--porcelain"]);
  if (st.status === 0) {
    for (const line of st.stdout.split(/\n/)) {
      if (!line.startsWith("??")) continue;
      const rel = line.slice(3).trim().replace(/\\/g, "/");
      if (!/worklog\.md$/i.test(rel)) continue;
      const abs = join(ctx.root, rel);
      if (existsSync(abs)) blobs.push(readFileSync(abs, "utf8"));
    }
  }
  const blob = blobs.join("\n");
  const m = blob.match(CITE_RE);
  if (!m?.[1]) return null;
  if (!recordExists(ctx, m[1])) return null;
  return m[1];
}

export function testBaselineGaps(ctx: Ctx): string[] {
  const current = testFileInventory(ctx.root);
  const head = headBaseline(ctx);
  const work = worktreeBaseline(ctx);
  const cited = c34Citation(ctx);
  const ev = readEvidence(ctx);
  const junitSkipped = ev?.counts?.skipped ?? 0;
  const gaps: string[] = [];

  if (current.skipped > 0 || junitSkipped > 0) {
    if (!cited) {
      gaps.push(
        `skipped tests=${Math.max(current.skipped, junitSkipped)} without C-34 citation`,
      );
    }
  }

  if (!head && !work) {
    return gaps;
  }

  if (work) {
    const missingFromWork = current.names.filter((n) => !work.includes(n));
    const extraInWork = work.filter((n) => !current.names.includes(n));
    if (missingFromWork.length > 0 || extraInWork.length > 0) {
      const sample = extraInWork.slice(0, 3).join(", ") || missingFromWork.slice(0, 3).join(", ");
      gaps.push(
        `keel/test-baseline.json != tests/ names (baseline-only ${extraInWork.length}, tests-only ${missingFromWork.length}: ${sample})`,
      );
    }
  } else if (head) {
    gaps.push("keel/test-baseline.json missing while HEAD has a C-34 baseline");
  }

  if (head) {
    const removed = head.filter((n) => !current.names.includes(n));
    if (removed.length > 0 && !cited) {
      const sample = removed.slice(0, 5).join(", ");
      const more = removed.length > 5 ? ` (+${removed.length - 5} more)` : "";
      gaps.push(`tests removed without C-34 citation: ${sample}${more}`);
    }
  }

  return gaps;
}
