import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fail, ok } from "./result.js";
import { EXEC_REQUIRED } from "./layout.js";
import { nodeTooOld, refuseOldNodeMessage } from "../../bin/node-age.js";

export function nodeVersionFinding(ver) {
  if (nodeTooOld(ver)) {
    return { code: "node", summary: refuseOldNodeMessage(ver) };
  }
  return null;
}

export function foreignConfigFinding(cwd, source, cfg) {
  const self =
    basename(source).toLowerCase() === basename(cwd).toLowerCase() &&
    (existsSync(join(cwd, "tools", "cli", "main.js")) || existsSync(join(cwd, "tools", "cli", "main.ts")));
  if (self) return null;
  const wave = String(cfg.wave || "");
  const name = String(cfg.project_name || "");
  if (name === "keel" || /^W\d/i.test(wave) || /^R\d/i.test(wave)) {
    return {
      code: "foreign-config",
      summary:
        "config looks copied from the keel framework (project_name=" +
        (name || "?") +
        " wave=" +
        (wave || "none") +
        "); re-run keel init in a clean dir or strip framework state",
    };
  }
  return null;
}

function execBitGaps(cwd) {
  const gaps = [];
  for (let i = 0; i < EXEC_REQUIRED.length; i++) {
    const rel = EXEC_REQUIRED[i];
    const r = spawnSync("git", ["ls-files", "-s", "--", rel], { encoding: "utf8", cwd: cwd });
    const m = /^([0-7]{6})\s/.exec((r.stdout || "").trim());
    if (!m) continue;
    if (m[1] !== "100755") gaps.push(rel + " is " + m[1] + ", want 100755");
  }
  return gaps;
}

export function runDoctor(cwd, source, nodeVer) {
  const findings = [];
  const nv = nodeVersionFinding(nodeVer || process.versions.node);
  if (nv) findings.push(nv);
  const cfgPath = join(cwd, "keel", "config.json");
  if (!existsSync(cfgPath)) {
    findings.push({ code: "not-installed", summary: "keel/config.json missing; run keel init" });
  } else {
    try {
      const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
      const foreign = foreignConfigFinding(cwd, source, cfg);
      if (foreign) findings.push(foreign);
    } catch {
      findings.push({ code: "config", summary: "keel/config.json is not valid JSON" });
    }
  }
  if (!existsSync(join(cwd, "tools", "gate", "gate.ts"))) {
    findings.push({ code: "missing-gate", summary: "tools/gate/gate.ts missing; project is uninstalled or half-installed" });
  }
  const hooks = [".githooks/pre-commit", ".githooks/pre-push", ".githooks/prepare-commit-msg"];
  for (let h = 0; h < hooks.length; h++) {
    if (!existsSync(join(cwd, hooks[h]))) {
      findings.push({ code: "missing-hooks", summary: hooks[h] + " missing" });
    }
  }
  if (!existsSync(join(cwd, ".claude", "skills"))) {
    findings.push({ code: "missing-skills", summary: ".claude/skills missing; run gate sync" });
  }
  if (existsSync(join(cwd, ".git"))) {
    const hp = spawnSync("git", ["config", "core.hooksPath"], { encoding: "utf8", cwd: cwd });
    const hooksPath = (hp.stdout || "").trim().replace(/\\/g, "/");
    if (hooksPath !== ".githooks" && !hooksPath.endsWith("/.githooks")) {
      findings.push({
        code: "hooksPath",
        summary: "core.hooksPath=" + (hooksPath || "(unset)") + "; want .githooks",
      });
    }
    const gaps = execBitGaps(cwd);
    if (gaps.length > 0) {
      findings.push({ code: "execbit", summary: gaps.join("; ") });
    }
  }
  if (findings.length === 0) {
    return ok("keel doctor: ok\n");
  }
  const lines = findings.map(function (f) {
    return f.code + ": " + f.summary;
  });
  return fail(lines.join("\n") + "\n");
}
