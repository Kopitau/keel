import { existsSync, readFileSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { normalizeText, sha256Normalized } from "./hash.ts";
import { mdFiles } from "./walk.ts";

export type ResGap = { id: string; gap: string };

const DEPTHS = new Set(["深度", "标准", "本地", "deep", "standard", "local"]);
const CITED_DEPTHS = new Set(["深度", "标准", "deep", "standard"]);
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export type LegacyCitation = { id: string; path: string; sha256: string };
export type ResCitationInspection = {
  failures: ResGap[];
  legacy: LegacyCitation[];
  cited: number;
};

type JsonMap = { [key: string]: unknown };
type SemVer = { core: [number, number, number]; prerelease: string[] };

/**
 * C-08/C-09: research declares its tier and carries substance, not just a file.
 *
 * Judge substance, not layout (the ISS-038 lesson, applied before shipping this
 * time). Real records in this repo alone use `depth:` and `level:` for the same
 * field, `## 检索范围` and `## 检索范围与方法` for the same section, `## 证据`
 * and `## 逐项证据` for the same evidence block. So: either field name, prefix
 * match on headings, and only the four load-bearing sections — question, scope,
 * evidence, conclusion. The six-section template stays the guide; this is the
 * floor.
 */
export function inspectResSubstance(ctx: Ctx): ResGap[] {
  const out: ResGap[] = [];
  for (const f of mdFiles(join(ctx.records, "research"), "RES-")) {
    const { attrs, body } = parseFrontmatter(normalizeText(readFileSync(f, "utf8")));
    const id = (attrs.id ?? "").trim() || basename(f, ".md");
    const depthRaw = (attrs.depth ?? attrs.level ?? "").trim();
    const depth = depthRaw.toLowerCase();
    if (!depthRaw) {
      out.push({ id, gap: "no depth/level field (C-08 三档自选并声明)" });
    } else if (!DEPTHS.has(depth)) {
      out.push({ id, gap: `depth "${depthRaw}" not 深度/标准/本地 (C-08)` });
    }
    if ((attrs.bootstrap ?? "") === "true") {
      // Migrated wrapper: the substance lives in the source report it points at.
      const src = (attrs.source_path ?? "").trim();
      if (!src) {
        out.push({ id, gap: "bootstrap wrapper without source_path" });
        continue;
      }
      const p = join(ctx.root, src);
      if (!existsSync(p)) out.push({ id, gap: `source_path missing on disk: ${src}` });
      else if (readFileSync(p, "utf8").length < 1024) out.push({ id, gap: `source ${src} under 1KB — not a report` });
      continue;
    }
    if (!/^##\s+调研问题/m.test(body)) out.push({ id, gap: "no 调研问题 section (C-09)" });
    if (!/^##\s+(检索范围|方法)/m.test(body)) out.push({ id, gap: "no 检索范围/方法 section (C-09)" });
    if (!/^##\s+(逐项)?证据/m.test(body)) out.push({ id, gap: "no 证据 section (C-09)" });
    if (!/^##\s+结论/m.test(body)) out.push({ id, gap: "no 结论 section (C-09)" });
  }
  return out;
}

function semver(raw: unknown): SemVer | null {
  if (typeof raw !== "string") return null;
  const match = raw.match(SEMVER);
  if (!match) return null;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function compare(left: SemVer, right: SemVer): number {
  for (let i = 0; i < 3; i += 1) {
    const a = left.core[i] ?? 0;
    const b = right.core[i] ?? 0;
    if (a < b) return -1;
    if (a > b) return 1;
  }
  if (left.prerelease.length === 0 && right.prerelease.length === 0) return 0;
  if (left.prerelease.length === 0) return 1;
  if (right.prerelease.length === 0) return -1;
  const count = Math.max(left.prerelease.length, right.prerelease.length);
  for (let i = 0; i < count; i += 1) {
    const a = left.prerelease[i];
    const b = right.prerelease[i];
    if (a === undefined) return -1;
    if (b === undefined) return 1;
    if (a === b) continue;
    const an = /^\d+$/.test(a);
    const bn = /^\d+$/.test(b);
    if (an && bn) return Number(a) < Number(b) ? -1 : 1;
    if (an !== bn) return an ? -1 : 1;
    return a < b ? -1 : 1;
  }
  return 0;
}

const VERSION_0_8_0: SemVer = { core: [0, 8, 0], prerelease: [] };

function object(value: unknown): value is JsonMap {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function posixRel(root: string, path: string): string {
  return relative(root, path).split("\\").join("/");
}

function safeManifestPath(root: string, raw: unknown): string | null {
  if (typeof raw !== "string" || raw === "" || raw.includes("\\") || isAbsolute(raw)) return null;
  const absolute = resolve(root, raw);
  const rel = posixRel(root, absolute);
  if (rel === ".." || rel.startsWith("../") || isAbsolute(rel)) return null;
  return absolute;
}

function reportIdentity(file: string): { id: string; body: string; depth: string; bootstrap: boolean } {
  const normalized = normalizeText(readFileSync(file, "utf8"));
  const { attrs, body } = parseFrontmatter(normalized);
  return {
    id: (attrs.id ?? "").trim() || basename(file).match(/^RES-\d+/)?.[0] || basename(file, ".md"),
    body,
    depth: (attrs.depth ?? attrs.level ?? "").trim().toLowerCase(),
    bootstrap: (attrs.bootstrap ?? "") === "true",
  };
}

/**
 * DEC-176/181 citation URL subcheck. URL-bearing reports pass directly. A
 * zero-URL standard/deep report can only warn when a one-time 0.8 migration
 * manifest binds its id, repository-relative path and normalized full text.
 */
export function inspectResCitations(ctx: Ctx): ResCitationInspection {
  const failures: ResGap[] = [];
  const legacy: LegacyCitation[] = [];
  let cited = 0;
  const candidates: LegacyCitation[] = [];
  for (const file of mdFiles(join(ctx.records, "research"), "RES-")) {
    const identity = reportIdentity(file);
    // Bootstrap wrappers are still standard/deep RES records for the citation
    // URL rule. Their substance may live at source_path, but DEC-181 binds the
    // wrapper file itself and the updater deliberately includes it.
    if (!CITED_DEPTHS.has(identity.depth)) continue;
    if (/https?:\/\//i.test(identity.body)) {
      cited += 1;
      continue;
    }
    candidates.push({
      id: identity.id,
      path: posixRel(ctx.root, file),
      sha256: sha256Normalized(readFileSync(file)),
    });
  }
  if (candidates.length === 0) return { failures, legacy, cited };

  const currentVersion = semver(ctx.config.keel_version);
  if (!currentVersion) {
    failures.push({ id: "manifest", gap: "project keel_version missing or not a valid semantic version" });
    return { failures, legacy, cited };
  }
  if (compare(currentVersion, VERSION_0_8_0) < 0) {
    failures.push({ id: "manifest", gap: "project version is before the 0.8.0 legacy migration boundary" });
    return { failures, legacy, cited };
  }

  const manifestPath = join(ctx.records, "migrations", "res-citation-legacy.json");
  if (!existsSync(manifestPath)) {
    failures.push({ id: "manifest", gap: "legacy citation manifest is missing" });
    return { failures, legacy, cited };
  }
  let manifest: JsonMap;
  try {
    const parsed: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (!object(parsed)) throw new Error("not object");
    manifest = parsed;
  } catch {
    failures.push({ id: "manifest", gap: "legacy citation manifest is not valid JSON object" });
    return { failures, legacy, cited };
  }
  if (manifest.schema_version !== 1) failures.push({ id: "manifest", gap: "schema_version must be 1" });
  const sourceVersion = semver(manifest.source_keel_version);
  const targetVersion = semver(manifest.target_keel_version);
  if (!sourceVersion) failures.push({ id: "manifest", gap: "source keel version is invalid" });
  if (!targetVersion) failures.push({ id: "manifest", gap: "target keel version is invalid" });
  if (sourceVersion && compare(sourceVersion, VERSION_0_8_0) >= 0) {
    failures.push({ id: "manifest", gap: "source version violates the <0.8.0 migration boundary" });
  }
  if (targetVersion && compare(targetVersion, VERSION_0_8_0) < 0) {
    failures.push({ id: "manifest", gap: "target version violates the >=0.8.0 migration boundary" });
  }
  if (targetVersion && compare(currentVersion, targetVersion) < 0) {
    failures.push({ id: "manifest", gap: "project keel_version is older than manifest target version" });
  }
  if (typeof manifest.generated_at !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(manifest.generated_at)) {
    failures.push({ id: "manifest", gap: "generated_at must be YYYY-MM-DD" });
  }
  if (!Array.isArray(manifest.entries)) {
    failures.push({ id: "manifest", gap: "entries must be an array" });
    return { failures, legacy, cited };
  }

  const byId = new Map<string, JsonMap>();
  const byPath = new Map<string, JsonMap>();
  const duplicateIds = new Set<string>();
  const duplicatePaths = new Set<string>();
  const researchPrefix = `${posixRel(ctx.root, join(ctx.records, "research"))}/`;
  for (const raw of manifest.entries) {
    if (!object(raw)) {
      failures.push({ id: "manifest", gap: "entry is not an object" });
      continue;
    }
    const id = typeof raw.id === "string" ? raw.id : "";
    const path = typeof raw.path === "string" ? raw.path : "";
    const digest = typeof raw.sha256 === "string" ? raw.sha256 : "";
    if (!/^RES-\d+$/.test(id)) failures.push({ id: id || "manifest", gap: "entry id is invalid" });
    if (!safeManifestPath(ctx.root, path)) failures.push({ id: id || "manifest", gap: `entry path is unsafe or invalid: ${path}` });
    else if (!path.startsWith(researchPrefix) || !/\/RES-[^/]+\.md$/.test(path)) {
      failures.push({ id: id || "manifest", gap: `entry path is outside the records research directory: ${path}` });
    }
    if (!/^[a-f0-9]{64}$/.test(digest)) failures.push({ id: id || "manifest", gap: "entry sha256 is invalid" });
    if (byId.has(id)) duplicateIds.add(id);
    else byId.set(id, raw);
    if (byPath.has(path)) duplicatePaths.add(path);
    else byPath.set(path, raw);
  }
  for (const id of duplicateIds) failures.push({ id, gap: "duplicate legacy manifest id" });
  for (const path of duplicatePaths) failures.push({ id: "manifest", gap: `duplicate legacy manifest path: ${path}` });

  for (const [path, entry] of byPath) {
    const file = safeManifestPath(ctx.root, path);
    if (!file || !existsSync(file)) {
      failures.push({ id: String(entry.id || "manifest"), gap: `manifest path missing on disk: ${path}` });
      continue;
    }
    const identity = reportIdentity(file);
    if (identity.id !== entry.id) {
      failures.push({ id: String(entry.id || "manifest"), gap: `manifest ID mismatch at ${path}: file is ${identity.id}` });
      continue;
    }
    // A URL-bearing report passes the new rule immediately; DEC-181 permits
    // its now-stale legacy entry to remain until deterministic cleanup.
    if (/https?:\/\//i.test(identity.body)) continue;
    if (!CITED_DEPTHS.has(identity.depth)) {
      failures.push({ id: identity.id, gap: `manifest path no longer names a standard/deep RES: ${path}` });
      continue;
    }
    if (sha256Normalized(readFileSync(file)) !== entry.sha256) {
      failures.push({ id: identity.id, gap: `normalized sha256 hash mismatch for ${path}` });
    }
  }

  for (const candidate of candidates) {
    const entry = byPath.get(candidate.path);
    if (!entry) {
      failures.push({ id: candidate.id, gap: `legacy manifest entry missing for ${candidate.path}` });
      continue;
    }
    if (entry.id !== candidate.id) {
      failures.push({ id: candidate.id, gap: `legacy manifest ID mismatch for ${candidate.path}` });
      continue;
    }
    if (entry.sha256 !== candidate.sha256) {
      // The entry-level pass above already reports this; do not turn one bad
      // binding into an unbounded pile of duplicate messages.
      if (!failures.some((gap) => gap.id === candidate.id && /sha256|hash/.test(gap.gap))) {
        failures.push({ id: candidate.id, gap: `legacy manifest sha256 hash mismatch for ${candidate.path}` });
      }
      continue;
    }
    if (!duplicateIds.has(candidate.id) && !duplicatePaths.has(candidate.path)) legacy.push(candidate);
  }
  return { failures, legacy, cited };
}
