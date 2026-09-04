// F7 plan-level review loop (REQ-027 / REQ-028, CHG-011).
//
// One loop per confirmed plan, run once after the whole plan is implemented; a
// finished feature does not trigger a review. The reviewer is a fresh-context
// subagent — same harness is fine, there is no lens and no heterogeneity rule
// (DEC-184 / CHG-013). Products, both append-only:
//   keel/review/findings.md     what each round's reviewer found and where it went
//   keel/review/disposition.md  machine state (front matter) + one history row per event
// keel/review/pack.json is the hashed reviewer input (gitignored). No state.json,
// rounds.json or fuse-report.md any more: the fuse counters live in the disposition
// front matter and a fuse report is appended to its body.
//
// ISS ingest / clear follow DEC-191 (CHG-015): a blocking finding opens an ISS only
// when its evidence holds on this tree — `repro` is a test or check command that
// fails now (nonzero, with a test failure in its output) and passes once fixed, or
// `ac` names a criterion the trace shows has no black-box test. clear reruns every
// check and needs exit 0 (or a now-covered criterion); every run is appended to the
// disposition and to evidence. No hand-made probes, no fuzzing (REQ-028 v7).
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
import { buildTrace } from "./trace.ts";

export const FUSE_THRESHOLD = 3;

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
  implementer_harness: string;
  reviewer_harness: string;
  blocking_iss: string[];
  repro_runs: ReproRun[];
  round: number;
};

export type LoopStatus = "none" | "packed" | "in_review" | "repairing" | "passed" | "fused";

const LOOP_STATUSES: readonly LoopStatus[] = ["none", "packed", "in_review", "repairing", "passed", "fused"];

/** ISS-056: the front matter is data, not an attestation — an unknown status is "none", never a pass. */
export function parseLoopStatus(raw: string | undefined): LoopStatus {
  const v = (raw ?? "").trim().toLowerCase();
  return (LOOP_STATUSES as readonly string[]).includes(v) ? (v as LoopStatus) : "none";
}

export type LoopState = {
  status: LoopStatus;
  /** Overview file (plan/INDEX current) the loop reviews; "" = unknown/any. */
  plan: string;
  round: number;
  /** Git rev the pack diff starts from; "" = working tree against HEAD. */
  base: string;
  tree_hash: string;
  pack_hash: string;
  implementer_harness: string;
  reviewer_harness: string;
  blocking_iss: string[];
  advisory: string[];
  /** Blocking findings downgraded to 待核实 (no evidence, no impact, a check that passes or fails without a test failure, a criterion already covered — DEC-191). */
  deferred: string[];
  /** Blocking findings whose probe could not execute at all (ISS-054): they hold the loop in_review. */
  probe_errors: string[];
  /** CHG-016 / ISS-055: every active feature had its summary when this state was written. Records no longer move the tree (DEC-192), so completion is tracked here. */
  plan_complete?: boolean;
  iss_fp: { [iss: string]: string };
  rounds_on: { [fp: string]: number };
  fuse_threshold: number;
};

export type Finding = {
  title: string;
  blocking: boolean;
  /** DEC-191: a test or check command that fails on this tree and passes once fixed. */
  repro: string;
  impact?: string;
  /** DEC-191: the acceptance criterion (REQ-nnn/AC-i) the finding fails; alone it means "no black-box test for it". */
  ac?: string;
  /** DEC-191: unimplemented | test-missing | test-failing | unmaintainable (informative). */
  kind?: string;
  pending_defense?: string;
  body?: string;
  fingerprint?: string;
  /** DEC-189: the ISS this finding recurs from; the fuse counts the whole chain. */
  recurrence_of?: string;
};

/**
 * DEC-189 / REQ-027 AC-12: the reviewer's output is validated as a whole for its
 * *shape* — a JSON array of objects with a `title` and a boolean `blocking`, string
 * fields where present — and either ingested verbatim or rejected with every gap
 * named. Missing repro / impact on a blocking finding is not a shape error: DEC-182
 * downgrades it to 待核实 (REQ-027 AC-4). The implementer never edits a reviewer's
 * findings into shape — a rejected file goes back to a fresh reviewer.
 */
export function validateFindings(raw: unknown): { ok: true; findings: Finding[] } | { ok: false; errors: string[] } {
  if (!Array.isArray(raw)) return { ok: false, errors: ["findings.json must be a JSON array of Finding objects"] };
  const errors: string[] = [];
  const out: Finding[] = [];
  raw.forEach((item, i) => {
    const at = `finding[${i}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${at}: not an object`);
      return;
    }
    const f = item as { [k: string]: unknown };
    const title = typeof f.title === "string" ? f.title.trim() : "";
    if (!title) errors.push(`${at}: title missing`);
    if (typeof f.blocking !== "boolean") {
      errors.push(`${at}${title ? ` (${title.slice(0, 40)})` : ""}: blocking must be true or false (a severity label is not a verdict)`);
    }
    for (const k of ["repro", "impact", "fingerprint", "pending_defense", "body", "recurrence_of", "ac", "kind"]) {
      if (f[k] !== undefined && typeof f[k] !== "string") errors.push(`${at}: ${k} must be a string`);
    }
    const recurrence = typeof f.recurrence_of === "string" ? f.recurrence_of.trim() : "";
    if (recurrence && !/^ISS-\d+$/.test(recurrence)) errors.push(`${at}: recurrence_of must be an ISS id`);
    const ac = typeof f.ac === "string" ? f.ac.trim() : "";
    if (ac && !/^REQ-\d+\/AC-\d+$/.test(ac)) errors.push(`${at}: ac must look like REQ-nnn/AC-i`);
    const kind = typeof f.kind === "string" ? f.kind.trim() : "";
    const fingerprint = typeof f.fingerprint === "string" ? f.fingerprint.trim() : "";
    out.push({
      title,
      blocking: f.blocking === true,
      repro: typeof f.repro === "string" ? f.repro : "",
      impact: typeof f.impact === "string" ? f.impact : "",
      ...(fingerprint ? { fingerprint } : {}),
      ...(ac ? { ac } : {}),
      ...(kind ? { kind } : {}),
      ...(typeof f.pending_defense === "string" ? { pending_defense: f.pending_defense } : {}),
      ...(typeof f.body === "string" ? { body: f.body } : {}),
      ...(recurrence ? { recurrence_of: recurrence } : {}),
    });
  });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, findings: out };
}

