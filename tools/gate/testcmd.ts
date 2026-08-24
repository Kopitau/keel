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

function testsPathOk(arg: string): boolean {
  const n = arg.replace(/\\/g, "/");
  if (n === "tests") return false;
  return n.startsWith("tests/");
}

/** Config string or expanded argv: node --test plus optional tests/... paths. Reporter flags ignored. */
export function isAllowedTestArgv(argv: string[]): boolean {
  if (argv.length === 0) return false;
  if (isNodeBin(argv[0] ?? "")) {
    if (!argv.includes("--test")) return false;
    const rest = argv.slice(1).filter(
      (a) => a !== "--test" && !a.startsWith("--test-reporter"),
    );
    return rest.every((a) => testsPathOk(a));
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
  return isAllowedTestArgv(splitCmd(cmd));
}

export function emptyRunIsFailure(counts: { passed: number; failed: number; skipped: number }): boolean {
  return counts.passed === 0 && counts.failed === 0;
}
