import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import type { Ctx } from "./ctx.ts";
import { runNew } from "./new.ts";
import { fail, ok, type CmdResult } from "./result.ts";
import { readEvidence, writeEvidence, type Evidence } from "./evidence.ts";
import { git, gitWriteTree, gitHead } from "./git.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { sha256Normalized } from "./hash.ts";
import { mdFiles } from "./walk.ts";
import { basename } from "node:path";

export const FUSE_THRESHOLD = 3;

export type Lens = "attack" | "robustness" | "requirements";

export type ReproRun = {
  iss: string;
  command: string;
  exit_code: number;
  refused: boolean;
  round?: number;
  recorded_at?: string;
  tree_hash?: string;
};

export type ReviewClear = {
  status: "pending" | "passed" | "fused";
  lens: Lens;
  implementer_harness: string;
  reviewer_harness: string;
  heterogeneous_required: boolean;
  heterogeneous_ok: boolean;
  blocking_iss: string[];
  repro_runs: ReproRun[];
  round: number;
};

export type LoopState = {
  status: "none" | "packed" | "in_review" | "repairing" | "passed" | "fused";
  round: number;
  feature: string;
  tree_hash: string;
  paths: string[];
  lens: Lens;
  implementer_harness: string;
  reviewer_harness: string;
  blocking_iss: string[];
  advisory: string[];
  iss_fp: { [iss: string]: string };
  rounds_on: { [fp: string]: number };
  fuse_threshold: number;
  pack_hash: string;
};

export type Finding = {
  title: string;
  blocking: boolean;
  repro: string;
  body?: string;
  fingerprint?: string;
};

const PACK_KEYS = ["diff", "plan", "reqs", "evidence", "worklog_summary"] as const;

const PACK_MAX: { [k: string]: number } = {
  diff: 400000,
  plan: 80000,
  reqs: 80000,
  evidence: 120000,
  worklog_summary: 4000,
};

const ATTACK_RE = [
  /^tools\/gate\//,
  /^tools\/cli\//,
  /^\.githooks\//,
  /^bin\//,
  /^\.github\/workflows\//,
  /^keel\/approvals\//,
  /^keel\/evidence\//,
  /^keel\/config\.json$/,
  /^keel\/test-baseline\.json$/,
  /^keel\/review\//,
  /^package\.json$/,
  /^\.agents\/skills\//,
  /^\.claude\/skills\//,
  /^tests\//,
];

