import process from "node:process";

/**
 * DEC-188 (CHG-014): the test-command allowlist is a shape, not three literal
 * strings — launcher prefix + test program + marker / reporter class arguments.
 * What ISS-018 forbade still is forbidden: narrowing the suite to a file, a
 * directory, a test-name pattern (`-k`, `-t`, `--test-name-pattern`, …). The
 * pilots paid for the old literal list twice: zhaoxi swapped its whole test
 * stack because `npx` could not start on Windows, fmea-v3 patched keel itself
 * to run `uv run python -m pytest -q -m unit`.
 */

export type TestFamily = "python" | "node";
export type TestProgram = "pytest" | "vitest" | "jest" | "node-test";

/** Launchers a project may put in front of the test program, longest first. */
const LAUNCHERS: string[][] = [
  ["uv", "run", "python3", "-m"],
  ["uv", "run", "python", "-m"],
  ["npm", "exec", "--"],
  ["poetry", "run", "python", "-m"],
  ["python3", "-m"],
  ["python", "-m"],
  ["uv", "run"],
  ["poetry", "run"],
  ["pipenv", "run"],
  ["pdm", "run"],
  ["hatch", "run"],
  ["pnpm", "exec"],
  ["npx"],
  ["pnpm"],
  ["yarn"],
  ["bunx"],
];

/** Arguments that select a category or a report, never a file or a name. */
const PYTHON_FLAGS = [
  /^-q+$/,
  /^-v+$/,
  /^-x$/,
  /^-s$/,
  /^-r[a-zA-Z]*$/,
  /^--tb=\S+$/,
  /^--maxfail=\d+$/,
  /^--junitxml=\S+$/,
  /^--junit-xml=\S+$/,
  /^--strict-markers$/,
  /^--strict-config$/,
  /^--no-header$/,
  /^--disable-warnings$/,
  /^--durations=\d+$/,
  /^--color=\S+$/,
  /^--import-mode=\S+$/,
  /^-p$/,
  /^-W$/,
  /^-m$/,
  /^-o$/,
];
/** Flags that consume the next token (a marker expression, a plugin name, a warning filter, an ini override). */
const PYTHON_VALUE_FLAGS = new Set(["-m", "-p", "-W", "-o"]);

const NODE_FLAGS = [
  /^--reporter(=\S+)?$/,
  /^--reporters?=\S+$/,
  /^--outputFile(\.\w+)?(=\S+)?$/,
  /^--run$/,
  /^--ci$/,
  /^--silent$/,
  /^--passWithNoTests$/,
  /^--coverage$/,
  /^--no-color$/,
  /^--color$/,
  /^--test-reporter(=\S+)?$/,
  /^--test-reporter-destination(=\S+)?$/,
  /^--test-concurrency=\d+$/,
  /^--test-timeout=\d+$/,
  /^--test-force-exit$/,
  /^--experimental-strip-types$/,
];
const NODE_VALUE_FLAGS = new Set(["--reporter", "--outputFile", "--test-reporter", "--test-reporter-destination"]);

/** Narrowing switches (ISS-018): refused whatever comes after them. */
const NARROWING = /^(-k|-t|-g|--grep|--test-name-pattern|--testNamePattern|--testPathPattern|--testPathPatterns|--test-only|--only|--test-skip-pattern|--changed|--related|--findRelatedTests|--onlyChanged|--lf|--last-failed|--ff|--deselect|--ignore)(=.*)?$/;

/** A positional token is a path / test id / name selector — never a category. */
const PATH_LIKE = /[\\/]|::|\.(py|ts|tsx|js|jsx|mjs|cjs|json)$/i;

export function splitCmd(s: string): string[] {
  return (s.match(/"[^"]+"|'[^']+'|\S+/g) ?? []).map((t) => t.replace(/^["']|["']$/g, ""));
}

function isNodeBin(bin: string): boolean {
  if (bin === "node" || bin === process.execPath) return true;
  return /node(\.exe)?$/i.test(bin.replace(/\\/g, "/"));
}

export type ParsedTestCommand = {
  ok: boolean;
  program?: TestProgram;
  family?: TestFamily;
  launcher: string[];
  args: string[];
  reason?: string;
};

function stripLauncher(argv: string[]): { launcher: string[]; rest: string[] } {
  for (const l of LAUNCHERS) {
    if (l.length < argv.length && l.every((t, i) => argv[i] === t)) {
      return { launcher: l, rest: argv.slice(l.length) };
    }
  }
  return { launcher: [], rest: argv };
}

function checkArgs(args: string[], flags: RegExp[], valueFlags: Set<string>): string | null {
  for (let i = 0; i < args.length; i++) {
    const a = args[i] ?? "";
    if (NARROWING.test(a)) return `narrowing switch ${a} refused (ISS-018)`;
    if (a.startsWith("-")) {
      if (!flags.some((re) => re.test(a))) return `argument ${a} is not a marker or report class argument (DEC-188)`;
      if (valueFlags.has(a)) {
        const v = args[i + 1] ?? "";
        if (!v || v.startsWith("-")) return `${a} needs a value`;
        if (PATH_LIKE.test(v)) return `${a} ${v} selects a path, not a category (ISS-018)`;
        i += 1;
      }
      continue;
    }
    return `positional ${a} narrows the suite to a path or a name (ISS-018)`;
  }
  return null;
}