const PACK_KEYS = ["diff", "plan", "reqs", "evidence", "worklog_summary"] as const;

const PACK_MAX: { [k: string]: number } = {
  diff: 400000,
  plan: 80000,
  reqs: 80000,
  evidence: 120000,
  worklog_summary: 4000,
};

const LOOP_ARTIFACT_RE = /^keel\/review\/(pack\.json|disposition\.md|findings\.md)$|^keel\/review\/raw\/|^keel\/evidence\//;

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

export function packBodyHash(pack: { [k: string]: string }): { body: string; hash: string } {
  const body = JSON.stringify(pack, null, 2) + "\n";
  return { body, hash: sha256Normalized(body) };
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

/** CHG-016: the feature whose newest plan claims `req` (F6 for REQ-060), or "". */
export function ownerFeatureOf(ctx: Ctx, req: string): string {
  const feats = join(ctx.records, "features");
  if (!req || !existsSync(feats)) return "";
  for (const name of readdirSync(feats).sort()) {
    const planDir = join(feats, name, "plan");
    if (!existsSync(planDir)) continue;
    const files = readdirSync(planDir).filter((p) => p.endsWith(".md")).sort();
    const latest = files[files.length - 1];
    if (!latest) continue;
    const text = readFileSync(join(planDir, latest), "utf8");
    const reqLine = /^req:\s*(.+)$/m.exec(text)?.[1] ?? "";
    if (!reqLine.includes(req)) continue;
    const fid = /^feature:\s*(F\d+)/m.exec(text)?.[1];
    if (fid) return fid;
    const m = name.match(/^f0*(\d+)-/);
    if (m) return `F${m[1]}`;
  }
  return "";
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
    `implementer_harness: ${fmValue(state.implementer_harness)}`,
    `reviewer_harness: ${fmValue(state.reviewer_harness)}`,
    `fuse_threshold: ${state.fuse_threshold || FUSE_THRESHOLD}`,
    `blocking_iss: ${JSON.stringify(state.blocking_iss ?? [])}`,
    `advisory: ${JSON.stringify(state.advisory ?? [])}`,
    `deferred: ${JSON.stringify(state.deferred ?? [])}`,
    `plan_complete: ${state.plan_complete === true}`,
    `probe_errors: ${JSON.stringify(state.probe_errors ?? [])}`,
    `iss_fp: ${JSON.stringify(state.iss_fp ?? {})}`,
    `rounds_on: ${JSON.stringify(state.rounds_on ?? {})}`,
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
      status: parseLoopStatus(attrs.status),
      plan: attrs.plan ?? "",
      round: Number(attrs.round ?? 0) || 0,
      base: attrs.base ?? "",
      tree_hash: attrs.tree_hash ?? "",
      pack_hash: attrs.pack_hash ?? "",
      implementer_harness: attrs.implementer_harness ?? "",
      reviewer_harness: attrs.reviewer_harness ?? "",
      fuse_threshold: Number(attrs.fuse_threshold ?? FUSE_THRESHOLD) || FUSE_THRESHOLD,
      blocking_iss: j<string[]>("blocking_iss", []),
      advisory: j<string[]>("advisory", []),
      deferred: j<string[]>("deferred", []),
      probe_errors: j<string[]>("probe_errors", []),
      ...(attrs.plan_complete !== undefined ? { plan_complete: attrs.plan_complete === "true" } : {}),
      iss_fp: j<{ [iss: string]: string }>("iss_fp", {}),
      rounds_on: j<{ [fp: string]: number }>("rounds_on", {}),
    };
  } catch {
    return null;
  }
}

/** Rewrites the front matter; the history body below it is never rewritten. */
export function writeLoopState(ctx: Ctx, state: LoopState): void {
  // CHG-016 / ISS-055: record whether the plan was complete at this write (DEC-192 keeps summaries out of the tree).
  state = { ...state, plan_complete: planComplete(ctx) };
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

/** One append-only history row. Every gate loop step records itself here; G-done reads these rows back (ISS-056). */
export function recordLoopEvent(ctx: Ctx, state: LoopState, event: string, detail: string): void {
  const p = dispositionPath(ctx);
  if (!existsSync(p)) writeLoopState(ctx, state);
  const tree = (state.tree_hash ?? "").slice(0, 12) || "-";
  const cell = detail.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
  appendFileSync(p, `| ${state.round} | ${new Date().toISOString()} | ${event} | ${tree} | ${cell} |\n`, "utf8");
}

const appendDisposition = recordLoopEvent;

type HistoryRow = { round: number; event: string; tree: string; detail: string };

function dispositionHistory(ctx: Ctx): HistoryRow[] {
  const p = dispositionPath(ctx);
  if (!existsSync(p)) return [];
  const rows: HistoryRow[] = [];
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*[^|]*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*(.*?)\s*\|\s*$/);
    if (m) rows.push({ round: Number(m[1]), event: m[2] ?? "", tree: m[3] ?? "", detail: m[4] ?? "" });
  }
  return rows;
}

/**
 * ISS-056: a `passed` front matter counts only when the append-only history shows
 * the loop actually ran for that pack — a `pack` row naming the pack hash and a later
 * `ingest` / `verdict` row that ended in `→ passed`. Hand-editing the front matter
 * alone leaves no such rows.
 */
