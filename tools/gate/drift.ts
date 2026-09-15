import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { gitHead, gitIdentity } from "./git.ts";
import { sha256Normalized } from "./hash.ts";
import { fail, ok, usage, type CmdResult } from "./result.ts";
import {
  contentFingerprint, loadSpecModel, repoRelative, safePath, sourceFile,
  type SourceFile, type SpecFeature, type SpecModel,
} from "./spec-map.ts";

export type DriftState = "unmapped" | "unreviewed" | "aligned" | "spec-changed" | "code-changed" | "both-changed" | "missing" | "invalid";
export type DriftEntry = {
  at: string; actor: string; commit: string; reason: string; evidence: SourceFile;
  specHash: string; codeHash: string; fingerprint: string;
  implementation: SourceFile[]; related: SourceFile[]; hash: string;
};
type Ledger = { schemaVersion: 1; feature: string; entries: DriftEntry[] };
export type DriftRow = {
  feature: string; state: DriftState; fingerprint: string;
  changed: string[]; notes: string[]; previous: DriftEntry | null;
};
export type DriftReport = {
  schemaVersion: 1; rows: DriftRow[]; problems: string[];
  needsReview: number; unmapped: number;
};
const HASH = /^[a-f0-9]{64}$/;
const statesNeedingReview = new Set<DriftState>(["unreviewed", "spec-changed", "code-changed", "both-changed", "missing", "invalid"]);

function ledgerPath(ctx: Ctx, id: string): string {
  return safePath(ctx, `${repoRelative(ctx, ctx.records)}/drift/${id}.json`);
}
function validSource(value: unknown): value is SourceFile {
  if (!value || typeof value !== "object") return false;
  const row = value as SourceFile;
  return typeof row.path === "string" && typeof row.problem === "string" &&
    (row.hash === null || (typeof row.hash === "string" && HASH.test(row.hash)));
}
function entryHash(entry: Omit<DriftEntry, "hash">): string {
  return sha256Normalized(JSON.stringify(entry));
}
function readLedger(ctx: Ctx, id: string): Ledger | null {
  const path = ledgerPath(ctx, id);
  if (!existsSync(path)) return null;
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!parsed || typeof parsed !== "object") throw new Error("invalid drift ledger");
  const ledger = parsed as Ledger;
  if (ledger.schemaVersion !== 1 || ledger.feature !== id || !Array.isArray(ledger.entries) || !ledger.entries.length) {
    throw new Error("invalid drift ledger schema");
  }
  for (const value of ledger.entries) {
    if (!value || typeof value !== "object") throw new Error("invalid drift entry");
    const { hash, ...entry } = value;
    if (!["at", "actor", "commit", "reason", "specHash", "codeHash", "fingerprint"].every(k => typeof (entry as unknown as Record<string, unknown>)[k] === "string") ||
        !entry.reason.trim() || !entry.actor.trim() || !HASH.test(entry.specHash) || !HASH.test(entry.codeHash) ||
        !validSource(entry.evidence) || !entry.evidence.hash || entry.evidence.problem ||
        !Array.isArray(entry.implementation) || !entry.implementation.length || !entry.implementation.every(validSource) ||
        entry.implementation.some(r => !r.hash || r.problem) || !Array.isArray(entry.related) || !entry.related.every(validSource) ||
        contentFingerprint(id, entry.specHash, entry.codeHash) !== entry.fingerprint ||
        sha256Normalized(JSON.stringify(entry.implementation)) !== entry.codeHash || entryHash(entry) !== hash) {
      throw new Error("invalid or corrupted drift entry");
    }
  }
  return ledger;
}

function changedFiles(before: SourceFile[], after: SourceFile[]): string[] {
  const paths = [...new Set([...before, ...after].map(r => r.path))].sort();
  return paths.filter(p => before.find(r => r.path === p)?.hash !== after.find(r => r.path === p)?.hash ||
    before.find(r => r.path === p)?.problem !== after.find(r => r.path === p)?.problem);
}

