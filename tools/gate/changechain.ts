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

/** DEC-185: one approved artifact, re-hashed today against what its APR recorded. */
export type ArtifactDrift = { apr: string; path: string; state: "ok" | "missing" | "mismatch" };

function approvalId(attrs: { [k: string]: string | undefined }, path: string): string {
  return (attrs.id ?? "").match(/^APR-\d+/)?.[0] ?? basename(path).match(/^APR-\d+/)?.[0] ?? basename(path);
}

function approvedApprovals(ctx: Ctx): { id: string; artifacts: ApprovalArtifact[] }[] {
  const out: { id: string; artifacts: ApprovalArtifact[] }[] = [];
  for (const path of mdFiles(join(ctx.records, "approvals"), "APR-")) {
    const text = readFileSync(path, "utf8");
    const { attrs } = parseFrontmatter(text);
    if ((attrs.status ?? "").toLowerCase() !== "approved") continue;
    out.push({ id: approvalId(attrs, path), artifacts: approvalArtifacts(text) });
  }
  return out;
}

function hashMatches(recorded: string, raw: Parameters<typeof sha256Body>[0]): boolean {
  // CHG-011 / REQ-018 AC-1: the body hash binds; an older whole-file hash still counts while the file is untouched.
  return recorded === sha256Body(raw) || recorded === sha256Normalized(raw);
}

/**
 * DEC-185: every artifact named by an approved APR, re-hashed now. `pending` and
 * empty hashes are X-apr's own failure and are not reported here.
 */
export function inspectApprovedArtifacts(ctx: Ctx): ArtifactDrift[] {
  const out: ArtifactDrift[] = [];
  for (const apr of approvedApprovals(ctx)) {
    for (const artifact of apr.artifacts) {
      const recorded = artifact.contentSha256;
      if (!recorded || recorded === "pending") continue;
      const rel = artifact.path.replace(/^\.\//, "");
      const abs = join(ctx.root, rel);
      if (!existsSync(abs)) {
        out.push({ apr: apr.id, path: rel, state: "missing" });
        continue;
      }
      out.push({ apr: apr.id, path: rel, state: hashMatches(recorded, readFileSync(abs)) ? "ok" : "mismatch" });
    }
  }
  return out;
}

/** Plan-class artifacts are judged in G-plan (quick) as well as in X-apr (DEC-185). */
export function isPlanArtifact(rel: string): boolean {
  const p = rel.replace(/\\/g, "/");
  return /(^|\/)plan\/overview-v\d+\.md$/.test(p) || /(^|\/)features\/[^/]+\/plan\/v\d+\.md$/.test(p);
}

/**
 * The status a requirements / plan version declares for itself: YAML front matter
 * `status:` (consumer projects) or the header list `- status:` / `- **status**:`
 * (keel's own files), read before the first REQ entry.
 */
export function declaredStatusOf(text: string): string {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fm) {
    const m = (fm[1] ?? "").match(/^status:\s*(.+)$/m);
    if (m) return unquote(m[1] ?? "");
  }
  const header = text.split(/^##\s+REQ-\d+/m, 1)[0] ?? text;
  const m = header.match(/^\s*-\s*(?:\*\*)?status(?:\*\*)?:\s*(.+?)\s*$/mi);
  return m ? unquote(m[1] ?? "") : "";
}

/** DEC-186: a file that says it was confirmed / approved has to be able to prove it. */
export function declaresConfirmed(status: string): boolean {
  return /confirmed|approved|已确认|已批准/i.test(status);
}

/** Which approved APRs name `rel`, and whether any of them still matches its body today. */
export function approvalBinding(ctx: Ctx, rel: string): { boundBy: string[]; matched: boolean } {
  const target = rel.replace(/\\/g, "/").replace(/^\.\//, "");
  const abs = join(ctx.root, target);
  const raw = existsSync(abs) ? readFileSync(abs) : null;
  const boundBy: string[] = [];
  let matched = false;
  for (const apr of approvedApprovals(ctx)) {
    for (const artifact of apr.artifacts) {
      if (artifact.path.replace(/^\.\//, "") !== target) continue;
      if (!boundBy.includes(apr.id)) boundBy.push(apr.id);
      if (raw && hashMatches(artifact.contentSha256, raw)) matched = true;
    }
  }
  return { boundBy, matched };
}

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