export function dispositionAttested(ctx: Ctx, state: LoopState): string[] {
  if (state.status !== "passed") return [];
  const rows = dispositionHistory(ctx);
  const pack12 = state.pack_hash.slice(0, 12);
  const packAt = pack12 ? rows.findIndex((r) => r.event === "pack" && r.detail.includes(`pack=${pack12}`)) : -1;
  if (packAt < 0) return [`disposition says passed but the history has no pack row for ${pack12 || "(no pack hash)"} — run gate loop, do not edit the front matter (ISS-056)`];
  const passedRow = rows.slice(packAt + 1).find(
    (r) => (r.event === "verdict" || r.event === "ingest") && /→\s*passed\s*$/.test(r.detail) && r.round === state.round,
  );
  if (!passedRow) return [`disposition says passed at round ${state.round} but the history has no ingest/verdict row ending in → passed for that pack (ISS-056)`];
  return [];
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
): {
  iss: string[];
  deferred: string[];
  probe_errors: string[];
  advisory: string[];
  fps: { [iss: string]: string };
  notes: string[];
} {
  const iss: string[] = [];
  const deferred: string[] = [];
  const probe_errors: string[] = [];
  const advisory: string[] = [];
  const fps: { [iss: string]: string } = {};
  const notes: string[] = [];
  const note = (line: string): void => {
    notes.push(line);
    if (worklogRel) appendWorklog(ctx, worklogRel, line);
  };
  for (const f of findings) {
    const command = f.repro.trim();
    const ac = (f.ac ?? "").trim();
    if (f.blocking && !command && !ac) {
      deferred.push(f.title);
      note(`- 待核实（无凭据：既无会失败的测试 / 检查命令，也未指出缺测试的验收标准，未开 ISS）：${f.title}`);
    } else if (f.blocking && !(f.impact ?? "").trim()) {
      deferred.push(f.title);
      note(`- 待核实（无影响说明，未开 ISS）：${f.title}`);
    } else if (f.blocking) {
      // DEC-191: the evidence for a blocking finding is a failing test (or a criterion
      // with no black-box test), verified on the current, unfixed tree — never a
      // hand-made probe.
      const probeTree = gitWriteTree(ctx);
      const probeRecordedAt = new Date().toISOString();
      let probeExit = 1;
      let probeResult = "";
      let probeCheck = "";
      if (command) {
        const probe = runReproCommand(ctx.root, command);
        const output = probe.stdout.trim().replace(/\s+/g, " ").slice(-300) || "(empty)";
        if (!probe.ran) {
          // ISS-054: the command never executed (missing interpreter, shell/quoting failure).
          // That proves nothing — it holds the loop in_review until a command that runs exists.
          probe_errors.push(f.title);
          note(
            `- 待核实（检查命令无法执行，退出 ${probe.exit_code}，回路停在 in_review）：${f.title}; command=${command}; tree=${probeTree || "(none)"}; output=${output}`,
          );
          continue;
        }
        if (probe.exit_code === 0) {
          deferred.push(f.title);
          note(`- 待核实（检查命令在本树上通过，退出 0，缺口未被证明，未开 ISS）：${f.title}; command=${command}; tree=${probeTree || "(none)"}`);
          continue;
        }
        if (!probe.failed_test) {
          deferred.push(f.title);
          note(
            `- 待核实（命令退出 ${probe.exit_code} 但输出里没有测试失败——请给出会失败的测试，未开 ISS）：${f.title}; command=${command}; tree=${probeTree || "(none)"}; output=${output}`,
          );
          continue;
        }
        probeExit = probe.exit_code;
        probeResult = "failing-test";
        probeCheck = `command=${command}`;
      } else {
        const cov = acCoverage(ctx, ac);
        if (cov === "unknown") {
          deferred.push(f.title);
          note(`- 待核实（${ac} 不在当前需求基线里，未开 ISS）：${f.title}`);
          continue;
        }
        if (cov === "covered") {
          deferred.push(f.title);
          note(`- 待核实（trace 显示 ${ac} 已有黑盒测试；请改为指出会失败的测试，未开 ISS）：${f.title}`);
          continue;
        }
        probeResult = cov === "proxy" ? "test-missing (proxy only)" : "test-missing";
        probeCheck = `ac=${ac}`;
      }
      const fp = findingFingerprint(f);
      const existing = findIssByFingerprint(ctx, fp);
      if (existing) {
        iss.push(existing);
        fps[existing] = fp;
        note(`- blocking → ${existing}（同指纹已开）：${f.title}; ${probeCheck}`);
        continue;
      }
      // CHG-016: the fingerprint names the file (a Chinese title used to become z-<sha8>).
      const created = runNew(ctx, ["iss", f.title, "--slug", fp]);
      const m = (created.stdout || "").match(/created\s+(ISS-\d+[^\s]*)/);
      const fname = m?.[1];
      if (fname) {
        const dest = join(ctx.records, "issues", fname);
        if (existsSync(dest)) {
          let body = readFileSync(dest, "utf8");
          body = body.replace(/fingerprint:\s*""/, `fingerprint: "${fp}"`);
          body = body.replace(/source:\s*""/, "source: review-loop");
          if (ac) body = body.replace(/\nac:\s*""/, `\nac: "${ac}"`);
          // CHG-016: the criterion's owner feature is the ISS's feature (status counts open ISS per feature).
          const owner = ac ? ownerFeatureOf(ctx, ac.split("/")[0] ?? "") : "";
          if (owner) body = body.replace(/\nfeature:\s*""/, `\nfeature: "${owner}"`);
          if (f.recurrence_of) body = body.replace(/recurrence_of:\s*""/, `recurrence_of: "${f.recurrence_of}"`);
          // CHG-016: the finding's body is the 现象; the title alone said nothing new.
          body = fillIssueSection(body, "现象", ((f.body ?? "").trim() || f.title).replace(/\s+/g, " ").slice(0, 2000));
          body = fillIssueSection(body, "影响", (f.impact ?? "").replace(/\s+/g, " ").slice(0, 2000));
          body = fillIssueSection(
            body,
            "待诊断防线",
            (f.pending_defense ?? "待诊断；未知根因和修复保持空白。").replace(/\s+/g, " ").slice(0, 2000),
          );
          if (command) body = body.replace("复现命令：", `复现命令：\n\n\`\`\`\n${command}\n\`\`\``);
          else body = body.replace("复现命令：", `复现命令：（无；凭据是 ${ac} 没有黑盒测试，见 gate trace）`);
          body +=
            `\n\n## 打开态复现探针\n\n` +
            `- probe_exit_code: ${probeExit}\n` +
            `- probe_recorded_at: ${probeRecordedAt}\n` +
            `- probe_tree_hash: ${probeTree || "(none)"}\n` +
            `- probe_result: ${probeResult}\n` +
            `- probe_check: ${probeCheck}\n`;
          writeFileSync(dest, body, "utf8");
        }
        const idMatch = fname.match(/^(ISS-\d+)/);
        const id = idMatch?.[1] ?? fname;
        iss.push(id);
        fps[id] = fp;
        note(`- blocking → ${id}：${f.title}; ${probeCheck}`);
      }
    } else {
      advisory.push(f.title);
      const extra = f.repro.trim() ? ` repro=${f.repro.trim()}` : "";
      note(`- 待办（advisory）：${f.title}${extra}`);
    }
  }
  return { iss, deferred, probe_errors, advisory, fps, notes };
}

