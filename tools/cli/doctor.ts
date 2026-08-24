import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import process from "node:process";
import { makeCtx } from "../gate/ctx.ts";
import { execModeGaps } from "../gate/execmode.ts";
import { isAtLeast, MIN_NODE } from "../gate/node-version.ts";
import { fail, ok, type CmdResult } from "../gate/result.ts";
import { nodeTooOld, refuseOldNodeMessage } from "../../bin/node-age.js";

export type DoctorFinding = { code: string; summary: string };

export function nodeVersionFinding(ver: string): DoctorFinding | null {
  if (nodeTooOld(ver) || !isAtLeast(ver, MIN_NODE)) {
    return { code: "node", summary: refuseOldNodeMessage(ver) };
  }
  return null;
}

export function foreignConfigFinding(
  cwd: string,
  source: string,
  cfg: { project_name?: string; wave?: string },
): DoctorFinding | null {
  const self = basename(source).toLowerCase() === basename(cwd).toLowerCase() && existsSync(join(cwd, "tools", "cli", "main.ts"));
  if (self) return null;
  const wave = String(cfg.wave ?? "");
  const name = String(cfg.project_name ?? "");
  if (name === "keel" || /^W\d/i.test(wave) || /^R\d/i.test(wave)) {
    return {
      code: "foreign-config",
      summary: `config looks copied from the keel framework (project_name=${name || "?"} wave=${wave || "none"}); re-run keel init in a clean dir or strip framework state`,
    };
  }
  return null;
}

export function runDoctor(cwd: string, source: string, nodeVer = ""): CmdResult {
  const findings: DoctorFinding[] = [];
  const nv = nodeVersionFinding(nodeVer || process.versions.node);
  if (nv) findings.push(nv);
  const cfgPath = join(cwd, "keel", "config.json");
  if (!existsSync(cfgPath)) {
    findings.push({ code: "not-installed", summary: "keel/config.json missing; run keel init" });
  } else {
    try {
      const cfg = JSON.parse(readFileSync(cfgPath, "utf8")) as { project_name?: string; wave?: string };
      const foreign = foreignConfigFinding(cwd, source, cfg);
      if (foreign) findings.push(foreign);
    } catch {
      findings.push({ code: "config", summary: "keel/config.json is not valid JSON" });
    }
  }
  if (existsSync(join(cwd, ".git"))) {
    const gaps = execModeGaps(makeCtx(cwd));
    if (gaps.length > 0) {
      findings.push({ code: "execbit", summary: gaps.join("; ") });
    }
  }
  if (findings.length === 0) {
    return ok("keel doctor: ok\n");
  }
  const lines = findings.map((f) => `${f.code}: ${f.summary}`);
  return fail(lines.join("\n") + "\n");
}
