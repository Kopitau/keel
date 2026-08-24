import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import type { Ctx } from "./ctx.ts";
import { runNew } from "./new.ts";
import { fail, ok, type CmdResult } from "./result.ts";
import { readEvidence, writeEvidence, type Evidence } from "./evidence.ts";
import { posixRel } from "./walk.ts";

export const FUSE_THRESHOLD = 3;

export type Lens = "attack" | "robustness" | "requirements";

export type ReproRun = {
  iss: string;
  command: string;
  exit_code: number;
  refused: boolean;
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
  status: "none" | "in_review" | "repairing" | "passed" | "fused";
  round: number;
  lens: Lens;
  implementer_harness: string;
  reviewer_harness: string;
  heterogeneous_required: boolean;
  blocking_iss: string[];
  rounds_on: { [iss: string]: number };
  fuse_threshold: number;
};

export type Finding = {
  title: string;
  blocking: boolean;
  repro: string;
  body?: string;
};

const PACK_KEYS = ["diff", "plan", "reqs", "evidence", "worklog_summary"] as const;

const ATTACK_RE = [
  /^tools\/gate\//,
  /^tools\/cli\//,
  /^\.githooks\//,
  /^bin\//,
  /^\.github\/workflows\//,
  /^keel\/approvals\//,
  /^tests\//,
];

const CORE_RE = [/^tools\//, /^samples\//];

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

export function checklistExists(ctx: Ctx): { attack: boolean; robustness: boolean; requirements: boolean } {
  const d = reviewDir(ctx);
  return {
    attack: existsSync(join(d, "attack-surface.md")),
    robustness: existsSync(join(d, "robustness.md")),
    requirements: existsSync(join(d, "requirements.md")),
  };
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
  }
  return { ok: true };
}

