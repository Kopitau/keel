// F7 plan-level review loop (REQ-027 / REQ-028, CHG-011).
//
// One loop per confirmed plan, run once after the whole plan is implemented; a
// finished feature does not trigger a review. Products, both append-only:
//   keel/review/findings.md     what each round's reviewer found and where it went
//   keel/review/disposition.md  machine state (front matter) + one history row per event
// keel/review/pack.json is the hashed reviewer input (gitignored). No state.json,
// rounds.json or fuse-report.md any more: the fuse counters live in the disposition
// front matter and a fuse report is appended to its body.
//
// ISS ingest / clear keep DEC-182: a blocking finding opens an ISS only when its
// attack probe exits 0 on the unfixed tree; clear reruns every probe and needs a
// nonzero exit; every run is appended to the disposition and to evidence.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import type { Ctx } from "./ctx.ts";
import { runNew } from "./new.ts";
import { fail, ok, type CmdResult } from "./result.ts";
import { readEvidence, writeEvidence, type Evidence } from "./evidence.ts";
import { git, gitHead, gitWriteTree } from "./git.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { sha256Normalized } from "./hash.ts";
import { mdFiles } from "./walk.ts";

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

export type LoopStatus = "none" | "packed" | "in_review" | "repairing" | "passed" | "fused";

export type LoopState = {
  status: LoopStatus;
  /** Overview file (plan/INDEX current) the loop reviews; "" = unknown/any. */
  plan: string;
  round: number;
  /** Git rev the pack diff starts from; "" = working tree against HEAD. */
  base: string;
  tree_hash: string;
  pack_hash: string;
  paths: string[];
  lens: Lens;
  implementer_harness: string;
  reviewer_harness: string;
  blocking_iss: string[];
  advisory: string[];
  /** Blocking findings the gate could not verify (no probe, no impact, or probe not exit 0): they hold the loop in_review. */
  deferred: string[];
  iss_fp: { [iss: string]: string };
  rounds_on: { [fp: string]: number };
  fuse_threshold: number;
};