const CORE_RE = [/^tools\//, /^samples\//];

const LOOP_ARTIFACT_RE =
  /^keel\/review\/(pack\.json|state\.json|rounds\.json|fuse-report\.md)$|^keel\/evidence\//;

export function reviewDir(ctx: Ctx): string {
  return join(ctx.records, "review");
}

export function loopStatePath(ctx: Ctx): string {
  return join(reviewDir(ctx), "state.json");
}

export function classifyLens(paths: string[]): Lens {
  const norm = paths.map((p) => p.replace(/\\/g, "/"));
  if (norm.some((p) => ATTACK_RE.some((re) => re.test(p)))) return "attack";
  if (norm.some((p) => CORE_RE.some((re) => re.test(p)))) return "robustness";
  return "requirements";
}

export function needsHeterogeneous(lens: Lens): boolean {
  return lens === "attack";
}

export function heterogeneousOk(required: boolean, implementer: string, reviewer: string): boolean {
  if (!required) return true;
  const a = implementer.trim().toLowerCase();
  const b = reviewer.trim().toLowerCase();
  if (!a || !b) return false;
  return a !== b;
}

export function collectChangedPaths(ctx: Ctx): string[] {
  const names = new Set<string>();
  const add = (out: string): void => {
    for (const line of out.split(/\n/)) {
      const s = line.trim().replace(/\\/g, "/");
      if (s && !LOOP_ARTIFACT_RE.test(s)) names.add(s);
    }
  };
  add(git(ctx, ["diff", "--name-only", "HEAD"]).stdout);
  add(git(ctx, ["diff", "--name-only", "--cached"]).stdout);
  add(git(ctx, ["ls-files", "--others", "--exclude-standard"]).stdout);
  if (names.size === 0 && gitHead(ctx)) {
    add(git(ctx, ["diff-tree", "--no-commit-id", "--name-only", "-r", "--root", "HEAD"]).stdout);
  }
  return [...names].sort();
}

export function derivedLens(state: LoopState, ctx: Ctx): Lens {
  const live = collectChangedPaths(ctx);
  const stored = state.paths ?? [];
  if (stored.length === 0) return classifyLens(live);
  return classifyLens([...new Set([...stored, ...live])]);
}

export function packBodyHash(pack: { [k: string]: string }): { body: string; hash: string } {
  const body = JSON.stringify(pack, null, 2) + "\n";
  return { body, hash: sha256Normalized(body) };
}

export function roundsLedgerPath(ctx: Ctx): string {
  return join(reviewDir(ctx), "rounds.json");
}

export function readRoundsLedger(ctx: Ctx): { [fp: string]: number } {
  const p = roundsLedgerPath(ctx);
  if (!existsSync(p)) return {};
  try {
    const j = JSON.parse(readFileSync(p, "utf8")) as { [fp: string]: number };
    return j && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}

export function writeRoundsLedger(ctx: Ctx, rounds: { [fp: string]: number }): void {
  mkdirSync(reviewDir(ctx), { recursive: true });
  writeFileSync(roundsLedgerPath(ctx), JSON.stringify(rounds, null, 2) + "\n", "utf8");
}

export function mergeRounds(ctx: Ctx, state: LoopState): LoopState {
  const led = readRoundsLedger(ctx);
  const rounds_on = { ...state.rounds_on };
  for (const [fp, n] of Object.entries(led)) {
    rounds_on[fp] = Math.max(rounds_on[fp] ?? 0, n);
  }
  return { ...state, rounds_on };
}

export function checklistExists(ctx: Ctx): { attack: boolean; robustness: boolean; requirements: boolean } {
  const d = reviewDir(ctx);
  return {
    attack: existsSync(join(d, "attack-surface.md")),
    robustness: existsSync(join(d, "robustness.md")),
    requirements: existsSync(join(d, "requirements.md")),
  };
}

export function looksLikeChat(text: string): boolean {
  if (/implementation chat|会话记录|KEEL_IMPL_CHAT/i.test(text)) return true;
  const turns = text.match(/^(user|assistant|Human|Assistant|系统|用户)[:：]/gim);
  return Boolean(turns && turns.length >= 3);
}

export function validatePack(input: { [k: string]: unknown }): { ok: true } | { ok: false; error: string } {
  const keys = Object.keys(input);
  for (const k of keys) {
    if (!(PACK_KEYS as readonly string[]).includes(k)) {
      return { ok: false, error: `forbidden pack field '${k}' (C-39); only ${PACK_KEYS.join(", ")}` };
    }
  }
  for (const k of PACK_KEYS) {
    if (typeof input[k] !== "string") {
      return { ok: false, error: `pack missing string field '${k}'` };
    }
    const s = input[k] as string;
    const max = PACK_MAX[k] ?? 80000;
    if (s.length > max) {
      return { ok: false, error: `pack field '${k}' exceeds ${max} bytes (ISS-028)` };
    }
    if (looksLikeChat(s)) {
      return { ok: false, error: `pack field '${k}' looks like an implementation transcript (C-39/ISS-028)` };
    }
  }
  return { ok: true };
}

export function findingFingerprint(f: Finding): string {
  if (f.fingerprint && f.fingerprint.trim()) return f.fingerprint.trim();
  return sha256Normalized(`${f.title}\n${f.repro}`).slice(0, 16);
}

function findIssByFingerprint(ctx: Ctx, fp: string): string | null {
  for (const file of mdFiles(join(ctx.records, "issues"), "ISS-")) {
    const { attrs } = parseFrontmatter(readFileSync(file, "utf8"));
    if ((attrs.fingerprint ?? "") === fp && (attrs.status ?? "open") === "open") {
      return (attrs.id || basename(file)).replace(/\.md$/, "").match(/^(ISS-\d+)/)?.[1] ?? null;
    }
  }
  return null;
}

function appendWorklog(ctx: Ctx, worklogRel: string, line: string): void {
  const log = join(ctx.root, worklogRel);
  mkdirSync(dirname(log), { recursive: true });
  const text = `\n${line}\n`;
  if (existsSync(log)) appendFileSync(log, text, "utf8");
  else writeFileSync(log, `# worklog\n${text}`, "utf8");
}

export function fileFindings(
  ctx: Ctx,
  findings: Finding[],
  worklogRel: string,
): { iss: string[]; deferred: string[]; advisory: string[]; fps: { [iss: string]: string } } {
  const iss: string[] = [];
  const deferred: string[] = [];
  const advisory: string[] = [];
  const fps: { [iss: string]: string } = {};
  for (const f of findings) {
    if (f.blocking && f.repro.trim()) {
      const fp = findingFingerprint(f);
      const existing = findIssByFingerprint(ctx, fp);
      if (existing) {
        iss.push(existing);
        fps[existing] = fp;
        continue;
      }
      const created = runNew(ctx, ["iss", f.title]);
      const m = (created.stdout || "").match(/created\s+(ISS-\d+[^\s]*)/);
      const fname = m?.[1];
      if (fname) {
        const dest = join(ctx.records, "issues", fname);
        if (existsSync(dest)) {
          let body = readFileSync(dest, "utf8");
          body = body.replace(/fingerprint:\s*""/, `fingerprint: "${fp}"`);
          body = body.replace("复现命令：", `复现命令：\n\n\`\`\`\n${f.repro.trim()}\n\`\`\``);
          if (f.body) body += `\n\n${f.body}\n`;
          writeFileSync(dest, body, "utf8");
        }
        const idMatch = fname.match(/^(ISS-\d+)/);
        const id = idMatch?.[1] ?? fname;
        iss.push(id);
        fps[id] = fp;
      }
    } else if (f.blocking) {
      deferred.push(f.title);
      appendWorklog(ctx, worklogRel, `- 待核实（无复现命令，未开 ISS）：${f.title}`);
    } else {
      advisory.push(f.title);
      const extra = f.repro.trim() ? ` repro=${f.repro.trim()}` : "";
      appendWorklog(ctx, worklogRel, `- 待办（advisory）：${f.title}${extra}`);
    }
  }
  return { iss, deferred, advisory, fps };
}

export function reviewClearGaps(rev: {
  status: string;
  heterogeneous_required?: boolean;
  heterogeneous_ok?: boolean;
  blocking_iss?: string[];
  repro_runs?: ReproRun[];
}): string[] {
  const gaps: string[] = [];
  if (rev.status === "passed") {
    if (rev.heterogeneous_required && !rev.heterogeneous_ok) {
      gaps.push("heterogeneous review required; same harness is not a silent fallback (DEC-159)");
    }
    for (const id of rev.blocking_iss ?? []) {
      const run = (rev.repro_runs ?? []).find((r) => r.iss === id);
      if (!run) gaps.push(`no repro run for ${id}`);
      else if (!run.refused) gaps.push(`${id} repro still succeeds; cannot clear (REQ-027)`);
    }
  }
  return gaps;
}

export function summaryFeatures(ctx: Ctx): string[] {
  const feats = join(ctx.records, "features");
  if (!existsSync(feats)) return [];
  const out: string[] = [];
  for (const name of readdirSync(feats)) {
    if (existsSync(join(feats, name, "summary.md"))) out.push(name);
  }
  return out.sort();
}

export function completionReviewGaps(ctx: Ctx): string[] {
  const loop = readLoopState(ctx);
  if (!loop || loop.status !== "passed") return ["review loop not passed (REQ-027)"];
  if (!loop.pack_hash) return ["review pack missing; empty ingest is not a review (ISS-023)"];
  const packFile = join(reviewDir(ctx), "pack.json");
  if (!existsSync(packFile)) return ["review pack.json missing (ISS-023)"];
  if (sha256Normalized(readFileSync(packFile, "utf8")) !== loop.pack_hash) {
    return ["review pack_hash mismatch (ISS-023)"];
  }
  const tree = gitWriteTree(ctx);
  if (tree && (!loop.tree_hash || loop.tree_hash !== tree)) {
    return ["review stale tree_hash (ISS-023)"];
  }
  const lens = derivedLens(loop, ctx);
  if (needsHeterogeneous(lens) && !heterogeneousOk(true, loop.implementer_harness, loop.reviewer_harness)) {
    return ["heterogeneous review required; will not silently use the implementer harness (DEC-159)"];
  }
  const claimed = summaryFeatures(ctx);
  if (loop.feature && claimed.length > 0) {
    const uncovered = claimed.filter((f) => f !== loop.feature);
    if (uncovered.length) return [`review of ${loop.feature} does not cover ${uncovered.join(",")}`];
  }
  return [];
}

export function canClear(runs: ReproRun[], issIds: string[]): boolean {
  return issIds.every((id) => runs.some((r) => r.iss === id && r.refused));
}

export function bumpRounds(state: LoopState, stillOpen: string[]): LoopState {
  const rounds_on = { ...state.rounds_on };
  for (const id of stillOpen) {
    const fp = state.iss_fp?.[id] ?? id;
    rounds_on[fp] = (rounds_on[fp] ?? 0) + 1;
  }
  const fused = Object.values(rounds_on).some((n) => n >= (state.fuse_threshold || FUSE_THRESHOLD));
  return {
    ...state,
    round: state.round + 1,
    blocking_iss: stillOpen,
    rounds_on,
    status: fused ? "fused" : stillOpen.length === 0 ? "passed" : "repairing",
  };
}

export function fuseReport(state: LoopState): string {
  const lines = [
    "# 评审回路熔断（REQ-027）",
    "",
    `- round: ${state.round}`,
    `- threshold: ${state.fuse_threshold || FUSE_THRESHOLD}`,
    `- blocking: ${state.blocking_iss.join(", ") || "(none)"}`,
    "",
    "## rounds_on",
    "",
  ];
  for (const [id, n] of Object.entries(state.rounds_on)) {
    lines.push(`- ${id}: ${n}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function runReproCommand(
  cwd: string,
  command: string,
): { exit_code: number; refused: boolean; stdout: string } {
  const r =
    process.platform === "win32"
      ? spawnSync("cmd.exe", ["/c", command], { encoding: "utf8", cwd, timeout: 60000 })
      : spawnSync("sh", ["-c", command], { encoding: "utf8", cwd, timeout: 60000 });
  const exit_code = r.status ?? 1;
  return { exit_code, refused: exit_code !== 0, stdout: (r.stdout || "") + (r.stderr || "") };
}

export function extractRepro(body: string): string {
  const i = body.search(/复现命令：/);
  if (i < 0) return "";
  const m = body.slice(i).match(/```(?:bash|sh|txt|pwsh)?\r?\n([\s\S]*?)```/);
  return (m?.[1] ?? "").trim();
}

export function readLoopState(ctx: Ctx): LoopState | null {
  const p = loopStatePath(ctx);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as LoopState;
  } catch {
    return null;
  }
}

export function writeLoopState(ctx: Ctx, state: LoopState): void {
  mkdirSync(reviewDir(ctx), { recursive: true });
  writeFileSync(loopStatePath(ctx), JSON.stringify(state, null, 2) + "\n", "utf8");
}

export function appendAttackSurface(ctx: Ctx, line: string): void {
  const p = join(reviewDir(ctx), "attack-surface.md");
  mkdirSync(reviewDir(ctx), { recursive: true });
  const bullet = line.trim().startsWith("-") ? line.trim() : `- ${line.trim()}`;
  appendFileSync(p, `\n${bullet}\n`, "utf8");
}

export function attachReview(ev: Evidence, review: ReviewClear): Evidence {
  const history = ev.review?.repro_runs ?? [];
  return {
    ...ev,
    review: {
      ...review,
      repro_runs: [...history, ...(review.repro_runs ?? [])],
    },
  };
}

export function emptyLoop(lens: Lens, impl: string, reviewer: string): LoopState {
  return {
    status: "in_review",
    round: 0,
    feature: "",
    tree_hash: "",
    paths: [],
    lens,
    implementer_harness: impl,
    reviewer_harness: reviewer,
    blocking_iss: [],
    advisory: [],
    iss_fp: {},
    rounds_on: {},
    fuse_threshold: FUSE_THRESHOLD,
    pack_hash: "",
  };
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const next = args[i + 1];
  if (!next || next.startsWith("-")) return "";
  return next;
}

export function buildPack(ctx: Ctx, feature: string): { [k: string]: string } {
  const diff =
    git(ctx, ["diff", "HEAD"]).stdout +
    "\n" +
    git(ctx, ["diff", "--cached"]).stdout;
  let plan = "";
  let worklog = "";
  if (feature) {
    const pdir = join(ctx.records, "features", feature);
    const v2 = join(pdir, "plan", "v2.md");
    const v1 = join(pdir, "plan", "v1.md");
    if (existsSync(v2)) plan = readFileSync(v2, "utf8");
    else if (existsSync(v1)) plan = readFileSync(v1, "utf8");
    const wl = join(pdir, "worklog.md");
    if (existsSync(wl)) {
      const raw = readFileSync(wl, "utf8");
      worklog = raw.length > 3500 ? raw.slice(raw.length - 3500) : raw;
    }
  }
  let reqs = "";
  const reqIdx = join(ctx.records, "requirements", "INDEX.md");
  if (existsSync(reqIdx)) {
    const cur = (readFileSync(reqIdx, "utf8").match(/^- current:\s+(\S+)/m) ?? [])[1];
    if (cur && existsSync(join(ctx.records, "requirements", cur))) {
      reqs = readFileSync(join(ctx.records, "requirements", cur), "utf8").slice(0, 70000);
    }
  }
  let evidence = "";
  const evp = join(ctx.records, "evidence", "verify.json");
  if (existsSync(evp)) evidence = readFileSync(evp, "utf8").slice(0, 100000);
  return {
    diff: diff.trim() || "(no diff)",
    plan,
    reqs,
    evidence,
    worklog_summary: worklog,
  };
}

function writeGeneratedPack(ctx: Ctx, pack: { [k: string]: string }): { result: CmdResult; hash: string } {
  const v = validatePack(pack);
  if (!v.ok) return { result: fail(`${v.error}\n`), hash: "" };
  const { body, hash } = packBodyHash(pack);
  mkdirSync(reviewDir(ctx), { recursive: true });
  writeFileSync(join(reviewDir(ctx), "pack.json"), body, "utf8");
  return { result: ok(`wrote pack.json hash=${hash.slice(0, 12)}\n`), hash };
}

function packHashOk(ctx: Ctx, expected: string): boolean {
  const p = join(reviewDir(ctx), "pack.json");
  if (!existsSync(p) || !expected) return false;
  return sha256Normalized(readFileSync(p, "utf8")) === expected;
}

export function runLoop(ctx: Ctx, args: string[]): CmdResult {
  const sub = args[0] ?? "";
  if (sub === "status") {
    const st = readLoopState(ctx);
    if (!st) return ok("review loop: none\n");
    const lens = derivedLens(st, ctx);
    const het = needsHeterogeneous(lens);
    return ok(
      `review loop: ${st.status} round=${st.round} feature=${st.feature || "-"} lens=${lens} het_required=${het} blocking=${st.blocking_iss.join(",") || "-"} advisory=${(st.advisory ?? []).length}\n`,
    );
  }
  if (sub === "pack") {
    const feature = flag(args, "feature") || "";
    const impl = flag(args, "implementer") || process.env.KEEL_HARNESS || "unknown";
    const reviewer = flag(args, "reviewer") || "";
    const paths = collectChangedPaths(ctx);
    const lens = classifyLens(paths);
    const pack = buildPack(ctx, feature);
    const wr = writeGeneratedPack(ctx, pack);
    if (wr.result.code !== 0) return wr.result;
    const prev = mergeRounds(ctx, readLoopState(ctx) ?? emptyLoop(lens, impl, reviewer));
    const st: LoopState = {
      ...prev,
      status: "packed",
      feature,
      tree_hash: gitWriteTree(ctx),
      paths,
      lens,
      implementer_harness: impl,
      reviewer_harness: reviewer,
      pack_hash: wr.hash,
    };
    writeLoopState(ctx, st);
    return ok(
      `${wr.result.stdout}lens=${lens} het_required=${needsHeterogeneous(lens)} files=${paths.length}\n`,
    );
  }
  if (sub === "ingest") {
    const file = args[1] ?? "";
    if (!file || !existsSync(file)) return fail("usage: gate loop ingest <findings.json> [--worklog <rel>]\n");
    const st = readLoopState(ctx);
    if (!st || !st.pack_hash) {
      return fail("run gate loop pack before ingest; empty findings are not a review (ISS-023)\n");
    }
    if (!packHashOk(ctx, st.pack_hash)) {
      return fail("pack.json missing or hash mismatch; re-run gate loop pack (ISS-023)\n");
    }
    const tree = gitWriteTree(ctx);
    if (st.tree_hash && tree && st.tree_hash !== tree) {
      return fail("working tree moved since pack; re-run gate loop pack (ISS-023)\n");
    }
    const worklogIdx = args.indexOf("--worklog");
    const worklogRel =
      worklogIdx >= 0
        ? (args[worklogIdx + 1] ?? "keel/features/f07-review/worklog.md")
        : "keel/features/f07-review/worklog.md";
    let findings: Finding[] = [];
    try {
      findings = JSON.parse(readFileSync(file, "utf8")) as Finding[];
    } catch {
      return fail("findings.json invalid\n");
    }
    if (!Array.isArray(findings)) return fail("findings.json must be an array\n");
    const reviewer = flag(args, "reviewer") || st.reviewer_harness || process.env.KEEL_HARNESS || "";
    if (!reviewer || reviewer === "unknown") {
      return fail("ingest requires --reviewer <harness>; empty findings are not a review (ISS-023)\n");
    }
    const impl = flag(args, "implementer") || st.implementer_harness || "unknown";
    const lens = derivedLens(st, ctx);
    if (needsHeterogeneous(lens) && !heterogeneousOk(true, impl, reviewer)) {
      return fail("attack-lens changes require a different reviewer harness (DEC-159/ISS-024)\n");
    }
    const out = fileFindings(ctx, findings, worklogRel);
    const next: LoopState = {
      ...st,
      implementer_harness: impl,
      reviewer_harness: reviewer,
      blocking_iss: out.iss,
      advisory: [...new Set([...(st.advisory ?? []), ...out.advisory])],
      iss_fp: { ...st.iss_fp, ...out.fps },
      lens,
      tree_hash: gitWriteTree(ctx),
      status: out.iss.length > 0 ? "repairing" : "passed",
    };
    writeLoopState(ctx, next);
    return ok(
      `filed iss=${out.iss.join(",") || "-"} deferred=${out.deferred.length} advisory=${out.advisory.length} status=${next.status}\n`,
    );
  }
  if (sub === "clear") {
    const impl = flag(args, "implementer") || process.env.KEEL_HARNESS || "unknown";
    const reviewer = flag(args, "reviewer") || process.env.KEEL_REVIEWER || "";
    return recordClear(ctx, impl, reviewer);
  }
  if (sub === "append-attack") {
    const line = args.slice(1).join(" ").trim();
    if (!line) return fail("usage: gate loop append-attack <bullet>\n");
    appendAttackSurface(ctx, line);
    return ok("appended attack-surface.md\n");
  }
  return fail(
    "usage: gate loop status|pack|ingest <findings.json>|clear|append-attack <line>\n",
  );
}

function issBody(ctx: Ctx, id: string): string {
  const hit = mdFiles(join(ctx.records, "issues"), "ISS-").find((f) => basename(f).startsWith(id));
  if (!hit) return "";
  return readFileSync(hit, "utf8");
}

/** Execute each blocking ISS repro. Does not trust caller-supplied refused flags (ISS-025). */
export function recordClear(ctx: Ctx, impl: string, reviewer: string): CmdResult {
  const raw = readLoopState(ctx);
  if (!raw || !raw.pack_hash) return fail("no packed review state; gate loop pack then ingest\n");
  const st = mergeRounds(ctx, raw);
  const runRound = st.round + 1;
  const recordedAt = new Date().toISOString();
  const runTree = gitWriteTree(ctx);
  const runs: ReproRun[] = [];
  for (const id of st.blocking_iss) {
    const cmd = extractRepro(issBody(ctx, id));
    if (!cmd) {
      runs.push({
        iss: id,
        command: "",
        exit_code: 0,
        refused: false,
        round: runRound,
        recorded_at: recordedAt,
        tree_hash: runTree,
      });
      continue;
    }
    const r = runReproCommand(ctx.root, cmd);
    runs.push({
      iss: id,
      command: cmd,
      exit_code: r.exit_code,
      refused: r.refused,
      round: runRound,
      recorded_at: recordedAt,
      tree_hash: runTree,
    });
  }
  const still = st.blocking_iss.filter((id) => !runs.some((r) => r.iss === id && r.refused));
  const next = bumpRounds(
    {
      ...st,
      implementer_harness: impl,
      reviewer_harness: reviewer || st.reviewer_harness,
      tree_hash: gitWriteTree(ctx),
    },
    still,
  );
  const lens = derivedLens(next, ctx);
  const hetReq = needsHeterogeneous(lens);
  writeLoopState(ctx, next);
  writeRoundsLedger(ctx, next.rounds_on);
  const review: ReviewClear = {
    status: next.status === "passed" ? "passed" : next.status === "fused" ? "fused" : "pending",
    lens,
    implementer_harness: impl,
    reviewer_harness: reviewer || st.reviewer_harness,
    heterogeneous_required: hetReq,
    heterogeneous_ok: heterogeneousOk(hetReq, impl, reviewer || st.reviewer_harness),
    blocking_iss: next.blocking_iss,
    repro_runs: runs,
    round: next.round,
  };
  const prev = readEvidence(ctx);
  writeEvidence(ctx, attachReview(prev ?? stubEvidenceBeforeVerify(), review));
  if (next.status === "fused") {
    writeFileSync(join(reviewDir(ctx), "fuse-report.md"), fuseReport(next), "utf8");
    return fail(`fused after ${next.round} rounds\n${fuseReport(next)}`);
  }
  if (next.status === "passed") {
    const gaps = reviewClearGaps(review);
    if (gaps.length) return fail(gaps.join("; ") + "\n");
    return ok("review loop passed\n");
  }
  return fail(`review loop ${next.status} still_open=${still.join(",")}\n`);
}

function stubEvidenceBeforeVerify(): Evidence {
  return {
    command: "node --test",
    exit_code: 1,
    started: "",
    finished: new Date().toISOString(),
    git_commit: "",
    tree_hash: "",
    dirty: true,
    report_hash: "",
    counts: { passed: 0, failed: 0, skipped: 0 },
    req_coverage: {},
    stdout_tail_2kb: "review attached before verify (ISS-031)",
    actor: { harness: "unset", model: "unset", session: "unset" },
  };
}
