export type Verdict = "pass" | "warn" | "fail" | "skip";

export type CheckItem = {
  id: string;
  verdict: Verdict;
  summary: string;
  fix?: string;
  /** A warn whose reason already lives in the artifact it reports (e.g. a `[proxy:...]`
   *  test name, DEC-168). C-103 escalation leaves it as WARN; it is still never a PASS. */
  acknowledged?: boolean;
};

export type CmdResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export function ok(stdout: string): CmdResult {
  return { code: 0, stdout, stderr: "" };
}

export function fail(stderr: string, code = 1): CmdResult {
  return { code, stdout: "", stderr };
}

export function usage(msg: string): CmdResult {
  return { code: 2, stdout: "", stderr: msg.endsWith("\n") ? msg : msg + "\n" };
}

export function formatCheck(items: CheckItem[]): CmdResult {
  const lines: string[] = [];
  let fails = 0;
  let warns = 0;
  for (const it of items) {
    const tag = it.verdict.toUpperCase().padEnd(4);
    lines.push(`${tag} ${it.id}  ${it.summary}`);
    if (it.fix) lines.push(`     fix: ${it.fix}`);
    if (it.verdict === "fail") fails += 1;
    if (it.verdict === "warn") warns += 1;
  }
  const overall = fails > 0 ? "FAIL" : warns > 0 ? "PASS_WITH_WARN" : "PASS";
  lines.push(`result: ${overall}  fail=${fails} warn=${warns} checks=${items.length}`);
  const text = lines.join("\n") + "\n";
  return { code: fails > 0 ? 1 : 0, stdout: text, stderr: "" };
}

/**
 * CHG-011: the CLI prints only what needs a human — FAIL/WARN items, their fix
 * lines, and the one-line result. PASS/SKIP rows stay available via `--all`.
 */
export function compactCheckOutput(stdout: string): string {
  const out: string[] = [];
  for (const line of stdout.split("\n")) {
    // SKIP rows stay: on a fresh project they carry the "run k-new" hint.
    if (/^PASS /.test(line)) continue;
    if (line.trim() === "") continue;
    out.push(line);
  }
  return out.join("\n") + "\n";
}
