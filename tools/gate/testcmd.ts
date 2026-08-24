import process from "node:process";

const EXACT: { [profile: string]: string[] } = {
  "python-cli": ["python -m pytest -q"],
  "ds-ml": ["python -m pytest -q"],
  "ts-js": ["npx vitest run"],
};

export function splitCmd(s: string): string[] {
  return (s.match(/"[^"]+"|\S+/g) ?? []).map((t) => t.replace(/^"|"$/g, ""));
}

function isNodeBin(bin: string): boolean {
  if (bin === "node" || bin === process.execPath) return true;
  return /node(\.exe)?$/i.test(bin.replace(/\\/g, "/"));
}

/** ISS-018: no extra path args — the full default suite only. */
export function isAllowedTestArgv(argv: string[]): boolean {
  if (argv.length === 0) return false;
  if (isNodeBin(argv[0] ?? "")) {
    if (!argv.includes("--test")) return false;
    const rest = argv.slice(1).filter(
      (a) => a !== "--test" && !a.startsWith("--test-reporter"),
    );
    return rest.length === 0;
  }
  const joined = argv.join(" ");
  for (const list of Object.values(EXACT)) {
    if (list.includes(joined)) return true;
  }
  return false;
}

export function isAllowedTestCommand(command: string, profileName: string): boolean {
  const cmd = command.trim();
  if (!cmd) return false;
  if (profileName === "python-cli" || profileName === "ds-ml" || profileName === "ts-js") {
    return (EXACT[profileName] ?? []).includes(cmd);
  }
  const argv = splitCmd(cmd);
  if (argv.length === 2 && isNodeBin(argv[0] ?? "") && argv[1] === "--test") return true;
  return false;
}

export function emptyRunIsFailure(counts: { passed: number; failed: number; skipped: number }): boolean {
  return counts.passed === 0 && counts.failed === 0;
}