function rowFor(ctx: Ctx, feature: SpecFeature): DriftRow {
  const row: DriftRow = { feature: feature.id, state: "unmapped", fingerprint: feature.fingerprint, changed: [], notes: [], previous: null };
  try { row.previous = readLedger(ctx, feature.id)?.entries.at(-1) ?? null; }
  catch (error) { row.state = "invalid"; row.notes.push((error as Error).message); return row; }
  const previous = row.previous;
  const broken = [...feature.implementation, ...feature.related].filter(r => r.problem);
  if (feature.problems.length) {
    row.state = "invalid"; row.notes.push(...feature.problems);
  } else if (broken.length) {
    row.state = "missing"; row.notes.push(...broken.map(r => `${r.path}: ${r.problem}`));
  } else if (!feature.implementation.length) {
    row.state = previous ? "missing" : "unmapped";
    if (previous) row.notes.push("governed implementation mapping was removed; restore it or version the affected contract and mapping");
  } else if (!previous) row.state = "unreviewed";
  else {
    const spec = feature.specHash !== previous.specHash;
    const code = feature.codeHash !== previous.codeHash;
    row.state = spec && code ? "both-changed" : spec ? "spec-changed" : code ? "code-changed" : "aligned";
  }
  if (previous) {
    row.changed = changedFiles(previous.implementation, feature.implementation);
    const related = changedFiles(previous.related, feature.related);
    if (related.length) row.notes.push(`related context changed (not governed drift): ${related.join(", ")}`);
    const evidence = sourceFile(ctx, previous.evidence.path);
    if (evidence.hash !== previous.evidence.hash || evidence.problem) row.notes.push("review evidence changed or missing; inspect the recorded hash and original evidence separately");
  }
  if (feature.drafts.length) row.notes.push(`newer draft plans are not the bound scope: ${feature.drafts.join(", ")}`);
  return row;
}

export function buildDriftReport(ctx: Ctx, model = loadSpecModel(ctx)): DriftReport {
  const problems = [...model.problems];
  const rows = model.features.map(f => rowFor(ctx, f));
  try {
    const dir = safePath(ctx, `${repoRelative(ctx, ctx.records)}/drift`);
    if (existsSync(dir)) {
      for (const name of readdirSync(dir).sort()) {
        if (!name.endsWith(".json")) continue;
        if (!/^F[1-9]\d*\.json$/.test(name)) { problems.push(`unexpected drift ledger: ${name}`); continue; }
        const id = name.slice(0, -5);
        if (!model.features.some(f => f.id === id)) {
          rows.push({ feature: id, state: "missing", fingerprint: "", changed: [], notes: ["reviewed feature or its plan was removed; governance is not silently retired"], previous: null });
        }
      }
    }
  } catch (error) { problems.push((error as Error).message); }
  return {
    schemaVersion: 1, rows, problems,
    needsReview: rows.filter(r => statesNeedingReview.has(r.state)).length,
    unmapped: rows.filter(r => r.state === "unmapped").length,
  };
}

export function driftSummary(ctx: Ctx): string {
  const report = buildDriftReport(ctx);
  return `drift: ${report.needsReview} need review; ${report.unmapped} unmapped; ${report.problems.length} source problems — gate drift (content signals, not semantic acceptance)`;
}