/** Parse one test invocation into launcher / program / validated arguments. */
export function parseTestCommand(argvIn: string[]): ParsedTestCommand {
  const argv = argvIn.filter((t) => t !== "");
  if (argv.length === 0) return { ok: false, launcher: [], args: [], reason: "empty command" };
  // node --test (any launcher-free node binary, incl. process.execPath)
  if (isNodeBin(argv[0] ?? "")) {
    const rest = argv.slice(1);
    if (!rest.includes("--test")) return { ok: false, launcher: [], args: rest, reason: "node without --test is not a test run" };
    const args = rest.filter((a) => a !== "--test");
    const bad = checkArgs(args, NODE_FLAGS, NODE_VALUE_FLAGS);
    if (bad) return { ok: false, program: "node-test", family: "node", launcher: [], args, reason: bad };
    return { ok: true, program: "node-test", family: "node", launcher: [], args };
  }
  const { launcher, rest } = stripLauncher(argv);
  const head = rest[0] ?? "";
  if (head === "pytest") {
    const args = rest.slice(1);
    const bad = checkArgs(args, PYTHON_FLAGS, PYTHON_VALUE_FLAGS);
    if (bad) return { ok: false, program: "pytest", family: "python", launcher, args, reason: bad };
    return { ok: true, program: "pytest", family: "python", launcher, args };
  }
  if (head === "vitest") {
    if (rest[1] !== "run") return { ok: false, program: "vitest", family: "node", launcher, args: rest.slice(1), reason: "vitest needs the non-interactive `run` form (DEC-188)" };
    const args = rest.slice(2);
    const bad = checkArgs(args, NODE_FLAGS, NODE_VALUE_FLAGS);
    if (bad) return { ok: false, program: "vitest", family: "node", launcher, args, reason: bad };
    return { ok: true, program: "vitest", family: "node", launcher, args };
  }
  if (head === "jest") {
    const args = rest.slice(1);
    const bad = checkArgs(args, NODE_FLAGS, NODE_VALUE_FLAGS);
    if (bad) return { ok: false, program: "jest", family: "node", launcher, args, reason: bad };
    return { ok: true, program: "jest", family: "node", launcher, args };
  }
  if (isNodeBin(head)) return parseTestCommand(rest);
  return { ok: false, launcher, args: rest, reason: `${head || "(empty)"} is not a recognized test program (pytest / vitest run / jest / node --test)` };
}

/** Which program families a profile may run; unknown / `other` profiles may run any. */
export function profileFamilies(profileName: string): TestFamily[] | "any" {
  if (profileName === "keel-gate") return ["node"];
  if (profileName === "python-cli" || profileName === "ds-ml") return ["python"];
  if (profileName === "ts-js") return ["node"];
  return "any";
}

export function allowedTestCommandReason(command: string, profileName: string): string | null {
  const cmd = command.trim();
  if (!cmd) return "empty test_command";
  const parsed = parseTestCommand(splitCmd(cmd));
  if (!parsed.ok) return parsed.reason ?? "refused";
  // keel's own gate keeps ISS-018 literal: the full node:test suite, nothing else.
  if (profileName === "keel-gate" && (parsed.program !== "node-test" || parsed.args.length > 0)) {
    return "keel-gate test_command must be exactly node --test (full suite, ISS-018)";
  }
  const fam = profileFamilies(profileName);
  if (fam !== "any" && parsed.family && !fam.includes(parsed.family)) {
    return `profile ${profileName} runs ${fam.join("/")} tests, not ${parsed.program}`;
  }
  return null;
}

export function isAllowedTestCommand(command: string, profileName: string): boolean {
  return allowedTestCommandReason(command, profileName) === null;
}

/** ISS-018 / DEC-188: the expanded argv verify actually ran, judged with no profile knowledge. */
export function isAllowedTestArgv(argv: string[]): boolean {
  return parseTestCommand(argv).ok;
}

/**
 * The argv `gate verify` runs: node:test gets its junit reporter, pytest its
 * `--junitxml`, vitest its junit reporter — only when the project did not already
 * say where the report goes (DEC-188).
 */
export function expandTestArgv(argv: string[], junitRel: string): string[] {
  const parsed = parseTestCommand(argv);
  if (!parsed.ok || !parsed.program) return argv;
  if (parsed.program === "node-test") {
    if (parsed.args.some((a) => a.startsWith("--test-reporter"))) return argv;
    return [
      process.execPath,
      "--test",
      "--test-reporter=spec",
      "--test-reporter-destination=stdout",
      "--test-reporter=junit",
      `--test-reporter-destination=${junitRel}`,
      ...parsed.args,
    ];
  }
  if (parsed.program === "pytest") {
    if (parsed.args.some((a) => /^--junit-?xml=/.test(a))) return argv;
    return [...argv, `--junitxml=${junitRel}`];
  }
  if (parsed.program === "vitest") {
    if (parsed.args.some((a) => /^--outputFile/.test(a))) return argv;
    return [...argv, "--reporter=default", "--reporter=junit", `--outputFile=${junitRel}`];
  }
  return argv;
}

export function emptyRunIsFailure(counts: { passed: number; failed: number; skipped: number }): boolean {
  return counts.passed === 0 && counts.failed === 0;
}
