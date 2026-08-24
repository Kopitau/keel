import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { git, gitHooksPath } from "./git.ts";

export type BypassFinding = { code: string; summary: string; fix: string };

const ZERO = /^0+$/;

/** Remote already has commits that local does not contain → this update would drop them. */
export function isForceUpdate(remoteSha: string, localSha: string, remoteIsAncestor: boolean): boolean {
  if (!remoteSha || ZERO.test(remoteSha)) return false;
  if (!localSha || ZERO.test(localSha)) return false;
  return !remoteIsAncestor;
}

export function parsePrePushLine(line: string): {
  localRef: string;
  localSha: string;
  remoteRef: string;
  remoteSha: string;
} | null {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 4) return null;
  return {
    localRef: parts[0] ?? "",
    localSha: parts[1] ?? "",
    remoteRef: parts[2] ?? "",
    remoteSha: parts[3] ?? "",
  };
}

export function ciWorkflowGaps(root: string): string[] {
  const wf = join(root, ".github", "workflows", "gate.yml");
  if (!existsSync(wf)) return ["missing .github/workflows/gate.yml"];
  const text = readFileSync(wf, "utf8");
  const gaps: string[] = [];
  if (!text.includes("gate.ts check") && !text.includes("gate.ts\" check")) {
    gaps.push("CI workflow dropped gate check");
  }
  if (!text.includes("gate.ts verify") && !text.includes("gate.ts\" verify")) {
    gaps.push("CI workflow dropped gate verify");
  }
  if (!/matrix:/.test(text) || !/ubuntu-latest/.test(text) || !/windows-latest/.test(text) || !/macos-latest/.test(text)) {
    gaps.push("CI matrix no longer covers ubuntu/windows/macos");
  }
  if (!/(^|\n)\s*run:\s*node --test\s*(\n|$)/.test(text)) {
    gaps.push("CI missing config-independent node --test (ISS-001)");
  }
  const verifyAt = text.indexOf("gate.ts verify");
  const checkAt = text.indexOf("gate.ts check");
  if (verifyAt >= 0 && checkAt >= 0 && checkAt < verifyAt) {
    gaps.push("CI runs check before verify (ISS-002)");
  }
  return gaps;
}

export function collectBypassFindings(ctx: Ctx): BypassFinding[] {
  const out: BypassFinding[] = [];
  const pkg = join(ctx.root, "package.json");
  if (existsSync(pkg)) {
    let hasTestScript = false;
    try {
      const data = JSON.parse(readFileSync(pkg, "utf8")) as { scripts?: { test?: string } };
      hasTestScript = Boolean(data.scripts?.test);
    } catch {
      hasTestScript = false;
    }
    if (hasTestScript && !existsSync(join(ctx.root, "tests"))) {
      out.push({
        code: "tests-dir",
        summary: "package.json has a test script but tests/ is missing",
        fix: "do not relocate tests to skip gate (C-105)",
      });
    }
  }
  const hp = gitHooksPath(ctx);
  const hooksOn = hp === ".githooks" || hp.split("\\").join("/").endsWith("/.githooks");
  if (hooksOn) {
    const body = git(ctx, ["log", "-1", "--format=%B"]).stdout;
    if (body && !/^Feature:\s/m.test(body)) {
      out.push({
        code: "no-verify",
        summary: "HEAD commit has no Feature trailer (prepare-commit-msg may have been skipped with --no-verify)",
        fix: "commit without --no-verify so .githooks/prepare-commit-msg runs (C-105)",
      });
    }
  }
  const wf = join(ctx.root, ".github", "workflows", "gate.yml");
  if (existsSync(wf)) {
    for (const g of ciWorkflowGaps(ctx.root)) {
      out.push({ code: "ci", summary: g, fix: "restore check + verify + OS matrix (C-105)" });
    }
  } else if ((ctx.config.enforcement_tier as string) === "github" || (ctx.config.enforcement_tier as string) === "gitee") {
    out.push({
      code: "ci",
      summary: "enforcement tier expects CI but .github/workflows/gate.yml is missing",
      fix: "restore the gate workflow (C-105)",
    });
  }
  return out;
}
