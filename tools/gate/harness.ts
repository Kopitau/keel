import { spawnSync } from "node:child_process";
import process from "node:process";

export type HarnessId = { agent: string; session: string };

export type EnvMap = { [key: string]: string | undefined };

/** Optional process-ancestry provider; injected by tests, `ancestorProcessNames` in production. */
export type DetectOptions = { ancestors?: () => string[] };

/**
 * An editor host whose integrated terminal and whose agent share one environment
 * (Cursor, VS Code). Seeing it proves nothing about *who* typed `git commit`, so a
 * host is reported next to `Agent: unknown` and never trips the DEC-166 guard.
 */
export type HostId = { host: string; via: "env" | "process" };

/**
 * DEC-166 / ISS-059: an APR commit made from inside an agent environment must
 * say so. Claude Code exports CLAUDECODE=1 and a session id; Codex and Cursor
 * export nothing keel had observed by 2026-08 — both pilots stamped
 * `Agent: unknown` on every commit and the DEC-166 guard, gated on a detected
 * harness, never ran there. Detection order: explicit KEEL_* override, then
 * environment markers (a CLAUDECODE flag, any CODEX_* variable), the generic
 * AI_AGENT hint, and finally the process ancestry (`codex` / `claude` /
 * `opencode` / `grok` above git). Only markers actually observed on a machine
 * are hard-coded; the CODEX_* prefix rule stands until a real Codex env dump
 * names the variable (ISS-059).
 */
export function detectHarness(env: EnvMap = process.env, opts: DetectOptions = {}): HarnessId | null {
  const explicit = (env.KEEL_AGENT ?? "").trim();
  if (explicit) {
    return { agent: explicit, session: (env.KEEL_SESSION ?? "").trim() || "unknown" };
  }
  if ((env.CLAUDECODE ?? "") === "1" || (env.CLAUDE_CODE_ENTRYPOINT ?? "").trim()) {
    return {
      agent: "claude-code",
      session: (env.CLAUDE_CODE_SESSION_ID ?? "").trim() || "unknown",
    };
  }
  if (Object.keys(env).some((k) => /^CODEX_/.test(k))) {
    return {
      agent: "codex",
      session: (env.CODEX_THREAD_ID ?? env.CODEX_SESSION_ID ?? "").trim() || "unknown",
    };
  }
  const generic = (env.AI_AGENT ?? "").trim();
  if (generic) return { agent: generic, session: (env.KEEL_SESSION ?? "").trim() || "unknown" };
  const byProcess = agentFromAncestry(ancestry(env, opts));
  if (byProcess) return { agent: byProcess, session: (env.KEEL_SESSION ?? "").trim() || "unknown" };
  return null;
}

/** Definite agent processes above git: the harness executable itself. */
const AGENT_PROCESSES: [RegExp, string][] = [
  [/^codex(\.exe)?$/i, "codex"],
  [/^claude(\.exe)?$/i, "claude-code"],
  [/^opencode(\.exe)?$/i, "opencode"],
  [/^grok(\.exe)?$/i, "grok-build"],
  [/^dsh(\.exe)?$/i, "deepseek-harness"],
];

/** Editor hosts whose terminal a human may be typing in. */
const HOST_PROCESSES: [RegExp, string][] = [
  [/^cursor(\.exe)?$/i, "cursor"],
  [/^code(\.exe)?$/i, "vscode"],
];

export function agentFromAncestry(names: string[]): string | null {
  for (const raw of names) {
    const name = raw.trim();
    for (const [re, agent] of AGENT_PROCESSES) if (re.test(name)) return agent;
  }
  return null;
}

/** KEEL_ANCESTRY=0 turns the process-tree fallback off (tests, containers without ps). */
function ancestry(env: EnvMap, opts: DetectOptions): string[] {
  if ((env.KEEL_ANCESTRY ?? "").trim() === "0") return [];
  return opts.ancestors ? opts.ancestors() : [];
}

export function detectHost(env: EnvMap = process.env, opts: DetectOptions = {}): HostId | null {
  if (Object.keys(env).some((k) => /^CURSOR_/.test(k))) return { host: "cursor", via: "env" };
  const names = ancestry(env, opts);
  for (const raw of names) {
    const name = raw.trim();
    for (const [re, host] of HOST_PROCESSES) if (re.test(name)) return { host, via: "process" };
  }
  if ((env.TERM_PROGRAM ?? "").toLowerCase() === "vscode") return { host: "vscode", via: "env" };
  return null;
}

let ancestryCache: string[] | undefined;

/**
 * Process names from this process up to the session root, nearest first. One
 * CIM query on Windows (~150 ms), one `ps` on POSIX; cached per process and
 * only consulted when no environment marker answered. Failures yield [].
 */
export function ancestorProcessNames(maxDepth = 16): string[] {
  if (ancestryCache) return ancestryCache;
  const table = new Map<number, { parent: number; name: string }>();
  try {
    if (process.platform === "win32") {
      const script =
        "Get-CimInstance Win32_Process | ForEach-Object { \"$($_.ProcessId)\t$($_.ParentProcessId)\t$($_.Name)\" }";
      const r = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], {
        encoding: "utf8",
        timeout: 5000,
      });
      for (const line of (r.stdout || "").split(/\r?\n/)) {
        const [pid, ppid, ...rest] = line.split("\t");
        const name = rest.join("\t").trim();
        if (!pid || !ppid || !name) continue;
        table.set(Number(pid), { parent: Number(ppid), name });
      }
    } else {
      const r = spawnSync("ps", ["-eo", "pid=,ppid=,comm="], { encoding: "utf8", timeout: 5000 });
      for (const line of (r.stdout || "").split(/\n/)) {
        const m = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
        if (!m) continue;
        table.set(Number(m[1]), { parent: Number(m[2]), name: (m[3] ?? "").trim().replace(/^.*\//, "") });
      }
    }
  } catch {
    ancestryCache = [];
    return ancestryCache;
  }
  const out: string[] = [];
  let pid = process.pid;
  const seen = new Set<number>();
  for (let i = 0; i < maxDepth; i++) {
    const row = table.get(pid);
    if (!row || seen.has(pid)) break;
    seen.add(pid);
    out.push(row.name);
    pid = row.parent;
    if (!pid) break;
  }
  ancestryCache = out;
  return out;
}

/** Trailer evidence that a commit was made from an agent environment. */
export function commitLooksAgentMade(body: string): boolean {
  const m = /^Agent:\s*(.+)$/m.exec(body);
  if (m && (m[1] ?? "").trim().toLowerCase() !== "unknown") return true;
  // Harness-added trailers survive even where keel's own stamp said unknown.
  return /^Claude-Session:\s*\S/m.test(body);
}
