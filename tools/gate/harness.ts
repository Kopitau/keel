import process from "node:process";

export type HarnessId = { agent: string; session: string };

export type EnvMap = { [key: string]: string | undefined };

/**
 * DEC-166: an APR commit made from inside an agent environment must say so.
 * The evidence was always at hand — Claude Code exports CLAUDECODE=1 and a
 * session id while keel stamped `Agent: unknown` next to a Claude-Session URL
 * (zhaoxi APR-001, 2026-08-25). Detection order: explicit KEEL_* override, then
 * verified harness markers, then the generic AI_AGENT hint. Only markers we
 * have actually observed are listed; add new harnesses when their env is seen,
 * do not guess names.
 */
export function detectHarness(env: EnvMap = process.env): HarnessId | null {
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
  const generic = (env.AI_AGENT ?? "").trim();
  if (generic) return { agent: generic, session: (env.KEEL_SESSION ?? "").trim() || "unknown" };
  return null;
}

/** Trailer evidence that a commit was made from an agent environment. */
export function commitLooksAgentMade(body: string): boolean {
  const m = /^Agent:\s*(.+)$/m.exec(body);
  if (m && (m[1] ?? "").trim().toLowerCase() !== "unknown") return true;
  // Harness-added trailers survive even where keel's own stamp said unknown.
  return /^Claude-Session:\s*\S/m.test(body);
}