export function fileFindings(
  ctx: Ctx,
  findings: Finding[],
  worklogRel: string,
): { iss: string[]; deferred: string[] } {
  const iss: string[] = [];
  const deferred: string[] = [];
  for (const f of findings) {
    if (f.blocking && f.repro.trim()) {
      const created = runNew(ctx, ["iss", f.title]);
      const m = (created.stdout || "").match(/created\s+(ISS-\d+[^\s]*)/);
      const fname = m?.[1];
      if (fname) {
        const dest = join(ctx.records, "issues", fname);
        if (existsSync(dest)) {
          let body = readFileSync(dest, "utf8");
          body = body.replace("复现命令：", `复现命令：\n\n\`\`\`\n${f.repro.trim()}\n\`\`\``);
          if (f.body) body += `\n\n${f.body}\n`;
          writeFileSync(dest, body, "utf8");
        }
        const id = fname.replace(/\.md$/, "").split("-").slice(0, 2).join("-");
        const idMatch = fname.match(/^(ISS-\d+)/);
        iss.push(idMatch?.[1] ?? id);
      }
    } else if (f.blocking) {
      deferred.push(f.title);
      const log = join(ctx.root, worklogRel);
      mkdirSync(dirname(log), { recursive: true });
      const line = `\n- 待核实（无复现命令，未开 ISS）：${f.title}\n`;
      if (existsSync(log)) appendFileSync(log, line, "utf8");
      else writeFileSync(log, `# worklog\n${line}`, "utf8");
    }
  }
  return { iss, deferred };
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

export function completionReviewGaps(ctx: Ctx): string[] {
  const loop = readLoopState(ctx);
  if (!loop || loop.status !== "passed") return ["review loop not passed (REQ-027)"];
  if (loop.heterogeneous_required && !heterogeneousOk(true, loop.implementer_harness, loop.reviewer_harness)) {
    return ["heterogeneous review required; will not silently use the implementer harness (DEC-159)"];
  }
  return [];
}

export function canClear(runs: ReproRun[], issIds: string[]): boolean {
  return issIds.every((id) => runs.some((r) => r.iss === id && r.refused));
}

export function bumpRounds(state: LoopState, stillOpen: string[]): LoopState {
  const rounds_on = { ...state.rounds_on };
  for (const id of stillOpen) {
    rounds_on[id] = (rounds_on[id] ?? 0) + 1;
  }
  const fused = stillOpen.some((id) => (rounds_on[id] ?? 0) >= (state.fuse_threshold || FUSE_THRESHOLD));
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
  return { ...ev, review };
}

export function emptyLoop(lens: Lens, impl: string, reviewer: string): LoopState {
  const het = needsHeterogeneous(lens);
  return {
    status: "in_review",
    round: 0,
    lens,
    implementer_harness: impl,
    reviewer_harness: reviewer,
    heterogeneous_required: het,
    blocking_iss: [],
    rounds_on: {},
    fuse_threshold: FUSE_THRESHOLD,
  };
}

function writePack(ctx: Ctx, pack: { [k: string]: string }): CmdResult {
  const v = validatePack(pack);
  if (!v.ok) return fail(`${v.error}\n`);
  mkdirSync(reviewDir(ctx), { recursive: true });
  writeFileSync(join(reviewDir(ctx), "pack.json"), JSON.stringify(pack, null, 2) + "\n", "utf8");
  return ok(`wrote ${posixRel(ctx.root, join(reviewDir(ctx), "pack.json"))}\n`);
}

export function runLoop(ctx: Ctx, args: string[]): CmdResult {
  const sub = args[0] ?? "";
  if (sub === "status") {
    const st = readLoopState(ctx);
    if (!st) return ok("review loop: none\n");
    return ok(
      `review loop: ${st.status} round=${st.round} lens=${st.lens} het_required=${st.heterogeneous_required} blocking=${st.blocking_iss.join(",") || "-"}\n`,
    );
  }
  if (sub === "pack") {
    const raw = args[1] && existsSync(args[1]) ? readFileSync(args[1], "utf8") : "";
    if (!raw) return fail("usage: gate loop pack <pack.json>\n");
    let obj: { [k: string]: unknown };
    try {
      obj = JSON.parse(raw) as { [k: string]: unknown };
    } catch {
      return fail("pack.json is not JSON\n");
    }
    return writePack(ctx, obj as { [k: string]: string });
  }
  if (sub === "ingest") {
    const file = args[1] ?? "";
    if (!file || !existsSync(file)) return fail("usage: gate loop ingest <findings.json> [--worklog <rel>]\n");
    const worklogIdx = args.indexOf("--worklog");
    const worklogRel = worklogIdx >= 0 ? (args[worklogIdx + 1] ?? "keel/features/f07-review/worklog.md") : "keel/features/f07-review/worklog.md";
    let findings: Finding[] = [];
    try {
      findings = JSON.parse(readFileSync(file, "utf8")) as Finding[];
    } catch {
      return fail("findings.json invalid\n");
    }
    const out = fileFindings(ctx, findings, worklogRel);
    const st = readLoopState(ctx) ?? emptyLoop("requirements", "unknown", "unknown");
    st.blocking_iss = out.iss;
    st.status = out.iss.length ? "repairing" : "passed";
    writeLoopState(ctx, st);
    return ok(`filed iss=${out.iss.join(",") || "-"} deferred=${out.deferred.length}\n`);
  }
  if (sub === "clear") {
    const st = readLoopState(ctx);
    if (!st) return fail("no loop state; ingest first\n");
    const runs: ReproRun[] = [];
    for (const id of st.blocking_iss) {
      const cmd = args.includes("--") ? args.slice(args.indexOf("--") + 1).join(" ") : "";
      void cmd;
    }
    return fail("usage: gate loop clear is driven from tests/reviewer via recordClear\n");
  }
  if (sub === "append-attack") {
    const line = args.slice(1).join(" ").trim();
    if (!line) return fail("usage: gate loop append-attack <bullet>\n");
    appendAttackSurface(ctx, line);
    return ok("appended attack-surface.md\n");
  }
  return fail(
    "usage: gate loop status|pack <json>|ingest <findings.json>|append-attack <line>\n",
  );
}

export function recordClear(ctx: Ctx, runs: ReproRun[], impl: string, reviewer: string): CmdResult {
  const st = readLoopState(ctx) ?? emptyLoop(classifyLens([]), impl, reviewer);
  const still = st.blocking_iss.filter((id) => !runs.some((r) => r.iss === id && r.refused));
  const next = bumpRounds({ ...st, implementer_harness: impl, reviewer_harness: reviewer }, still);
  writeLoopState(ctx, next);
  const review: ReviewClear = {
    status: next.status === "passed" ? "passed" : next.status === "fused" ? "fused" : "pending",
    lens: next.lens,
    implementer_harness: impl,
    reviewer_harness: reviewer,
    heterogeneous_required: next.heterogeneous_required,
    heterogeneous_ok: heterogeneousOk(next.heterogeneous_required, impl, reviewer),
    blocking_iss: next.blocking_iss,
    repro_runs: runs,
    round: next.round,
  };
  const ev = readEvidence(ctx);
  if (ev) writeEvidence(ctx, attachReview(ev, review));
  if (next.status === "fused") {
    writeFileSync(join(reviewDir(ctx), "fuse-report.md"), fuseReport(next), "utf8");
    return fail(`fused after ${next.round} rounds\n${fuseReport(next)}`);
  }
  if (next.status === "passed") {
    if (reviewClearGaps(review).length) return fail(reviewClearGaps(review).join("; ") + "\n");
    return ok("review loop passed\n");
  }
  return ok(`review loop ${next.status} still_open=${still.join(",")}\n`);
}

void posixRel;