export type Finding = {
  title: string;
  blocking: boolean;
  repro: string;
  impact?: string;
  pending_defense?: string;
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

/** ISS-052: unstaged and staged diff sources, partitioned without overlap. */
export const PACK_DIFF_ARGS = [["diff"], ["diff", "--cached"]] as const;

const ATTACK_RE = [
  /^tools\/gate\//,
  /^tools\/cli\//,
  /^\.githooks\//,
  /^bin\//,
  /^\.github\/workflows\//,
  /^keel\/approvals\//,
  /^keel\/evidence\//,
  /^keel\/config\.json$/,
  /^keel\/review\//,
  /^package\.json$/,
  /^\.agents\/skills\//,
  /^\.claude\/skills\//,
  /^tests\//,
];

const CORE_RE = [/^tools\//, /^samples\//];

const LOOP_ARTIFACT_RE = /^keel\/review\/(pack\.json|disposition\.md|findings\.md)$|^keel\/evidence\//;

export function reviewDir(ctx: Ctx): string {
  return join(ctx.records, "review");
}

export function dispositionPath(ctx: Ctx): string {
  return join(reviewDir(ctx), "disposition.md");
}

export function findingsPath(ctx: Ctx): string {
  return join(reviewDir(ctx), "findings.md");
}

/** Compatibility alias: the loop state lives in disposition.md (CHG-011). */
export function loopStatePath(ctx: Ctx): string {
  return dispositionPath(ctx);
}

export function currentPlanFile(ctx: Ctx): string {
  const idx = join(ctx.records, "plan", "INDEX.md");
  if (!existsSync(idx)) return "";
  return (readFileSync(idx, "utf8").match(/^- current:\s+(\S+)/m) ?? [])[1] ?? "";
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

/** Changed paths since `base` (or the working tree against HEAD), loop artifacts excluded. */
export function collectChangedPaths(ctx: Ctx, base = ""): string[] {
  const names = new Set<string>();
  const add = (out: string): void => {
    for (const line of out.split(/\n/)) {
      const s = line.trim().replace(/\\/g, "/");
      if (s && !LOOP_ARTIFACT_RE.test(s)) names.add(s);
    }
  };
  if (base) {
    add(git(ctx, ["diff", "--name-only", base]).stdout);
  } else {
    add(git(ctx, ["diff", "--name-only", "HEAD"]).stdout);
    add(git(ctx, ["diff", "--name-only", "--cached"]).stdout);
  }
  add(git(ctx, ["ls-files", "--others", "--exclude-standard"]).stdout);
  if (names.size === 0 && !base && gitHead(ctx)) {
    add(git(ctx, ["diff-tree", "--no-commit-id", "--name-only", "-r", "--root", "HEAD"]).stdout);
  }
  return [...names].sort();
}

/** ISS-024: the lens follows real paths — stored at pack time plus whatever moved since. */
export function derivedLens(state: LoopState, ctx: Ctx): Lens {
  const live = collectChangedPaths(ctx, state.base);
  const stored = state.paths ?? [];
  if (stored.length === 0) return classifyLens(live);
  return classifyLens([...new Set([...stored, ...live])]);
}

export function packBodyHash(pack: { [k: string]: string }): { body: string; hash: string } {
  const body = JSON.stringify(pack, null, 2) + "\n";
  return { body, hash: sha256Normalized(body) };
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
    // The diff legitimately contains anything — including docs and tests about
    // this very heuristic — so the transcript check guards the prose fields only.
    if (k !== "diff" && looksLikeChat(s)) {
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

function fillIssueSection(text: string, heading: string, value: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(## ${escaped}\\r?\\n)(?:\\r?\\n)?`);
  return text.replace(re, (_whole, prefix: string) => `${prefix}\n${value.trim()}\n\n`);
}

// ---------------------------------------------------------------- disposition.md

const DISPOSITION_BODY =
  "\n# 方案级评审处置表（REQ-027）\n\n" +
  "机器状态在前言，由 `gate loop` 维护；下表按轮次追加，不覆盖历史（DEC-177 / ISS-036）。发现清单见 `findings.md`。\n\n" +
  "| 轮 | 时间 | 事件 | 树哈希 | 详情 |\n|---|---|---|---|---|\n";

function fmValue(v: string): string {
  return v ? v : '""';
}

function formatState(state: LoopState): string {
  return [
    "---",
    "schema: disposition-v1",
    `status: ${state.status}`,
    `plan: ${fmValue(state.plan)}`,
    `round: ${state.round}`,
    `base: ${fmValue(state.base)}`,
    `tree_hash: ${fmValue(state.tree_hash)}`,
    `pack_hash: ${fmValue(state.pack_hash)}`,
    `lens: ${state.lens}`,
    `implementer_harness: ${fmValue(state.implementer_harness)}`,
    `reviewer_harness: ${fmValue(state.reviewer_harness)}`,
    `fuse_threshold: ${state.fuse_threshold || FUSE_THRESHOLD}`,
    `blocking_iss: ${JSON.stringify(state.blocking_iss ?? [])}`,
    `advisory: ${JSON.stringify(state.advisory ?? [])}`,
    `deferred: ${JSON.stringify(state.deferred ?? [])}`,
    `iss_fp: ${JSON.stringify(state.iss_fp ?? {})}`,
    `rounds_on: ${JSON.stringify(state.rounds_on ?? {})}`,
    `paths: ${JSON.stringify(state.paths ?? [])}`,
    "---",
  ].join("\n") + "\n";
}

export function readLoopState(ctx: Ctx): LoopState | null {
  const p = dispositionPath(ctx);
  if (!existsSync(p)) return null;
  try {
    const { attrs } = parseFrontmatter(readFileSync(p, "utf8"));
    if (!attrs.status) return null;
    const j = <T>(key: string, fallback: T): T => {
      try {
        const v = JSON.parse(attrs[key] ?? "") as T;
        return v && typeof v === "object" ? v : fallback;
      } catch {
        return fallback;
      }
    };
    return {
      status: attrs.status as LoopStatus,
      plan: attrs.plan ?? "",
      round: Number(attrs.round ?? 0) || 0,
      base: attrs.base ?? "",
      tree_hash: attrs.tree_hash ?? "",
      pack_hash: attrs.pack_hash ?? "",
      lens: (attrs.lens as Lens) || "requirements",
      implementer_harness: attrs.implementer_harness ?? "",
      reviewer_harness: attrs.reviewer_harness ?? "",
      fuse_threshold: Number(attrs.fuse_threshold ?? FUSE_THRESHOLD) || FUSE_THRESHOLD,
      blocking_iss: j<string[]>("blocking_iss", []),
      advisory: j<string[]>("advisory", []),
      deferred: j<string[]>("deferred", []),
      iss_fp: j<{ [iss: string]: string }>("iss_fp", {}),
      rounds_on: j<{ [fp: string]: number }>("rounds_on", {}),
      paths: j<string[]>("paths", []),
    };
  } catch {
    return null;
  }
}

/** Rewrites the front matter; the history body below it is never rewritten. */
export function writeLoopState(ctx: Ctx, state: LoopState): void {
  mkdirSync(reviewDir(ctx), { recursive: true });
  const p = dispositionPath(ctx);
  let body = DISPOSITION_BODY;
  if (existsSync(p)) {
    const raw = readFileSync(p, "utf8");
    const fm = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
    const rest = fm ? raw.slice(fm[0].length) : raw;
    if (rest.trim()) body = rest;
  }
  writeFileSync(p, formatState(state) + body, "utf8");
}

function appendDisposition(ctx: Ctx, state: LoopState, event: string, detail: string): void {
  const p = dispositionPath(ctx);
  if (!existsSync(p)) writeLoopState(ctx, state);
  const tree = (state.tree_hash ?? "").slice(0, 12) || "-";
  const cell = detail.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
  appendFileSync(p, `| ${state.round} | ${new Date().toISOString()} | ${event} | ${tree} | ${cell} |\n`, "utf8");
}

export function appendFindings(ctx: Ctx, heading: string, lines: string[]): void {
  const p = findingsPath(ctx);
  mkdirSync(reviewDir(ctx), { recursive: true });
  if (!existsSync(p)) {
    writeFileSync(
      p,
      "# 方案级评审发现清单（REQ-027）\n\n每轮评审的原始发现与去向（ISS / 待核实 / advisory），按轮追加，不覆盖历史。\n",
      "utf8",
    );
  }
  appendFileSync(p, `\n## ${heading}\n\n${lines.length > 0 ? lines.join("\n") : "- （无发现）"}\n`, "utf8");
}

// ---------------------------------------------------------------- findings → ISS

export function fileFindings(
  ctx: Ctx,
  findings: Finding[],
  worklogRel = "",
): { iss: string[]; deferred: string[]; advisory: string[]; fps: { [iss: string]: string }; notes: string[] } {
  const iss: string[] = [];
  const deferred: string[] = [];
  const advisory: string[] = [];
  const fps: { [iss: string]: string } = {};
  const notes: string[] = [];
  const note = (line: string): void => {
    notes.push(line);
    if (worklogRel) appendWorklog(ctx, worklogRel, line);
  };
  for (const f of findings) {
    if (f.blocking && !f.repro.trim()) {
      deferred.push(f.title);
      note(`- 待核实（无复现命令，未开 ISS）：${f.title}`);
    } else if (f.blocking && !(f.impact ?? "").trim()) {
      deferred.push(f.title);
      note(`- 待核实（无影响说明，未开 ISS）：${f.title}`);
    } else if (f.blocking) {
      // DEC-182: a blocking repro is an attack probe. It may open an ISS only
      // when it actually demonstrates the problem on the current, unfixed tree.
      const command = f.repro.trim();
      const probeTree = gitWriteTree(ctx);
      const probeRecordedAt = new Date().toISOString();
      const probe = runReproCommand(ctx.root, command);
      if (probe.exit_code !== 0) {
        deferred.push(f.title);
        const output = probe.stdout.trim().replace(/\s+/g, " ").slice(-300) || "(empty)";
        note(
          `- 待核实（攻击探针首次退出 ${probe.exit_code}，未开 ISS）：${f.title}; command=${command}; tree=${probeTree || "(none)"}; output=${output}`,
        );
        continue;
      }
      const fp = findingFingerprint(f);
      const existing = findIssByFingerprint(ctx, fp);
      if (existing) {
        iss.push(existing);
        fps[existing] = fp;
        note(`- blocking → ${existing}（同指纹已开）：${f.title}; command=${command}`);
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
          body = body.replace(/source:\s*""/, "source: review-loop");
          body = fillIssueSection(body, "现象", f.title);
          body = fillIssueSection(body, "影响", (f.impact ?? "").replace(/\s+/g, " ").slice(0, 2000));
          body = fillIssueSection(
            body,
            "待诊断防线",
            (f.pending_defense ?? "待诊断；未知根因和修复保持空白。").replace(/\s+/g, " ").slice(0, 2000),
          );
          body = body.replace("复现命令：", `复现命令：\n\n\`\`\`\n${command}\n\`\`\``);
          body +=
            `\n\n## 打开态攻击探针\n\n` +
            `- probe_exit_code: ${probe.exit_code}\n` +
            `- probe_recorded_at: ${probeRecordedAt}\n` +
            `- probe_tree_hash: ${probeTree || "(none)"}\n` +
            `- probe_result: vulnerable\n`;
          if (f.body) body += `\n\n${f.body}\n`;
          writeFileSync(dest, body, "utf8");
        }
        const idMatch = fname.match(/^(ISS-\d+)/);
        const id = idMatch?.[1] ?? fname;
        iss.push(id);
        fps[id] = fp;
        note(`- blocking → ${id}：${f.title}; command=${command}`);
      }
    } else {
      advisory.push(f.title);
      const extra = f.repro.trim() ? ` repro=${f.repro.trim()}` : "";
      note(`- 待办（advisory）：${f.title}${extra}`);
    }
  }
  return { iss, deferred, advisory, fps, notes };
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

/** Every active feature (plan/, worklog.md or summary.md) has its summary.md. */
export function planComplete(ctx: Ctx): boolean {
  const feats = join(ctx.records, "features");
  if (!existsSync(feats)) return false;
  let any = false;
  for (const name of readdirSync(feats)) {
    const dir = join(feats, name);
    const active =
      existsSync(join(dir, "summary.md")) || existsSync(join(dir, "worklog.md")) || existsSync(join(dir, "plan"));
    if (!active) continue;
    any = true;
    if (!existsSync(join(dir, "summary.md"))) return false;
  }
  return any;
}

/** The disposition counts only for the plan it names (or when either side is unknown). */
export function loopForCurrentPlan(ctx: Ctx): LoopState | null {
  const st = readLoopState(ctx);
  if (!st) return null;
  const cur = currentPlanFile(ctx);
  if (st.plan && cur && st.plan !== cur) return null;
  return st;
}

/** Hard gaps for G-done (REQ-027/AC-10): fused, plan done but never reviewed, or a passed loop that cannot be trusted. */
export function completionReviewGaps(ctx: Ctx): string[] {
  const loop = loopForCurrentPlan(ctx);
  if (!loop) {
    return planComplete(ctx)
      ? ["plan implemented (every active feature has summary.md) but the plan-level review has not run (REQ-027)"]
      : [];
  }
  if (loop.status === "fused") {
    return [`review fused after ${loop.round} round(s); blocking ${loop.blocking_iss.join(",") || "-"} (REQ-027/AC-6)`];
  }
  if (loop.status !== "passed") return [];
  if (!loop.pack_hash) return ["review pack missing; empty ingest is not a review (ISS-023)"];
  const packFile = join(reviewDir(ctx), "pack.json");
  if (!existsSync(packFile)) return ["review pack.json missing (ISS-023)"];
  if (sha256Normalized(readFileSync(packFile, "utf8")) !== loop.pack_hash) {
    return ["review pack_hash mismatch (ISS-023)"];
  }
  const lens = derivedLens(loop, ctx);
  if (needsHeterogeneous(lens) && !heterogeneousOk(true, loop.implementer_harness, loop.reviewer_harness)) {
    return ["heterogeneous review required; will not silently use the implementer harness (DEC-159)"];
  }
  return [];
}

/** Soft signals for G-done: a loop still in progress, or a passed loop whose tree moved (ISS-023, WARN not FAIL under CHG-011). */
export function completionReviewWarnings(ctx: Ctx): string[] {
  const loop = loopForCurrentPlan(ctx);
  if (!loop) return [];
  if (loop.status === "packed" || loop.status === "in_review" || loop.status === "repairing") {
    return [`plan-level review ${loop.status} (round ${loop.round}; blocking ${loop.blocking_iss.join(",") || "-"})`];
  }
  if (loop.status === "passed") {
    const tree = gitWriteTree(ctx);
    if (tree && loop.tree_hash && loop.tree_hash !== tree) {
      return [
        `review passed at tree ${loop.tree_hash.slice(0, 12)}; tree is now ${tree.slice(0, 12)} — re-pack if code changed (ISS-023)`,
      ];
    }
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
    "## 熔断（REQ-027/AC-6）",
    "",
    `- round: ${state.round}`,
    `- threshold: ${state.fuse_threshold || FUSE_THRESHOLD}`,
    `- blocking: ${state.blocking_iss.join(", ") || "(none)"}`,
    "",
    "rounds_on:",
    "",
  ];
  for (const [id, n] of Object.entries(state.rounds_on)) {
    lines.push(`- ${id}: ${n}`);
  }
  lines.push("");
  return lines.join("\n");
}

let shPath: string | null | undefined;

/** ISS-054: the POSIX shell every supported OS already needs for the hooks (DEC-146). */
export function probeShell(): string | null {
  if (shPath !== undefined) return shPath;
  if (process.platform !== "win32") {
    shPath = "sh";
    return shPath;
  }
  const where = spawnSync("where", ["sh"], { encoding: "utf8" });
  const hit = (where.stdout || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /sh\.exe$/i.test(l));
  shPath = hit ?? null;
  return shPath;
}

/**
 * Attack probes are POSIX one-liners on every OS. cmd.exe mangles the quoting a
 * `node -e "…"` probe needs, so on Windows a real hole read as "not reproduced"
 * (ISS-054, first live plan-level review). Run through sh wherever it exists;
 * cmd.exe is the last resort only.
 */
export function runReproCommand(
  cwd: string,
  command: string,
): { exit_code: number; refused: boolean; stdout: string } {
  const sh = probeShell();
  const r = sh
    ? spawnSync(sh, ["-c", command], { encoding: "utf8", cwd, timeout: 60000 })
    : spawnSync("cmd.exe", ["/c", command], { encoding: "utf8", cwd, timeout: 60000 });
  const exit_code = r.status ?? 1;
  return { exit_code, refused: exit_code !== 0, stdout: (r.stdout || "") + (r.stderr || "") };
}

export function extractRepro(body: string): string {
  const i = body.search(/复现命令：/);
  if (i < 0) return "";
  const m = body.slice(i).match(/```(?:bash|sh|txt|pwsh)?\r?\n([\s\S]*?)```/);
  return (m?.[1] ?? "").trim();
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
    plan: "",
    round: 0,
    base: "",
    tree_hash: "",
    pack_hash: "",
    paths: [],
    lens,
    implementer_harness: impl,
    reviewer_harness: reviewer,
    blocking_iss: [],
    advisory: [],
    deferred: [],
    iss_fp: {},
    rounds_on: {},
    fuse_threshold: FUSE_THRESHOLD,
  };
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const next = args[i + 1];
  if (!next || next.startsWith("-")) return "";
  return next;
}

/** The latest worklog section of every feature, newest text last, capped for the pack. */
function worklogDigest(ctx: Ctx): string {
  const feats = join(ctx.records, "features");
  if (!existsSync(feats)) return "";
  const parts: string[] = [];
  for (const name of readdirSync(feats).sort()) {
    const wl = join(feats, name, "worklog.md");
    if (!existsSync(wl)) continue;
    const sections = readFileSync(wl, "utf8").split(/^## /m);
    if (sections.length < 2) continue;
    const last = (sections[sections.length - 1] ?? "").trim().replace(/\s+/g, " ");
    if (last) parts.push(`${name}: ${last.slice(0, 400)}`);
  }
  const text = parts.join("\n");
  return text.length > 3500 ? text.slice(text.length - 3500) : text;
}

/**
 * Diff since `base` for a plan-level pack: files deleted outright are listed by
 * name only (their bodies say nothing about the new behaviour), context is two
 * lines. Working-tree packs keep the plain ISS-052 two-command diff.
 */
export function baseDiff(ctx: Ctx, base: string): string {
  const body = git(ctx, ["diff", "--diff-filter=d", "-U2", base]).stdout;
  const deleted = git(ctx, ["diff", "--diff-filter=D", "--name-only", base]).stdout
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const tail = deleted.length > 0 ? `\n# deleted files (bodies omitted):\n${deleted.map((p) => `- ${p}`).join("\n")}\n` : "";
  return body + tail;
}

/** The five C-39 inputs: diff since base (or the working tree), the current overview, requirements, evidence, worklog digest. */
export function buildPack(ctx: Ctx, base = ""): { [k: string]: string } {
  const diff = base
    ? baseDiff(ctx, base)
    : PACK_DIFF_ARGS.map((args) => git(ctx, [...args]).stdout).join("\n");
  let plan = "";
  const cur = currentPlanFile(ctx);
  if (cur && existsSync(join(ctx.records, "plan", cur))) {
    plan = readFileSync(join(ctx.records, "plan", cur), "utf8").slice(0, 70000);
  }
  let reqs = "";
  const reqIdx = join(ctx.records, "requirements", "INDEX.md");
  if (existsSync(reqIdx)) {
    const current = (readFileSync(reqIdx, "utf8").match(/^- current:\s+(\S+)/m) ?? [])[1];
    if (current && existsSync(join(ctx.records, "requirements", current))) {
      reqs = readFileSync(join(ctx.records, "requirements", current), "utf8").slice(0, 70000);
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
    worklog_summary: worklogDigest(ctx),
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
      `review loop: ${st.status} plan=${st.plan || "-"} round=${st.round} lens=${lens} het_required=${het} blocking=${st.blocking_iss.join(",") || "-"} advisory=${(st.advisory ?? []).length}\n`,
    );
  }
  if (sub === "pack") {
    const base = flag(args, "base") || "";
    const impl = flag(args, "implementer") || process.env.KEEL_HARNESS || "unknown";
    const reviewer = flag(args, "reviewer") || "";
    const paths = collectChangedPaths(ctx, base);
    const lens = classifyLens(paths);
    const pack = buildPack(ctx, base);
    const wr = writeGeneratedPack(ctx, pack);
    if (wr.result.code !== 0) return wr.result;
    const plan = currentPlanFile(ctx);
    // A new plan starts a fresh loop; the history rows below the front matter stay.
    const prev = loopForCurrentPlan(ctx);
    const st: LoopState = {
      ...(prev ?? emptyLoop(lens, impl, reviewer)),
      status: "packed",
      plan,
      base,
      tree_hash: gitWriteTree(ctx),
      paths,
      lens,
      implementer_harness: impl,
      reviewer_harness: reviewer,
      pack_hash: wr.hash,
    };
    writeLoopState(ctx, st);
    appendDisposition(
      ctx,
      st,
      "pack",
      `plan=${plan || "-"} base=${base || "worktree"} lens=${lens} files=${paths.length} implementer=${impl} reviewer=${reviewer || "-"} pack=${wr.hash.slice(0, 12)}`,
    );
    return ok(
      `${wr.result.stdout}lens=${lens} het_required=${needsHeterogeneous(lens)} files=${paths.length}\n`,
    );
  }
  if (sub === "ingest") {
    const file = args[1] ?? "";
    if (!file || !existsSync(file)) return fail("usage: gate loop ingest <findings.json> [--reviewer <h>] [--worklog <rel>]\n");
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
    const worklogRel = flag(args, "worklog") || "";
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
    // A blocking finding the gate could not verify is not refuted: it holds the
    // loop in_review until a fresh review round drops it or supplies a probe that
    // runs (C-42). Only "no ISS and nothing deferred" is a pass.
    const status: LoopStatus = out.iss.length > 0 ? "repairing" : out.deferred.length > 0 ? "in_review" : "passed";
    const next: LoopState = {
      ...st,
      implementer_harness: impl,
      reviewer_harness: reviewer,
      blocking_iss: out.iss,
      advisory: [...new Set([...(st.advisory ?? []), ...out.advisory])],
      deferred: out.deferred,
      iss_fp: { ...st.iss_fp, ...out.fps },
      lens,
      tree_hash: gitWriteTree(ctx),
      status,
    };
    writeLoopState(ctx, next);
    appendFindings(
      ctx,
      `第 ${st.round + 1} 轮 · ${new Date().toISOString().slice(0, 10)} · pack=${st.pack_hash.slice(0, 12)} · reviewer=${reviewer} · lens=${lens}`,
      out.notes,
    );
    appendDisposition(
      ctx,
      next,
      "ingest",
      `reviewer=${reviewer} iss=${out.iss.join(",") || "-"} deferred=${out.deferred.length} advisory=${out.advisory.length} → ${next.status}`,
    );
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
    "usage: gate loop status|pack [--base <rev>]|ingest <findings.json>|clear|append-attack <line>\n",
  );
}

function issBody(ctx: Ctx, id: string): string {
  const hit = mdFiles(join(ctx.records, "issues"), "ISS-").find((f) => basename(f).startsWith(id));
  if (!hit) return "";
  return readFileSync(hit, "utf8");
}

/** Execute each blocking ISS repro. Does not trust caller-supplied refused flags (ISS-025). */
export function recordClear(ctx: Ctx, impl: string, reviewer: string): CmdResult {
  const st = readLoopState(ctx);
  if (!st || !st.pack_hash) return fail("no packed review state; gate loop pack then ingest\n");
  if (st.blocking_iss.length === 0 && (st.deferred ?? []).length > 0 && st.status !== "passed") {
    return fail(
      `nothing to clear: ${st.deferred.length} blocking finding(s) are unverified (待核实); a fresh review round must drop them or supply a probe that runs — re-pack, re-review, re-ingest (C-42)\n`,
    );
  }
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
  for (const run of runs) {
    appendDisposition(
      ctx,
      next,
      "clear",
      `${run.iss} \`${run.command || "(no repro command)"}\` exit=${run.exit_code} ${run.refused ? "refused" : "still succeeds"}`,
    );
  }
  appendDisposition(ctx, next, "verdict", `reviewer=${reviewer || st.reviewer_harness || "-"} still_open=${still.join(",") || "-"} → ${next.status}`);
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
    appendFileSync(dispositionPath(ctx), `\n${fuseReport(next)}`, "utf8");
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
