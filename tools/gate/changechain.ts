import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { sha256Body, sha256Normalized } from "./hash.ts";
import { mdFiles, posixRel } from "./walk.ts";

type ApprovalArtifact = {
  path: string;
  contentSha256: string;
};

/** Body edited after approval: a WARN, waived only by a worklog line citing the APR that bound that artifact. */
export type ChainWarning = { change: string; apr: string; text: string };

export type ChangeChainInspection = {
  checked: string[];
  gaps: string[];
  warnings: ChainWarning[];
};

function unquote(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function headerField(text: string, key: string): string {
  const header = text.split(/^##\s+REQ-\d+/m, 1)[0] ?? text;
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return header.match(new RegExp(`^\\s*-\\s*${escaped}:\\s*(.+?)\\s*$`, "mi"))?.[1] ?? "";
}

function changeIds(value: string): string[] {
  return [...new Set((value.match(/\bCHG-\d+\b/gi) ?? []).map((id) => id.toUpperCase()))];
}

/**
 * A current baseline inherits old CHG sources from the version it replaces.
 * G-req judges only the CHGs newly producing this version, plus its explicit
 * `change:` pointer. This catches a new proposed CHG without retroactively
 * rewriting the immutable approval history of inherited requirements.
 */
export function producingChangeIds(currentPath: string, currentText: string): string[] {
  const currentSources = changeIds(headerField(currentText, "source"));
  const previousSources = new Set<string>();
  const replaces = headerField(currentText, "replaces");
  const previousName = replaces.match(/\b([A-Za-z0-9._-]+\.md)\b/)?.[1] ?? "";
  if (previousName && previousName.toLowerCase() !== "null") {
    const previousPath = join(dirname(currentPath), basename(previousName));
    if (existsSync(previousPath)) {
      for (const id of changeIds(headerField(readFileSync(previousPath, "utf8"), "source"))) {
        previousSources.add(id);
      }
    }
  }

  const out = currentSources.filter((id) => !previousSources.has(id));
  for (const id of changeIds(headerField(currentText, "change"))) {
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function approvalArtifacts(text: string): ApprovalArtifact[] {
  const lines = text.split(/\r?\n/);
  const out: ApprovalArtifact[] = [];
  let inFrontmatter = false;
  let inArtifacts = false;
  let current: ApprovalArtifact | undefined;

  for (const line of lines) {
    if (line.trim() === "---") {
      if (!inFrontmatter) {
        inFrontmatter = true;
        continue;
      }
      break;
    }
    if (!inFrontmatter) continue;
    if (/^artifacts:\s*$/.test(line)) {
      inArtifacts = true;
      continue;
    }
    if (!inArtifacts) continue;

    const path = line.match(/^\s+-\s+path:\s+(.+?)\s*$/)?.[1];
    if (path !== undefined) {
      if (current) out.push(current);
      current = { path: unquote(path).replaceAll("\\", "/"), contentSha256: "" };
      continue;
    }
    const digest = line.match(/^\s+content_sha256:\s+(\S+)\s*$/)?.[1];
    if (digest !== undefined && current) {
      current.contentSha256 = unquote(digest).toLowerCase();
      continue;
    }
    if (/^[A-Za-z_][A-Za-z0-9_-]*:\s*/.test(line)) break;
  }
  if (current) out.push(current);
  return out;
}

function changeFile(ctx: Ctx, id: string): string[] {
  return mdFiles(join(ctx.records, "changes"), `${id}`).filter((path) => {
    const { attrs } = parseFrontmatter(readFileSync(path, "utf8"));
    return (attrs.id ?? "").toUpperCase() === id;
  });
}

export function inspectRequirementChangeChain(
  ctx: Ctx,
  currentPath: string,
  currentText: string,
): ChangeChainInspection {
  const checked = producingChangeIds(currentPath, currentText);
  const gaps: string[] = [];
  const warnings: ChainWarning[] = [];
  const approvals = mdFiles(join(ctx.records, "approvals"), "APR-").map((path) => {
    const text = readFileSync(path, "utf8");
    return { path, attrs: parseFrontmatter(text).attrs, artifacts: approvalArtifacts(text) };
  });

  for (const id of checked) {
    const files = changeFile(ctx, id);
    if (files.length === 0) {
      gaps.push(`${id} is named by confirmed requirements but its CHG artifact is missing`);
      continue;
    }
    if (files.length > 1) {
      gaps.push(`${id} resolves to ${files.length} CHG artifacts`);
      continue;
    }
    const path = files[0] as string;
    const raw = readFileSync(path, "utf8");
    const status = (parseFrontmatter(raw).attrs.status ?? "missing-status").toLowerCase();
    if (status !== "approved") {
      gaps.push(`${id} is ${status}; confirmed requirements require an approved CHG`);
      continue;
    }

    const relativePath = posixRel(ctx.root, path);
    // CHG-011 / REQ-018 AC-1: the binding hash is the body hash; the whole-file
    // hash of older approvals is still accepted while the file is untouched.
    const bodyDigest = sha256Body(raw);
    const fullDigest = sha256Normalized(raw);
    let bound = false;
    let boundBy = "";
    for (const approval of approvals) {
      if ((approval.attrs.status ?? "").toLowerCase() !== "approved") continue;
      for (const artifact of approval.artifacts) {
        if (artifact.path.replace(/^\.\//, "") !== relativePath) continue;
        boundBy = (approval.attrs.id ?? "").match(/^APR-\d+/)?.[0] ?? basename(approval.path).match(/^APR-\d+/)?.[0] ?? basename(approval.path);
        if (artifact.contentSha256 === bodyDigest || artifact.contentSha256 === fullDigest) bound = true;
      }
    }
    if (bound) continue;
    if (boundBy) {
      warnings.push({ change: id, apr: boundBy, text: `${id} body changed after its approval ${boundBy} (artifact hash mismatch)` });
      continue;
    }
    gaps.push(`${id} has no approved APR artifact`);
  }

  return { checked, gaps, warnings };
}
