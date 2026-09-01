// CHG-014 S5 (DEC-188): the test-command allowlist is a shape — launcher prefix +
// test program + marker / reporter class arguments — and still refuses everything
// that narrows the suite (ISS-018).
import assert from "node:assert/strict";
import process from "node:process";
import { test } from "node:test";
import {
  allowedTestCommandReason,
  expandTestArgv,
  isAllowedTestArgv,
  isAllowedTestCommand,
  parseTestCommand,
  splitCmd,
} from "../tools/gate/testcmd.ts";

test("REQ-021/AC-6 launcher prefixes and marker / report arguments are allowed for the matching profile", () => {
  for (const [cmd, profile] of [
    ["uv run python -m pytest -q -m unit", "python-cli"],
    ["python -m pytest -q", "python-cli"],
    ["python3 -m pytest -q -x --tb=short --maxfail=1", "ds-ml"],
    ["poetry run pytest -q -m \"not slow\" --junitxml=out.xml", "python-cli"],
    ["uv run pytest -q -p no:cacheprovider", "python-cli"],
    ["npx vitest run", "ts-js"],
    ["pnpm exec vitest run --reporter=junit --outputFile=keel/evidence/junit.xml", "ts-js"],
    ["pnpm vitest run", "ts-js"],
    ["yarn jest --ci --silent", "ts-js"],
    ["node --test", "keel-gate"],
    ["node --test", "ts-js"],
    ["pytest -q", "other"],
    ["npx vitest run", "other"],
  ] as const) {
    assert.equal(allowedTestCommandReason(cmd, profile), null, `${cmd} [${profile}]`);
    assert.ok(isAllowedTestCommand(cmd, profile), cmd);
    assert.ok(isAllowedTestArgv(splitCmd(cmd)), cmd);
  }
});

test("REQ-021/AC-6 narrowing the suite — -k, -t, name patterns, paths, test ids — is refused; watch-mode vitest and foreign families are refused", () => {
  for (const [cmd, profile, why] of [
    ["uv run python -m pytest -q -k smoke", "python-cli", /narrowing switch -k/],
    ["python -m pytest tests/unit", "python-cli", /positional tests\/unit/],
    ["python -m pytest tests/test_x.py::test_y", "python-cli", /positional/],
    ["python -m pytest -m tests/unit", "python-cli", /selects a path|not allowed/],
    ["pytest --lf", "python-cli", /narrowing switch --lf/],
    ["npx vitest run src/a.test.ts", "ts-js", /positional src\/a\.test\.ts/],
    ["npx vitest run -t login", "ts-js", /narrowing switch -t/],
    ["npx vitest", "ts-js", /non-interactive `run` form/],
    ["npx jest --testPathPattern foo", "ts-js", /narrowing switch --testPathPattern/],
    ["node --test tests", "keel-gate", /positional tests/],
    ["node --test tests/ok.test.js", "ts-js", /positional tests\/ok\.test\.js/],
    ["node --test --test-name-pattern x", "ts-js", /narrowing switch --test-name-pattern/],
    ["git --version", "keel-gate", /not a recognized test program/],
    ["npx vitest run", "keel-gate", /keel-gate test_command must be exactly node --test/],
    ["node --test --test-timeout=60000", "keel-gate", /exactly node --test/],
    ["python -m pytest -q", "ts-js", /profile ts-js runs node tests, not pytest/],
    ["npx vitest run", "python-cli", /profile python-cli runs python tests, not vitest/],
    ["python -m pytest --unknown-flag", "python-cli", /not a marker or report class argument/],
    ["", "python-cli", /empty test_command/],
  ] as const) {
    const reason = allowedTestCommandReason(cmd, profile);
    assert.ok(reason !== null, `${cmd} [${profile}] should be refused`);
    assert.match(reason ?? "", why, `${cmd}: ${reason}`);
    assert.ok(!isAllowedTestCommand(cmd, profile), cmd);
  }
  assert.ok(!isAllowedTestArgv(["python", "-m", "pytest", "-k", "x"]));
  assert.ok(!isAllowedTestArgv([process.execPath, "--test", "tests/one.test.ts"]));
});

test("REQ-021/AC-6 gate verify expands the junit output for pytest and vitest exactly once and leaves a declared report alone", () => {
  const junit = "keel/evidence/junit.xml";
  assert.deepEqual(expandTestArgv(["uv", "run", "python", "-m", "pytest", "-q", "-m", "unit"], junit), [
    "uv", "run", "python", "-m", "pytest", "-q", "-m", "unit", `--junitxml=${junit}`,
  ]);
  const declared = ["python", "-m", "pytest", "-q", "--junitxml=reports/x.xml"];
  assert.deepEqual(expandTestArgv(declared, junit), declared);
  assert.deepEqual(expandTestArgv(["npx", "vitest", "run"], junit), [
    "npx", "vitest", "run", "--reporter=default", "--reporter=junit", `--outputFile=${junit}`,
  ]);
  const node = expandTestArgv(["node", "--test"], junit);
  assert.equal(node[0], process.execPath);
  assert.ok(node.includes("--test-reporter=junit"));
  assert.ok(node.includes(`--test-reporter-destination=${junit}`));
  // the expanded argv is still allowlisted (that is what evidenceGaps checks)
  for (const argv of [expandTestArgv(["uv", "run", "pytest", "-q"], junit), expandTestArgv(["npx", "vitest", "run"], junit), node]) {
    assert.ok(isAllowedTestArgv(argv), argv.join(" "));
  }
  const parsed = parseTestCommand(["uv", "run", "python", "-m", "pytest", "-q", "-m", "unit"]);
  assert.equal(parsed.program, "pytest");
  assert.deepEqual(parsed.launcher, ["uv", "run", "python", "-m"]);
});