export function reviewClearGaps(rev: {
  status: string;
  blocking_iss?: string[];
  repro_runs?: ReproRun[];
}): string[] {
  const gaps: string[] = [];
  if (rev.status === "passed") {
    for (const id of rev.blocking_iss ?? []) {
      const run = (rev.repro_runs ?? []).find((r) => r.iss === id);
      if (!run) gaps.push(`no repro run for ${id}`);
      else if (!run.refused) gaps.push(`${id} check still fails; cannot clear (REQ-027)`);
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
  if (loop.status === "none") return ["disposition.md has an invalid status; run gate loop pack (ISS-056)"];
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
  const attested = dispositionAttested(ctx, loop);
  if (attested.length > 0) return attested;
  // ISS-055: a pass taken while the plan was still in progress must not cover the
  // work that finished it. Once every active feature has its summary, the review
  // has to have seen this tree.
  if (planComplete(ctx)) {
    // DEC-192: summaries live outside the evidence tree, so "finished after the pass"
    // is read from the flag the loop wrote, and code changes from the tree hash.
    if (loop.plan_complete === false) {
      return [
        `plan implemented after the review passed (the pass was taken while features were still in progress); re-pack for a new round (REQ-027/ISS-055)`,
      ];
    }
    const tree = gitWriteTree(ctx);
    if (tree && loop.tree_hash !== tree) {
      return [
        `plan implemented after the review passed (review tree ${loop.tree_hash.slice(0, 12)}, now ${tree.slice(0, 12)}); re-pack for a new round (REQ-027/ISS-055)`,
      ];
    }
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

/**
 * DEC-189: an ISS that recurs from an older one (`recurrence_of`) shares that
 * chain's fuse counter. zhaoxi's 007→016→024→028→031 chain ran eleven rounds
 * because every recurrence carried a fresh fingerprint and `rounds_on` never
 * passed 1. The root of the chain is the oldest ISS; its fingerprint (or id) keys
 * the counter for every descendant.
 */
export function rootFingerprint(ctx: Ctx, id: string, fallback = ""): string {
  const seen = new Set<string>();
  let cur = id;
  let fp = fallback || id;
  for (let depth = 0; depth < 20 && cur && !seen.has(cur); depth++) {
    seen.add(cur);
    const body = issBody(ctx, cur);
    if (!body) break;
    const { attrs } = parseFrontmatter(body);
    fp = (attrs.fingerprint ?? "").trim() || cur;
    const parent = (attrs.recurrence_of ?? "").trim().match(/^ISS-\d+/)?.[0] ?? "";
    if (!parent) break;
    cur = parent;
  }
  return fp;
}

export function bumpRounds(state: LoopState, stillOpen: string[], rootOf?: (id: string) => string): LoopState {
  const rounds_on = { ...state.rounds_on };
  // ISS-062: one clear is one round for a fingerprint, however many open ISS share it.
  const counted = new Set<string>();
  for (const id of stillOpen) {
    const fp = rootOf ? rootOf(id) : (state.iss_fp?.[id] ?? id);
    if (counted.has(fp)) continue;
    counted.add(fp);
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
 * Probes are POSIX one-liners on every OS. cmd.exe mangles the quoting a
 * `node -e "…"` probe needs, so on Windows a real hole read as "not reproduced"
 * (ISS-054, first live plan-level review). Run through sh wherever it exists;
 * cmd.exe is the last resort only.
 */
const PROBE_DID_NOT_RUN =
  /command not found|not recognized as an internal or external command|No such file or directory|SyntaxError|Unterminated string|cannot execute|is not a valid|MODULE_NOT_FOUND|Cannot find module/;

/** DEC-191: a check command counts only when its output shows a test failure, not just a nonzero exit. */
const TEST_FAILURE_RE =
  /(^|\s)not ok\b|^#\s*fail\s+[1-9]|ℹ\s*fail\s+[1-9]|\b[1-9]\d*\s+(failed|failing|failures?)\b|(^|\s)(FAIL|FAILED)\b|\bFailed!|\bAssertionError\b|assert(ion)?\s*failed|✖/m;

export function looksLikeTestFailure(output: string): boolean {
  return TEST_FAILURE_RE.test(output);
}

/** DEC-191: does the current trace show a black-box test for `REQ-nnn/AC-i`? */
export function acCoverage(ctx: Ctx, ac: string): "covered" | "proxy" | "missing" | "unknown" {
  const m = ac.trim().match(/^(REQ-\d+)\/AC-(\d+)$/);
  if (!m) return "unknown";
  const row = buildTrace(ctx).rows.find((r) => r.req === m[1]);
  const i = Number(m[2]);
  if (!row || i < 1 || i > row.criteria) return "unknown";
  if (row.uncoveredAc.includes(i)) return "missing";
  if (row.proxyAc.some((p) => p.ac === i)) return "proxy";
  return "covered";
}

export function runReproCommand(
  cwd: string,
  command: string,
): { exit_code: number; refused: boolean; stdout: string; ran: boolean; failed_test: boolean } {
  const sh = probeShell();
  // A check is usually `node --test …`; run it outside any enclosing test runner's
  // context (NODE_TEST_* would make the child report as a subtest and exit 0).
  const env: { [k: string]: string | undefined } = {};
  for (const [k, v] of Object.entries(process.env)) if (!k.startsWith("NODE_TEST")) env[k] = v;
  const r = sh
    ? spawnSync(sh, ["-c", command], { encoding: "utf8", cwd, timeout: 60000, env })
    : spawnSync("cmd.exe", ["/c", command], { encoding: "utf8", cwd, timeout: 60000, env });
  const exit_code = r.status ?? 1;
  const stdout = (r.stdout || "") + (r.stderr || "");
  // ISS-054: exit 126/127, a spawn error, or an interpreter failure means the probe
  // never tested anything — that is not a refusal.
  const spawnFailed = Boolean((r as { error?: unknown }).error);
  const ran = !spawnFailed && exit_code !== 126 && exit_code !== 127 && !(exit_code !== 0 && PROBE_DID_NOT_RUN.test(stdout));
  // DEC-191: `refused` = the gap is refused (closed) — the check passes.
  return { exit_code, refused: exit_code === 0, stdout, ran, failed_test: looksLikeTestFailure(stdout) };
}

export function extractRepro(body: string): string {
  const i = body.search(/复现命令：/);
  if (i < 0) return "";
  const m = body.slice(i).match(/```(?:bash|sh|txt|pwsh)?\r?\n([\s\S]*?)```/);
  return (m?.[1] ?? "").trim();
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

export function emptyLoop(impl: string, reviewer: string): LoopState {
  return {
    status: "in_review",
    plan: "",
    round: 0,
    base: "",
    tree_hash: "",
    pack_hash: "",
    implementer_harness: impl,
    reviewer_harness: reviewer,
    blocking_iss: [],
    advisory: [],
    deferred: [],
    probe_errors: [],
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
  // ISS-055: every feature gets an equal share of the cap; the digest never drops early features.
  if (parts.length === 0) return "";
  const share = Math.max(80, Math.floor((3500 - parts.length * 2) / parts.length));
  return parts.map((p) => p.slice(0, share)).join("\n");
}

/**
 * ISS-055: the pack base is what makes a plan-level review a review of the plan.
 * Explicit `--base` wins; a re-pack of the same plan inherits its base; otherwise
 * the tree of the last passed review; with none of those the caller must say.
 */
export function defaultBase(ctx: Ctx): string {
  const st = readLoopState(ctx);
  if (!st) return "";
  const cur = currentPlanFile(ctx);
  if (st.base && (!st.plan || !cur || st.plan === cur)) return st.base;
  if (st.status === "passed" && st.tree_hash) return st.tree_hash;
  return "";
}

/**
 * Diff since `base` for a plan-level pack: files deleted outright are listed by
 * name only (their bodies say nothing about the new behaviour), context is two
 * lines. `git diff <base>` already covers committed, staged and unstaged work
 * without overlap, so the ISS-052 two-command working-tree diff is gone (ISS-055).
 */
/** DEC-189: lockfiles are summarized, never diffed — one of them alone breached the 400 KB pack cap in a pilot. */
export const LOCKFILES = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "uv.lock", "poetry.lock", "Cargo.lock", "go.sum", "Gemfile.lock", "composer.lock"];

function isLockfile(path: string): boolean {
  return LOCKFILES.includes(basename(path.replace(/\\/g, "/")));
}

/** CHG-016: keel-managed files are not the product under review; the pack lists them by name only. */
export const FRAMEWORK_PATHS = ["tools/gate", "tools/cli", ".agents/skills", ".claude/skills", ".githooks", "keel/templates", "keel/review/checklist.md"];

function frameworkPath(p: string): boolean {
  const s = p.replace(/\\/g, "/");
  return FRAMEWORK_PATHS.some((f) => s === f || s.startsWith(`${f}/`));
}

/** keel's own repository reviews its gate as product code (config `review.self_hosted`). */
function selfHosted(ctx: Ctx): boolean {
  const review = (ctx.config.review ?? {}) as { self_hosted?: unknown };
  return review.self_hosted === true;
}

function packExcludes(ctx: Ctx): string[] {
  return [
    "--",
    ".",
    ":(exclude)keel/review/disposition.md",
    ":(exclude)keel/review/findings.md",
    ":(exclude)keel/review/raw",
    ":(exclude)keel/evidence",
    ...LOCKFILES.map((name) => `:(exclude,glob)**/${name}`),
    ...LOCKFILES.map((name) => `:(exclude)${name}`),
    ...(selfHosted(ctx) ? [] : FRAMEWORK_PATHS.map((p) => `:(exclude)${p}`)),
  ];
}

/**
 * CHG-016 (zhaoxi DEC-028): with config `review.lockfile_summary: "deltas"` a pnpm
 * lockfile is summarised as the per-importer dependency changes since the base
 * (added / removed / version moved) plus the package keys that came and went, so a
 * same-version metadata swap is visible without shipping 160 KB of YAML.
 */
function pnpmImporterDeps(text: string): Map<string, string> {
  const out = new Map<string, string>();
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let inImporters = false;
  let importer = "";
  let group = "";
  let dep = "";
  let specifier = "";
  const flush = (version: string): void => {
    if (!importer || !group || !dep) return;
    const value = [specifier && `specifier=${specifier}`, version && `version=${version}`].filter(Boolean).join("; ");
    out.set(`${importer} | ${group} | ${dep}`, value || "(unspecified)");
  };
  for (const line of lines) {
    if (/^\S/.test(line)) {
      inImporters = line.startsWith("importers:");
      continue;
    }
    if (!inImporters) continue;
    let m = line.match(/^ {2}(\S[^:]*):\s*$/);
    if (m) {
      importer = m[1] ?? "";
      continue;
    }
    m = line.match(/^ {4}([A-Za-z][A-Za-z0-9]*):\s*$/);
    if (m) {
      group = m[1] ?? "";
      continue;
    }
    m = line.match(/^ {6}(\S[^:]*):\s*$/);
    if (m) {
      dep = m[1] ?? "";
      specifier = "";
      continue;
    }
    m = line.match(/^ {8}specifier:\s*(\S.*)$/);
    if (m) {
      specifier = m[1] ?? "";
      continue;
    }
    m = line.match(/^ {8}version:\s*(\S.*)$/);
    if (m) flush(m[1] ?? "");
  }
  return out;
}

function pnpmPackageKeys(text: string): Set<string> {
  const out = new Set<string>();
  let inPackages = false;
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (/^\S/.test(line)) {
      inPackages = line.startsWith("packages:") || line.startsWith("snapshots:");
      continue;
    }
    if (!inPackages) continue;
    const m = line.match(/^ {2}(\S[^:]*):\s*$/);
    if (m) out.add(m[1] ?? "");
  }
  return out;
}

export function lockfileDeltas(before: string, after: string, cap = 120): string[] {
  const rows: string[] = [];
  const a = pnpmImporterDeps(before);
  const b = pnpmImporterDeps(after);
  for (const [k, v] of b) {
    if (!a.has(k)) rows.push(`  + ${k}: ${v}`);
    else if (a.get(k) !== v) rows.push(`  ~ ${k}: ${a.get(k)} -> ${v}`);
  }
  for (const [k, v] of a) if (!b.has(k)) rows.push(`  - ${k}: ${v}`);
  const pa = pnpmPackageKeys(before);
  const pb = pnpmPackageKeys(after);
  for (const k of pb) if (!pa.has(k)) rows.push(`  + packages | ${k}`);
  for (const k of pa) if (!pb.has(k)) rows.push(`  - packages | ${k}`);
  if (rows.length > cap) return [...rows.slice(0, cap), `  … ${rows.length - cap} more`];
  return rows;
}

function lockfileSummary(ctx: Ctx, paths: string[], base: string): string {
  const review = (ctx.config.review ?? {}) as { lockfile_summary?: unknown };
  // CHG-016: deltas by default (zhaoxi DEC-028); `review.lockfile_summary: "hash"` opts out.
  const deltas = review.lockfile_summary !== "hash";
  const rows: string[] = [];
  for (const rel of paths) {
    const abs = join(ctx.root, rel);
    if (!existsSync(abs)) {
      rows.push(`- ${rel} (deleted)`);
      continue;
    }
    const text = readFileSync(abs, "utf8");
    rows.push(`- ${rel} sha256=${sha256Normalized(text).slice(0, 16)} lines=${text.split(/\r?\n/).length}`);
    if (deltas && basename(rel) === "pnpm-lock.yaml" && base) {
      // zhaoxi DEC-028: the full hash authenticates the file the reviewer did not see.
      rows.push(`  target_sha256: ${sha256Normalized(text)}`);
      const before = git(ctx, ["show", `${base}:${rel.replace(/\\/g, "/")}`]).stdout;
      rows.push(...lockfileDeltas(before, text));
    }
  }
  return rows.length > 0 ? `\n# lockfiles (bodies omitted, DEC-189):\n${rows.join("\n")}\n` : "";
}

export function baseDiff(ctx: Ctx, base: string): string {
  const body = git(ctx, ["diff", "--diff-filter=d", "-U2", base, ...packExcludes(ctx)]).stdout;
  // Untracked files are part of the working tree under review (a new test file not
  // yet `git add`ed must reach the reviewer): show each as a new file.
  const untracked = git(ctx, ["ls-files", "--others", "--exclude-standard"]).stdout
    .split(/\n/)
    .map((l) => l.trim())
    .filter((p) => p && !LOOP_ARTIFACT_RE.test(p) && (selfHosted(ctx) || !frameworkPath(p)));
  const added = untracked
    .filter((p) => !isLockfile(p))
    .map((p) => git(ctx, ["diff", "--no-index", "-U2", "--", "/dev/null", p]).stdout)
    .filter(Boolean)
    .join("\n");
  const deleted = git(ctx, ["diff", "--diff-filter=D", "--name-only", base]).stdout
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const tail = deleted.length > 0 ? `\n# deleted files (bodies omitted):\n${deleted.map((p) => `- ${p}`).join("\n")}\n` : "";
  const changedLocks = git(ctx, ["diff", "--name-only", base]).stdout
    .split(/\n/)
    .map((l) => l.trim())
    .filter((p) => p && isLockfile(p));
  const locks = [...new Set([...changedLocks, ...untracked.filter(isLockfile)])];
  // CHG-016: framework files changed alongside the product are listed, not diffed —
  // the reviewer's three questions are about the product (keel's own repo excepted).
  let framework = "";
  if (!selfHosted(ctx)) {
    const changedFw = git(ctx, ["diff", "--name-only", base, "--", ...FRAMEWORK_PATHS]).stdout
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const untrackedFw = git(ctx, ["ls-files", "--others", "--exclude-standard"]).stdout
      .split(/\n/)
      .map((l) => l.trim())
      .filter((p) => p && frameworkPath(p));
    const fw = [...new Set([...changedFw, ...untrackedFw])];
    if (fw.length > 0) {
      framework = `\n# framework files changed (keel-managed via keel update, not product code; bodies omitted, CHG-016):\n${fw.map((p) => `- ${p}`).join("\n")}\n`;
    }
  }
  return [body, added].filter(Boolean).join("\n") + tail + lockfileSummary(ctx, locks, base) + framework;
}

/** The five C-39 inputs: diff since base, the current overview, requirements, evidence, worklog digest. */
export function buildPack(ctx: Ctx, base: string): { [k: string]: string } {
  const diff = baseDiff(ctx, base);
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

export const PACK_BUDGET = 120000;

/** DEC-189: what one reviewer context can actually read; `review.pack_budget` in config overrides. */
export function packBudget(ctx: Ctx): number {
  const review = (ctx.config.review ?? {}) as { pack_budget?: unknown };
  const n = Number(review.pack_budget);
  return Number.isFinite(n) && n > 0 ? n : PACK_BUDGET;
}

function largestDiffFile(diff: string): { path: string; chars: number } | null {
  const parts = diff.split(/^diff --git a\/(.+?) b\/.*$/m);
  let best: { path: string; chars: number } | null = null;
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const path = parts[i] ?? "";
    const chars = (parts[i + 1] ?? "").length;
    if (!best || chars > best.chars) best = { path, chars };
  }
  return best;
}

/** Non-fatal: a field over budget names itself and, for the diff, the file that dominates it. */
export function packBudgetWarnings(ctx: Ctx, pack: { [k: string]: string }): string[] {
  const budget = packBudget(ctx);
  const out: string[] = [];
  for (const k of PACK_KEYS) {
    const len = (pack[k] ?? "").length;
    if (len <= budget) continue;
    let hint = "split the plan into smaller review scopes or narrow --base";
    if (k === "diff") {
      const big = largestDiffFile(pack[k] ?? "");
      if (big) hint = `largest file ${big.path} (${big.chars} chars); ${hint}`;
    }
    out.push(`warn: pack field '${k}' is ${len} chars > reviewer budget ${budget} (DEC-189) — ${hint}`);
  }
  return out;
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
    return ok(
      `review loop: ${st.status} plan=${st.plan || "-"} round=${st.round} blocking=${st.blocking_iss.join(",") || "-"} advisory=${(st.advisory ?? []).length}\n`,
    );
  }
  if (sub === "pack") {
    const base = flag(args, "base") || defaultBase(ctx);
    if (!base) {
      return fail(
        "plan-level pack needs --base <rev>: the commit or tree the plan started from (no earlier review of this plan to inherit it from) (ISS-055)\n",
      );
    }
    if (git(ctx, ["rev-parse", "--verify", "--quiet", `${base}^{tree}`]).status !== 0) {
      return fail(`--base ${base} is not a commit or tree in this repository (ISS-055)\n`);
    }
    const impl = flag(args, "implementer") || process.env.KEEL_HARNESS || "unknown";
    const reviewer = flag(args, "reviewer") || "";
    const paths = collectChangedPaths(ctx, base);
    if (paths.length === 0) {
      return fail(`nothing to review: no path changed since ${base} (ISS-055)\n`);
    }
    const pack = buildPack(ctx, base);
    const wr = writeGeneratedPack(ctx, pack);
    if (wr.result.code !== 0) return wr.result;
    const plan = currentPlanFile(ctx);
    const complete = planComplete(ctx);
    // A new plan starts a fresh loop; the history rows below the front matter stay.
    const prev = loopForCurrentPlan(ctx);
    const st: LoopState = {
      ...(prev ?? emptyLoop(impl, reviewer)),
      status: "packed",
      plan,
      base,
      tree_hash: gitWriteTree(ctx),
      implementer_harness: impl,
      reviewer_harness: reviewer,
      pack_hash: wr.hash,
    };
    writeLoopState(ctx, st);
    appendDisposition(
      ctx,
      st,
      "pack",
      `plan=${plan || "-"} base=${base} plan_complete=${complete} files=${paths.length} implementer=${impl} reviewer=${reviewer || "-"} pack=${wr.hash.slice(0, 12)}`,
    );
    const budgetWarnings = packBudgetWarnings(ctx, pack);
    return ok(
      `${wr.result.stdout}files=${paths.length}\n${budgetWarnings.map((w) => `${w}\n`).join("")}`,
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
    const reviewer = flag(args, "reviewer") || st.reviewer_harness || process.env.KEEL_HARNESS || "";
    if (!reviewer || reviewer === "unknown") {
      return fail("ingest requires --reviewer <harness>; empty findings are not a review (ISS-023)\n");
    }
    // DEC-189: a file the loop cannot accept is archived verbatim (keel/review/raw/), so
    // the rejection can be traced back to what the reviewer wrote; the two review
    // products (REQ-027 AC-10) stay findings.md and disposition.md.
    const rawText = readFileSync(file, "utf8");
    const rawDir = join(reviewDir(ctx), "raw");
    const rawStem = `round-${st.round + 1}-${reviewer.replace(/[^A-Za-z0-9._-]+/g, "_")}`;
    // A second rejection in the same round keeps the first archive (no overwrite).
    let rawName = `${rawStem}.json`;
    for (let n = 2; existsSync(join(rawDir, rawName)); n++) rawName = `${rawStem}-${n}.json`;
    const archive = (): void => {
      mkdirSync(rawDir, { recursive: true });
      writeFileSync(join(rawDir, rawName), rawText, "utf8");
    };
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText) as unknown;
    } catch {
      archive();
      return fail(`findings.json invalid JSON; archived as keel/review/raw/${rawName} — ask the reviewer for a valid Finding[] (DEC-189)\n`);
    }
    const checked = validateFindings(parsed);
    if (!checked.ok) {
      archive();
      return fail(
        `findings rejected (${checked.errors.length} gap(s)); archived as keel/review/raw/${rawName} — a fresh reviewer must re-issue, the implementer does not rewrite it (DEC-189 / C-41):\n` +
          checked.errors.map((e) => `- ${e}`).join("\n") +
          "\n",
      );
    }
    const findings: Finding[] = checked.findings;
    const impl = flag(args, "implementer") || st.implementer_harness || "unknown";
    const out = fileFindings(ctx, findings, worklogRel);
    // DEC-191: a blocking finding without evidence, whose check passes, fails without
    // a test failure, or names a criterion that is already covered, is downgraded to
    // 待核实. A command that could not execute proves nothing (ISS-054): it holds the
    // loop in_review until a fresh round supplies one that runs or drops the finding (C-42).
    const status: LoopStatus = out.iss.length > 0 ? "repairing" : out.probe_errors.length > 0 ? "in_review" : "passed";
    const next: LoopState = {
      ...st,
      implementer_harness: impl,
      reviewer_harness: reviewer,
      blocking_iss: out.iss,
      advisory: [...new Set([...(st.advisory ?? []), ...out.advisory])],
      deferred: out.deferred,
      probe_errors: out.probe_errors,
      iss_fp: { ...st.iss_fp, ...out.fps },
      tree_hash: gitWriteTree(ctx),
      status,
    };
    writeLoopState(ctx, next);
    appendFindings(
      ctx,
      `第 ${st.round + 1} 轮 · ${new Date().toISOString().slice(0, 10)} · pack=${st.pack_hash.slice(0, 12)} · reviewer=${reviewer}`,
      out.notes,
    );
    appendDisposition(
      ctx,
      next,
      "ingest",
      `reviewer=${reviewer} iss=${out.iss.join(",") || "-"} deferred=${out.deferred.length} probe_errors=${out.probe_errors.length} advisory=${out.advisory.length} → ${next.status}`,
    );
    return ok(
      `filed iss=${out.iss.join(",") || "-"} deferred=${out.deferred.length} probe_errors=${out.probe_errors.length} advisory=${out.advisory.length} status=${next.status}\n`,
    );
  }
  if (sub === "clear") {
    const impl = flag(args, "implementer") || process.env.KEEL_HARNESS || "unknown";
    const reviewer = flag(args, "reviewer") || process.env.KEEL_REVIEWER || "";
    return recordClear(ctx, impl, reviewer);
  }
  return fail(
    "usage: gate loop status|pack [--base <rev>]|ingest <findings.json>|clear\n",
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
  if (st.blocking_iss.length === 0 && (st.probe_errors ?? []).length > 0 && st.status !== "passed") {
    return fail(
      `nothing to clear: ${st.probe_errors.length} blocking finding(s) have a probe that could not execute (ISS-054); a fresh review round must supply a probe that runs or drop them — re-pack, re-review, re-ingest (C-42)\n`,
    );
  }
  const runRound = st.round + 1;
  const recordedAt = new Date().toISOString();
  const runTree = gitWriteTree(ctx);
  const runs: ReproRun[] = [];
  for (const id of st.blocking_iss) {
    const body = issBody(ctx, id);
    const cmd = extractRepro(body);
    if (cmd) {
      const r = runReproCommand(ctx.root, cmd);
      runs.push({
        iss: id,
        command: cmd,
        exit_code: r.exit_code,
        refused: r.exit_code === 0,
        round: runRound,
        recorded_at: recordedAt,
        tree_hash: runTree,
      });
      continue;
    }
    // DEC-191: an ISS whose evidence was "this criterion has no black-box test" clears
    // when the trace shows one now.
    const ac = (parseFrontmatter(body).attrs.ac ?? "").trim();
    if (ac) {
      const covered = acCoverage(ctx, ac) === "covered";
      runs.push({
        iss: id,
        command: `trace ${ac}`,
        exit_code: covered ? 0 : 1,
        refused: covered,
        round: runRound,
        recorded_at: recordedAt,
        tree_hash: runTree,
      });
      continue;
    }
    runs.push({
      iss: id,
      command: "",
      exit_code: 1,
      refused: false,
      round: runRound,
      recorded_at: recordedAt,
      tree_hash: runTree,
    });
  }
  const still = st.blocking_iss.filter((id) => !runs.some((r) => r.iss === id && r.refused));
  const bumped = bumpRounds(
    {
      ...st,
      implementer_harness: impl,
      reviewer_harness: reviewer || st.reviewer_harness,
      tree_hash: gitWriteTree(ctx),
    },
    still,
    // DEC-189: recurrences count against the root of their chain.
    (id) => rootFingerprint(ctx, id, st.iss_fp?.[id] ?? id),
  );
  // Checks that never executed keep the loop open even when every ISS is cleared (ISS-054).
  const next: LoopState =
    bumped.status === "passed" && (st.probe_errors ?? []).length > 0 ? { ...bumped, status: "in_review" } : bumped;
  writeLoopState(ctx, next);
  for (const run of runs) {
    appendDisposition(
      ctx,
      next,
      "clear",
      `${run.iss} \`${run.command || "(no repro command)"}\` exit=${run.exit_code} ${run.refused ? "passed" : "still failing"}`,
    );
  }
  appendDisposition(ctx, next, "verdict", `reviewer=${reviewer || st.reviewer_harness || "-"} still_open=${still.join(",") || "-"} → ${next.status}`);
  const review: ReviewClear = {
    status: next.status === "passed" ? "passed" : next.status === "fused" ? "fused" : "pending",
    implementer_harness: impl,
    reviewer_harness: reviewer || st.reviewer_harness,
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
  if (next.status === "in_review") {
    return fail(
      `review loop in_review: every ISS is refused but ${st.probe_errors.length} blocking finding(s) never had an executable probe (ISS-054); a fresh round must resolve them\n`,
    );
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