function review(ctx: Ctx, args: string[]): CmdResult {
  const id = args[0] ?? "";
  const options = new Map<string, string>();
  if (!/^F[1-9]\d*$/.test(id)) return usage("usage: gate drift review Fnn --expect <fingerprint> --reason <why> --evidence <repo-path>");
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i] ?? "";
    const value = args[i + 1];
    if (!["--expect", "--reason", "--evidence"].includes(key) || options.has(key) || !value?.trim()) return usage("review needs unique --expect, --reason and --evidence values");
    options.set(key, value);
  }
  if (options.size !== 3) return usage("review needs --expect, --reason and --evidence; it is not artifact approval or user acceptance");
  const expected = options.get("--expect") ?? "";
  if (!HASH.test(expected)) return usage("invalid fingerprint; inspect gate drift --json first");
  let locked = "";
  try {
    const path = ledgerPath(ctx, id);
    const dir = safePath(ctx, `${repoRelative(ctx, ctx.records)}/drift`);
    mkdirSync(dir, { recursive: true });
    const lock = safePath(ctx, `${repoRelative(ctx, ctx.records)}/drift/${id}.lock`);
    mkdirSync(lock);
    locked = lock;
    const model: SpecModel = loadSpecModel(ctx);
    if (model.problems.length) return fail(`fix source problems before review: ${model.problems.join("; ")}\n`);
    const feature = model.features.find(f => f.id === id);
    if (!feature) return fail(`unknown feature ${id}\n`);
    const row = rowFor(ctx, feature);
    if (["invalid", "missing", "unmapped"].includes(row.state)) return fail(`cannot review ${row.state}: ${row.notes.join("; ")}\n`);
    if (feature.fingerprint !== expected) return fail("content changed since inspection; inspect drift again before recording a review\n");
    const ledger = readLedger(ctx, id) ?? { schemaVersion: 1 as const, feature: id, entries: [] };
    const evidence = sourceFile(ctx, options.get("--evidence") ?? "");
    if (evidence.problem || !evidence.hash) return fail(`review evidence unavailable: ${evidence.path}: ${evidence.problem}\n`);
    if (evidence.path.startsWith(`${repoRelative(ctx, ctx.records)}/drift/`)) return fail("a drift ledger is not independent review evidence\n");
    const actor = gitIdentity(ctx);
    const entry: Omit<DriftEntry, "hash"> = {
      at: new Date().toISOString(), actor: `${actor.name} <${actor.email}>`, commit: gitHead(ctx),
      reason: (options.get("--reason") ?? "").trim(), evidence,
      specHash: feature.specHash, codeHash: feature.codeHash, fingerprint: feature.fingerprint,
      implementation: feature.implementation, related: feature.related,
    };
    const current = loadSpecModel(ctx);
    if (current.problems.length || current.features.find(f => f.id === id)?.fingerprint !== expected ||
        sourceFile(ctx, evidence.path).hash !== evidence.hash) return fail("content or evidence changed during review; inspect again\n");
    ledger.entries.push({ ...entry, hash: entryHash(entry) });
    const temp = safePath(ctx, `${repoRelative(ctx, ctx.records)}/drift/${id}.json.tmp`);
    writeFileSync(temp, JSON.stringify(ledger, null, 2) + "\n", "utf8");
    renameSync(temp, path);
    return ok(`recorded ${id} content review ${ledger.entries.length}; no Git index changes; not approval, test execution, or user acceptance\n`);
  } catch (error) {
    return fail(`drift review: ${(error as Error).message}\n`);
  } finally {
    if (locked) rmdirSync(locked);
  }
}

export function runDrift(ctx: Ctx, args: string[]): CmdResult {
  if (args[0] === "review") return review(ctx, args.slice(1));
  if (args.some(a => !["--json", "--check"].includes(a))) return usage("usage: gate drift [--json] [--check] | review Fnn --expect <fingerprint> --reason <why> --evidence <repo-path>");
  const model = loadSpecModel(ctx);
  const report = buildDriftReport(ctx, model);
  const code = args.includes("--check") && (report.needsReview > 0 || report.problems.length > 0) ? 1 : 0;
  if (args.includes("--json")) return { code, stdout: JSON.stringify({ ...report, model }, null, 2) + "\n", stderr: "" };
  const lines = ["Spec ↔ implementation content review (not semantic acceptance)", ...report.problems.map(p => `source problem: ${p}`)];
  for (const row of report.rows) {
    const feature = model.features.find(f => f.id === row.feature);
    lines.push(`${row.feature} ${row.state} — ${feature?.reqs.join(", ") ?? "removed"}`);
    if (feature) {
      lines.push(`  plan: ${feature.plan}`, `  implementation: ${feature.implementation.map(r => r.path).join(", ") || "(unmapped)"}`);
      if (feature.related.length) lines.push(`  related: ${feature.related.map(r => r.path).join(", ")}`);
    }
    if (row.changed.length) lines.push(`  changed implementation: ${row.changed.join(", ")}`);
    lines.push(...row.notes.map(n => `  ${n}`));
    if (row.fingerprint && statesNeedingReview.has(row.state)) lines.push(`  fingerprint: ${row.fingerprint}`);
  }
  lines.push(`summary: ${report.needsReview} need review; ${report.unmapped} unmapped; ${report.problems.length} source problems`);
  if (report.needsReview) lines.push("Inspect intent → requirement → mapping → implementation and actual evidence. Fix the mismatched layer; version frozen semantics. Only then use drift review with this fingerprint, reason and evidence. Editing a spec alone does not clear drift.");
  return { code, stdout: lines.join("\n") + "\n", stderr: "" };
}
