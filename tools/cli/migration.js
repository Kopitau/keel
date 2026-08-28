import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, relative } from "node:path";

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const CITED_DEPTHS = new Set(["standard", "deep", "标准", "深度"]);

export function parseSemanticVersion(raw) {
  const value = typeof raw === "string" ? raw : "";
  const match = value.match(SEMVER);
  if (!match) return null;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

export function compareSemanticVersions(left, right) {
  const a = parseSemanticVersion(left);
  const b = parseSemanticVersion(right);
  if (!a || !b) return null;
  for (let i = 0; i < 3; i += 1) {
    if (a.core[i] < b.core[i]) return -1;
    if (a.core[i] > b.core[i]) return 1;
  }
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0;
  if (a.prerelease.length === 0) return 1;
  if (b.prerelease.length === 0) return -1;
  const count = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < count; i += 1) {
    const av = a.prerelease[i];
    const bv = b.prerelease[i];
    if (av === undefined) return -1;
    if (bv === undefined) return 1;
    if (av === bv) continue;
    const an = /^\d+$/.test(av);
    const bn = /^\d+$/.test(bv);
    if (an && bn) return Number(av) < Number(bv) ? -1 : 1;
    if (an !== bn) return an ? -1 : 1;
    return av < bv ? -1 : 1;
  }
  return 0;
}

export function normalizeText(input) {
  const text = Buffer.isBuffer(input) ? input.toString("utf8") : String(input);
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return withoutBom.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function sha256Normalized(input) {
  return createHash("sha256").update(normalizeText(input), "utf8").digest("hex");
}

function attrsAndBody(text) {
  const normalized = normalizeText(text);
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  const attrs = {};
  if (!match) return { attrs, body: normalized };
  for (const line of (match[1] || "").split("\n")) {
    const field = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*?)\s*$/);
    if (!field) continue;
    let value = field[2] || "";
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    attrs[field[1]] = value;
  }
  return { attrs, body: normalized.slice(match[0].length) };
}

function posixRelative(root, path) {
  return relative(root, path).split("\\").join("/");
}

function legacyReports(root, recordsRelative) {
  const research = join(root, recordsRelative, "research");
  if (!existsSync(research)) return [];
  const entries = [];
  const ids = new Set();
  const paths = new Set();
  for (const name of readdirSync(research).sort()) {
    if (!name.startsWith("RES-") || !name.endsWith(".md")) continue;
    const path = join(research, name);
    const bytes = readFileSync(path);
    const parsed = attrsAndBody(bytes);
    const depth = String(parsed.attrs.depth || parsed.attrs.level || "").toLowerCase();
    if (!CITED_DEPTHS.has(depth) || /https?:\/\//i.test(parsed.body)) continue;
    const fallback = basename(name, ".md").match(/^RES-\d+/)?.[0] || basename(name, ".md");
    const id = String(parsed.attrs.id || fallback).trim();
    const rel = posixRelative(root, path);
    if (!/^RES-\d+$/.test(id)) throw new Error(`${rel} has no valid RES id`);
    if (ids.has(id)) throw new Error(`legacy RES id is duplicated: ${id}`);
    if (paths.has(rel)) throw new Error(`legacy RES path is duplicated: ${rel}`);
    ids.add(id);
    paths.add(rel);
    entries.push({ id, path: rel, sha256: sha256Normalized(bytes) });
  }
  return entries;
}

export function isLegacyMigration(sourceVersion, targetVersion) {
  const source = compareSemanticVersions(sourceVersion, "0.8.0");
  const target = compareSemanticVersions(targetVersion, "0.8.0");
  return source !== null && target !== null && source < 0 && target >= 0;
}

export function makeLegacyManifest(root, recordsRelative, sourceVersion, targetVersion, generatedAt) {
  if (!parseSemanticVersion(sourceVersion)) throw new Error("source keel_version is not a valid semantic version");
  if (!parseSemanticVersion(targetVersion)) throw new Error("target keel version is not a valid semantic version");
  if (!isLegacyMigration(sourceVersion, targetVersion)) return null;
  const entries = legacyReports(root, recordsRelative);
  const value = {
    schema_version: 1,
    source_keel_version: sourceVersion,
    target_keel_version: targetVersion,
    generated_at: generatedAt,
    entries,
  };
  return { value, text: JSON.stringify(value, null, 2) + "\n" };
}

export function legacyEntryChanges(existingText, nextEntries) {
  let existing = [];
  if (typeof existingText === "string") {
    try {
      const parsed = JSON.parse(existingText);
      if (Array.isArray(parsed.entries)) existing = parsed.entries;
      else return ["LEGACY REPLACE invalid existing entries"];
    } catch {
      return ["LEGACY REPLACE invalid existing manifest"];
    }
  }
  const key = (entry) => `${String(entry.id || "")}\u0000${String(entry.path || "")}`;
  const oldMap = new Map(existing.map((entry) => [key(entry), entry]));
  const newMap = new Map(nextEntries.map((entry) => [key(entry), entry]));
  const lines = [];
  for (const [entryKey, entry] of newMap) {
    const prior = oldMap.get(entryKey);
    if (!prior) lines.push(`LEGACY ADD ${entry.id} ${entry.path} ${entry.sha256}`);
    else if (prior.sha256 !== entry.sha256) lines.push(`LEGACY UPDATE ${entry.id} ${entry.path} ${entry.sha256}`);
  }
  for (const [entryKey, entry] of oldMap) {
    if (!newMap.has(entryKey)) lines.push(`LEGACY REMOVE ${entry.id} ${entry.path}`);
  }
  return lines.length > 0 ? lines.sort() : ["LEGACY entries unchanged"];
}
