import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { parseFrontmatter, readAttrList } from "./frontmatter.ts";
import { mdFiles } from "./walk.ts";

export type OssRecord = {
  id: string;
  project: string;
  version: string;
  status: string;
  nextReview: string;
  file: string;
};

export type OssReport = {
  missing: string[];
  due: OssRecord[];
  versionMismatch: { project: string; oss: string; lock: string }[];
  records: OssRecord[];
  deps: string[];
};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isReviewDue(nextReview: string, today = todayYmd()): boolean {
  if (!nextReview || nextReview === "none") return false;
  return nextReview < today;
}

export function packageDirectDeps(root: string): string[] {
  const p = join(root, "package.json");
  if (!existsSync(p)) return [];
  try {
    const data = JSON.parse(readFileSync(p, "utf8")) as {
      dependencies?: { [k: string]: string };
      devDependencies?: { [k: string]: string };
    };
    return [...Object.keys(data.dependencies ?? {}), ...Object.keys(data.devDependencies ?? {})].sort();
  } catch {
    return [];
  }
}

export function lockVersion(root: string, name: string): string | null {
  const p = join(root, "package-lock.json");
  if (!existsSync(p)) return null;
  try {
    const data = JSON.parse(readFileSync(p, "utf8")) as {
      packages?: { [k: string]: { version?: string } };
    };
    const v = data.packages?.[`node_modules/${name}`]?.version;
    return v ?? null;
  } catch {
    return null;
  }
}

export function loadOssRecords(ctx: Ctx): OssRecord[] {
  const dir = join(ctx.records, "oss");
  const out: OssRecord[] = [];
  for (const f of mdFiles(dir, "OSS-")) {
    const { attrs } = parseFrontmatter(readFileSync(f, "utf8"));
    out.push({
      id: attrs.id ?? "",
      project: attrs.project ?? "",
      version: attrs.version ?? "",
      status: attrs.status ?? "",
      nextReview: attrs.next_review ?? "",
      file: f,
    });
  }
  return out;
}

export function inspectOss(ctx: Ctx): OssReport {
  const deps = packageDirectDeps(ctx.root);
  const records = loadOssRecords(ctx);
  const missing: string[] = [];
  const due: OssRecord[] = [];
  const versionMismatch: { project: string; oss: string; lock: string }[] = [];
  for (const dep of deps) {
    const hit = records.find((r) => r.project === dep);
    if (!hit) missing.push(dep);
  }
  for (const r of records) {
    if (r.status === "retired") continue;
    if (isReviewDue(r.nextReview)) due.push(r);
    const locked = r.project ? lockVersion(ctx.root, r.project) : null;
    if (locked && r.version && locked !== r.version) {
      versionMismatch.push({ project: r.project, oss: r.version, lock: locked });
    }
  }
  return { missing, due, versionMismatch, records, deps };
}

export type ResStance = {
  /** RES records that declare neither oss entries nor an explicit oss_none reason. */
  silent: string[];
  /** oss ids referenced by a RES that have no matching OSS record. */
  dangling: { res: string; oss: string }[];
  /** RES records that took a stance (either direction). */
  declared: number;
};

/**
 * C-11: research that picks an open-source project must register it.
 * Silence is not a stance -- every RES must either list oss ids or say oss_none: <reason>.
 * Independent of package.json: research-stage dependency choices land before any manifest.
 */
export function inspectResOss(ctx: Ctx): ResStance {
  const known = new Set(loadOssRecords(ctx).map((r) => r.id).filter(Boolean));
  const silent: string[] = [];
  const dangling: { res: string; oss: string }[] = [];
  let declared = 0;
  for (const f of mdFiles(join(ctx.records, "research"), "RES-")) {
    const { attrs } = parseFrontmatter(readFileSync(f, "utf8"));
    const id = (attrs.id ?? "").trim() || basename(f, ".md");
    const list = readAttrList(attrs.oss);
    const none = (attrs.oss_none ?? "").trim();
    if (list.length === 0) {
      if (none) declared += 1;
      else silent.push(id);
      continue;
    }
    declared += 1;
    for (const o of list) {
      if (!known.has(o)) dangling.push({ res: id, oss: o });
    }
  }
  return { silent, dangling, declared };
}
